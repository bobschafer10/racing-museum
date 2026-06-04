from pathlib import Path
import re
import sys

LIB_DIR = Path(__file__).resolve().parent
sys.path.append(str(LIB_DIR))

from parse_race_page import html_to_text, clean_lines


def is_int(value: str) -> bool:
    return bool(re.fullmatch(r"\d+", (value or "").strip()))


def looks_like_driver_name(value: str) -> bool:
    value = (value or "").strip()

    if not value:
        return False

    if is_int(value):
        return False

    if value in {"Fin", "Driver", "Pts", "St", "W", "T5", "T10", "Pole"}:
        return False

    return bool(re.search(r"[A-Za-z]", value))


def find_standings_block(lines: list[str]) -> list[str]:
    try:
        start = lines.index("FINAL POINT STANDINGS")
    except ValueError:
        return []

    block = []

    stop_markers = {
        "RACES",
        "SEASON RACES",
        "References",
        "Retrieved from"
    }

    for line in lines[start + 1:]:
        if line in stop_markers:
            break
        block.append(line)

    return block


def parse_standings(lines: list[str]) -> list[dict]:
    block = find_standings_block(lines)

    headers = {"Fin", "Driver", "Pts", "St", "W", "T5", "T10", "Pole"}
    block = [x.strip() for x in block if x.strip() and x.strip() not in headers]

    rows = []
    i = 0

    while i < len(block):
        if not is_int(block[i]):
            i += 1
            continue

        finishing_position = block[i]

        if i + 1 >= len(block) or not looks_like_driver_name(block[i + 1]):
            i += 1
            continue

        driver_name = block[i + 1]

        values = []
        j = i + 2

        while j < len(block) and is_int(block[j]) and len(values) < 5:
            values.append(block[j])
            j += 1

        rows.append({
            "finishing_position": finishing_position,
            "driver_name": driver_name,
            "points": values[0] if len(values) >= 1 else "",
            "starts": values[1] if len(values) >= 2 else "",
            "wins": values[2] if len(values) >= 3 else "",
            "top5": values[3] if len(values) >= 4 else "",
            "top10": values[4] if len(values) >= 5 else "",
            "poles": ""
        })

        i = j

    return rows


def parse_season_standings(season_page_path: Path) -> list[dict]:
    html = season_page_path.read_text(encoding="utf-8", errors="replace")
    text = html_to_text(html)
    lines = clean_lines(text)
    return parse_standings(lines)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[3]
    cache_dir = root / "scripts" / "third_turn" / "cache" / "badger_modified_tour"

    for year in [2012, 2013]:
        path = cache_dir / f"season_{year}.html"
        rows = parse_season_standings(path)

        print("\n" + "=" * 80)
        print(year)
        print(f"Rows parsed: {len(rows)}")

        for row in rows[:20]:
            print(row)