from pathlib import Path
import csv
import json
import re
import sys

BASE_DIR = Path(__file__).resolve().parent
LIB_DIR = BASE_DIR / "lib"
sys.path.append(str(LIB_DIR))

from parse_race_page import html_to_text, clean_lines


SERIES_KEY = "badger_modified_tour"

PACKAGE_DIR = BASE_DIR / "series_packages" / SERIES_KEY
CONFIG_PATH = BASE_DIR / "series_configs" / f"{SERIES_KEY}.json"
CACHE_DIR = BASE_DIR / "cache" / SERIES_KEY

OUTPUT_CSV = PACKAGE_DIR / "10_series_standings_import.csv"

SEASON_IDS = {
    2012: 53,
    2013: 54,
}

DEFAULT_FIELDS = ["points", "starts", "wins", "top5", "top10"]


def is_int(value):
    return bool(re.fullmatch(r"\d+", (value or "").strip()))


def looks_like_driver_name(value):
    value = (value or "").strip()

    if not value:
        return False

    if is_int(value):
        return False

    if value in {"Fin", "Driver", "Pts", "St", "W", "T5", "T10", "Pole"}:
        return False

    if value.startswith("Retrieved from"):
        return False

    return bool(re.search(r"[A-Za-z]", value))


def find_standings_block(lines):
    try:
        start = lines.index("FINAL POINT STANDINGS")
    except ValueError:
        return []

    stop_markers = {
        "RACES",
        "SEASON RACES",
        "References",
        "Retrieved from",
    }

    block = []

    for line in lines[start + 1:]:
        if line in stop_markers or line.startswith("Retrieved from"):
            break
        block.append(line)

    headers = {"Fin", "Driver", "Pts", "St", "W", "T5", "T10", "Pole"}
    return [x.strip() for x in block if x.strip() and x.strip() not in headers]


def parse_rows(block, field_order, position_mode="normal"):
    rows = []
    i = 0
    last_position = ""

    while i < len(block):
        finishing_position = ""

        if (
            i + 1 < len(block)
            and is_int(block[i])
            and looks_like_driver_name(block[i + 1])
        ):
            finishing_position = block[i]
            last_position = finishing_position
            driver_name = block[i + 1]
            j = i + 2

        elif position_mode == "carry_forward" and looks_like_driver_name(block[i]):
            finishing_position = last_position
            driver_name = block[i]
            j = i + 1

        else:
            i += 1
            continue

        values = []

        while j < len(block) and is_int(block[j]) and len(values) < len(field_order):
            values.append(block[j])
            j += 1

        row = {
            "finishing_position": finishing_position,
            "driver_name": driver_name,
            "points": "",
            "starts": "",
            "wins": "",
            "top5": "",
            "top10": "",
            "poles": "",
        }

        for idx, field_name in enumerate(field_order):
            if idx < len(values):
                row[field_name] = values[idx]

        rows.append(row)
        i = j

    return rows


def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def main():
    config = load_config()
    parse_rules = config.get("standings_parse_rules", {})

    all_rows = []

    for season_year, season_id in SEASON_IDS.items():
        path = CACHE_DIR / f"season_{season_year}.html"
        html = path.read_text(encoding="utf-8", errors="replace")
        lines = clean_lines(html_to_text(html))
        block = find_standings_block(lines)

        rule = parse_rules.get(str(season_year), {})
        field_order = rule.get("numeric_fields_after_driver", DEFAULT_FIELDS)
        position_mode = rule.get("position_mode", "normal")

        rows = parse_rows(block, field_order, position_mode)
        rows = rows[:10]

        print(
            f"{season_year}: parsed {len(rows)} standings rows "
            f"using {field_order} / position_mode={position_mode}"
        )

        for row in rows:
            all_rows.append({
                "season_id": season_id,
                "finishing_position": row["finishing_position"],
                "driver_name": row["driver_name"],
                "driver_id": "",
                "points": row["points"],
                "starts": row["starts"],
                "wins": row["wins"],
                "top5": row["top5"],
                "top10": row["top10"],
                "poles": row["poles"],
            })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "season_id",
                "finishing_position",
                "driver_name",
                "driver_id",
                "points",
                "starts",
                "wins",
                "top5",
                "top10",
                "poles",
            ],
        )
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"Wrote {len(all_rows)} rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()