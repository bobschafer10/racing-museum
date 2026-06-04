from pathlib import Path
import csv


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

RESULTS_CSV = PACKAGE_DIR / "04_series_event_results_import.csv"
REVIEWED_DRIVERS_CSV = PACKAGE_DIR / "06_badger_driver_database_check_reviewed.csv"
OUTPUT_CSV = PACKAGE_DIR / "08_series_event_results_import_with_driver_ids.csv"


def load_driver_review_map() -> dict:
    driver_map = {}

    with REVIEWED_DRIVERS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            third_turn_name = (row.get("third_turn_driver_name") or "").strip()
            action = (row.get("review_action") or "").strip()

            if not third_turn_name:
                continue

            if action != "use_existing_driver":
                continue

            driver_map[third_turn_name] = {
                "driver_id": (row.get("driver_id") or "").strip(),
                "driver_slug": (row.get("driver_slug") or "").strip()
            }

    return driver_map


def main():
    driver_map = load_driver_review_map()

    rows = []
    missing = set()

    with RESULTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            driver_name = (row.get("driver_name") or "").strip()
            match = driver_map.get(driver_name)

            driver_id = ""
            driver_slug = ""

            if match:
                driver_id = match["driver_id"]
                driver_slug = match["driver_slug"]
            else:
                missing.add(driver_name)

            rows.append({
                "series_event_id": row["series_event_id"],
                "finishing_position": row["finishing_position"],
                "starting_position": row["starting_position"],
                "car_number": row["car_number"],
                "driver_name": driver_name,
                "sponsor": row["sponsor"],
                "make": row["make"],
                "laps": row["laps"],
                "led": row["led"],
                "status": row["status"],
                "points": row["points"],
                "result_section": row["result_section"],
                "source_url": row["source_url"],
                "driver_id": driver_id,
                "driver_slug": driver_slug
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

    missing = sorted(x for x in missing if x)

    if missing:
        print("\nWARNING: These driver names did not receive driver_id/driver_slug:")
        for name in missing:
            print(f"  - {name}")
    else:
        print("\nAll driver rows received driver_id/driver_slug.")


if __name__ == "__main__":
    main()