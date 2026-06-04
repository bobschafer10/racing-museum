
from pathlib import Path
import csv
import re


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

REVIEWED_CSV = PACKAGE_DIR / "12_standings_driver_review_reviewed.csv"
OUTPUT_CSV = PACKAGE_DIR / "13_new_standings_drivers_import.csv"


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace("&", " and ")
    value = value.replace("'", "")
    value = value.replace(".", "")
    value = value.replace(",", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def main():
    rows = []

    with REVIEWED_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            action = (row.get("review_action") or "").strip()
            name = (row.get("standings_driver_name") or "").strip()

            if action != "create_new_driver":
                continue

            rows.append({
                "driver_name": name,
                "slug": slugify(name),
                "hometown": "",
                "state": "",
                "is_published": "true",
            })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "driver_name",
            "slug",
            "hometown",
            "state",
            "is_published",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} new standings drivers:")
    print(OUTPUT_CSV)

    for row in rows:
        print(f"  {row['driver_name']} -> {row['slug']}")


if __name__ == "__main__":
    main()