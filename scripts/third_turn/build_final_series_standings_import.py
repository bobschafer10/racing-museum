from pathlib import Path
import csv


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

STANDINGS_CSV = PACKAGE_DIR / "10_series_standings_import.csv"
REVIEWED_DRIVERS_CSV = PACKAGE_DIR / "06_badger_driver_database_check_reviewed.csv"
OUTPUT_CSV = PACKAGE_DIR / "11_series_standings_import_with_driver_ids.csv"


def load_driver_map():
    driver_map = {}

    with REVIEWED_DRIVERS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            third_turn_name = (row.get("third_turn_driver_name") or "").strip()
            action = (row.get("review_action") or "").strip()

            if action == "use_existing_driver":
                driver_map[third_turn_name] = {
                    "driver_id": (row.get("driver_id") or "").strip()
                }

    return driver_map


def main():
    driver_map = load_driver_map()
    rows = []
    missing = set()

    with STANDINGS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            driver_name = (row.get("driver_name") or "").strip()
            match = driver_map.get(driver_name)

            driver_id = ""
            if match:
                driver_id = match["driver_id"]
            else:
                missing.add(driver_name)

            rows.append({
                "season_id": row["season_id"],
                "finishing_position": row["finishing_position"],
                "driver_name": driver_name,
                "driver_id": driver_id,
                "points": row["points"],
                "starts": row["starts"],
                "wins": row["wins"],
                "top5": row["top5"],
                "top10": row["top10"],
                "poles": row["poles"]
            })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "season_id",
            "finishing_position",
            "driver_name",
            "driver_id",
            "points",
            "starts",
            "wins",
            "top5",
            "top10",
            "poles"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows:")
    print(OUTPUT_CSV)

    missing = sorted(x for x in missing if x)

    if missing:
        print("\nWARNING: Missing driver_id for:")
        for name in missing:
            print(f"  - {name}")
    else:
        print("\nAll standings rows received driver_id.")


if __name__ == "__main__":
    main()