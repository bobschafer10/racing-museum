from pathlib import Path
import csv


SERIES_SLUG = "badger_modified_tour"
SERIES_ID = 64
SERIES_NAME = "Badger Modified Tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

EVENTS_CSV = PACKAGE_DIR / "02_series_events_import.csv"
OUTPUT_CSV = PACKAGE_DIR / "03_series_seasons_import.csv"


def main():
    season_counts = {}

    with EVENTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            year = row["race_date"][:4]
            season_counts[year] = season_counts.get(year, 0) + 1

    rows = []

    for year in sorted(season_counts.keys()):
        rows.append({
            "series_id": SERIES_ID,
            "year": year,
            "season_name": f"{year} {SERIES_NAME}",
            "races": season_counts[year],
            "champion_name": "",
            "champion_driver_id": "",
            "margin": "",
            "most_wins_text": "",
            "source_url": ""
        })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "series_id",
            "year",
            "season_name",
            "races",
            "champion_name",
            "champion_driver_id",
            "margin",
            "most_wins_text",
            "source_url"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()