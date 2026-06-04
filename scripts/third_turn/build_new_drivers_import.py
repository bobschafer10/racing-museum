from pathlib import Path
import csv
import re


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

REVIEWED_CSV = PACKAGE_DIR / "06_badger_driver_database_check_reviewed.csv"
OUTPUT_CSV = PACKAGE_DIR / "07_new_drivers_import.csv"


def slugify(name: str) -> str:
    value = (name or "").strip().lower()
    value = value.replace(".", "")
    value = value.replace(",", "")
    value = value.replace("'", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def main():
    rows = []

    with REVIEWED_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            if row.get("review_action") == "create_new_driver":
                name = row["third_turn_driver_name"].strip()

                rows.append({
                    "driver_name": name,
                    "slug": slugify(name),
                    "is_published": "true"
                })

    rows = sorted(rows, key=lambda x: x["driver_name"].lower())

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "driver_name",
            "slug",
            "is_published"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} new driver rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()