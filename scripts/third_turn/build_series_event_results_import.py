from pathlib import Path
import csv
import re
import sys


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
LIB_DIR = ROOT / "scripts" / "third_turn" / "lib"
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG
RACE_DIR = ROOT / "scripts" / "third_turn" / "cache" / SERIES_SLUG / "races"

sys.path.append(str(LIB_DIR))

from parse_race_results import parse_race_results


EVENT_ID_MAP_CSV = PACKAGE_DIR / "series_event_id_map.csv"
RACE_LINKS_MANIFEST_CSV = PACKAGE_DIR / "race_links_manifest.csv"
OUTPUT_CSV = PACKAGE_DIR / "04_series_event_results_import.csv"


def infer_season_year(race_file: str) -> int:
    match = re.search(r"(20\d{2})", race_file)
    if not match:
        raise ValueError(f"Could not infer season year from {race_file}")
    return int(match.group(1))


def infer_race_number(race_file: str) -> int:
    if race_file == "Modified_Nationals_2012-05.html":
        return 1

    if race_file == "2012_Clash_at_the_Creek.html":
        return 2

    if race_file == "Modified_Nationals_2013-04.html":
        return 2

    match = re.search(r"20\d{2}-(\d+)", race_file)
    if not match:
        raise ValueError(f"Could not infer race number from {race_file}")

    return int(match.group(1))


def load_event_id_map() -> dict:
    event_map = {}

    with EVENT_ID_MAP_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            key = (int(row["season_year"]), int(row["race_number"]))
            event_map[key] = row["series_event_id"]

    return event_map


def load_race_source_map() -> dict:
    source_map = {}

    if not RACE_LINKS_MANIFEST_CSV.exists():
        return source_map

    with RACE_LINKS_MANIFEST_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            source_map[row["race_file"]] = row["source_url"]

    return source_map


def main():
    event_id_map = load_event_id_map()
    source_map = load_race_source_map()

    rows = []

    for path in sorted(RACE_DIR.glob("*.html")):
        season_year = infer_season_year(path.name)
        race_number = infer_race_number(path.name)

        series_event_id = event_id_map.get((season_year, race_number))

        if not series_event_id:
            raise ValueError(f"No series_event_id found for {season_year} race {race_number} / {path.name}")

        source_url = source_map.get(path.name, "")

        parsed_results = parse_race_results(path)

        for result in parsed_results:
            rows.append({
                "series_event_id": series_event_id,
                "finishing_position": result["finishing_position"],
                "starting_position": result["starting_position"],
                "car_number": result["car_number"],
                "driver_name": result["driver_name"],
                "sponsor": result["sponsor"],
                "make": result["make"],
                "laps": result["laps"],
                "led": result["led"],
                "status": result["status"],
                "points": result["points"],
                "result_section": result["result_section"],
                "source_url": source_url,
                "driver_id": "",
                "driver_slug": ""
            })

    fieldnames = [
        "series_event_id",
        "finishing_position",
        "starting_position",
        "car_number",
        "driver_name",
        "sponsor",
        "make",
        "laps",
        "led",
        "status",
        "points",
        "result_section",
        "source_url",
        "driver_id",
        "driver_slug"
    ]

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()