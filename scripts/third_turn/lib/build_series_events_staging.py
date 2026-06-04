from pathlib import Path
import csv
import re
import sys
from datetime import datetime


ROOT = Path(__file__).resolve().parents[2]
LIB_DIR = ROOT / "scripts" / "third_turn" / "lib"
sys.path.append(str(LIB_DIR))

from load_series_config import load_series_config
from parse_race_page import parse_race_page


SERIES_SLUG = "badger_modified_tour"


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


def format_date_for_supabase(date_text: str) -> str:
    if not date_text:
        return ""

    dt = datetime.strptime(date_text, "%B %d, %Y")
    return dt.strftime("%Y-%m-%d")


def main():
    config = load_series_config(SERIES_SLUG)

    race_dir = ROOT / "scripts" / "third_turn" / "cache" / SERIES_SLUG / "races"
    package_dir = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG
    output_csv = package_dir / "01_series_events_staging.csv"

    rows = []

    for path in sorted(race_dir.glob("*.html")):
        parsed = parse_race_page(path)

        season_year = infer_season_year(path.name)
        race_number = infer_race_number(path.name)

        rows.append({
            "series_id": config["supabase_series_id"],
            "season_year": season_year,
            "race_number": race_number,
            "race_date": format_date_for_supabase(parsed["race_date"]),
            "track_name": parsed["track_name"],
            "winner_name": parsed["winner_name"],
            "race_title": parsed["race_title"],
            "source_url": parsed["source_url"],
            "notes": ""
        })

    rows = sorted(rows, key=lambda x: (x["season_year"], x["race_number"], x["race_date"]))

    with output_csv.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "series_id",
            "season_year",
            "race_number",
            "race_date",
            "track_name",
            "winner_name",
            "race_title",
            "source_url",
            "notes"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows:")
    print(output_csv)


if __name__ == "__main__":
    main()