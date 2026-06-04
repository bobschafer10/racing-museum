from pathlib import Path
import csv
from datetime import datetime


SERIES_SLUG = "badger_modified_tour"

SEASON_ID_MAP = {
    "2012": "53",
    "2013": "54"
}

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

INPUT_CSV = PACKAGE_DIR / "01_series_events_staging.csv"
OUTPUT_CSV = PACKAGE_DIR / "02_series_events_import.csv"


def normalize_date(value: str) -> str:
    value = (value or "").strip()

    if not value:
        return ""

    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return value


def main():
    rows = []

    with INPUT_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            race_date = normalize_date(row["race_date"])
            season_year = race_date[:4]

            rows.append({
                "series_id": row["series_id"],
                "season_id": SEASON_ID_MAP.get(season_year, ""),
                "race_number": row["race_number"],
                "race_date": race_date,
                "track_name": row["track_name"],
                "winner_name": row["winner_name"],
                "source_url": row["source_url"]
            })

    fieldnames = [
        "series_id",
        "season_id",
        "race_number",
        "race_date",
        "track_name",
        "winner_name",
        "source_url"
    ]

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()