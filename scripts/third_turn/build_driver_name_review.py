from pathlib import Path
import csv
from collections import Counter


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

RESULTS_CSV = PACKAGE_DIR / "04_series_event_results_import.csv"
OUTPUT_CSV = PACKAGE_DIR / "05_driver_name_review.csv"


def main():
    counts = Counter()

    with RESULTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            driver_name = (row.get("driver_name") or "").strip()

            if driver_name:
                counts[driver_name] += 1

    rows = []

    for driver_name, result_count in sorted(counts.items(), key=lambda x: x[0].lower()):
        rows.append({
            "third_turn_driver_name": driver_name,
            "result_count": result_count,
            "museum_driver_name": "",
            "driver_slug": "",
            "driver_id": "",
            "match_status": "",
            "notes": ""
        })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "third_turn_driver_name",
            "result_count",
            "museum_driver_name",
            "driver_slug",
            "driver_id",
            "match_status",
            "notes"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} unique driver rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()