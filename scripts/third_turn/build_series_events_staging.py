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


def load_race_manifest(package_dir: Path) -> dict:
    manifest_path = package_dir / "race_links_manifest.csv"

    if not manifest_path.exists():
        return {}

    with manifest_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return {
            row["race_file"]: row
            for row in reader
        }


def main():
    config = load_series_config(SERIES_SLUG)

    track_name_overrides = config.get("track_name_overrides", {})
    track_slug_overrides = config.get("track_slug_overrides", {})

    race_dir = ROOT / "scripts" / "third_turn" / "cache" / SERIES_SLUG / "races"
    package_dir = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG
    output_csv = package_dir / "01_series_events_staging.csv"

    race_manifest = load_race_manifest(package_dir)

    rows = []

    for path in sorted(race_dir.glob("*.html")):
        parsed = parse_race_page(path)

        season_year = infer_season_year(path.name)
        race_number = infer_race_number(path.name)

        third_turn_track_name = parsed["track_name"]
        museum_track_name = track_name_overrides.get(third_turn_track_name, third_turn_track_name)
        track_slug = track_slug_overrides.get(third_turn_track_name, "")

        source_url = race_manifest.get(path.name, {}).get("source_url", parsed["source_url"])

        rows.append({
            "series_id": config["supabase_series_id"],
            "season_year": season_year,
            "race_number": race_number,
            "race_date": format_date_for_supabase(parsed["race_date"]),
            "third_turn_track_name": third_turn_track_name,
            "track_name": museum_track_name,
            "track_slug": track_slug,
            "winner_name": parsed["winner_name"],
            "race_title": parsed["race_title"],
            "source_url": source_url,
            "notes": ""
        })

    rows = sorted(rows, key=lambda x: (x["season_year"], x["race_number"], x["race_date"]))

    fieldnames = [
        "series_id",
        "season_year",
        "race_number",
        "race_date",
        "third_turn_track_name",
        "track_name",
        "track_slug",
        "winner_name",
        "race_title",
        "source_url",
        "notes"
    ]

    with output_csv.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows:")
    print(output_csv)


if __name__ == "__main__":
    main()