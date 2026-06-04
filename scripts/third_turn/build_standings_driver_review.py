from pathlib import Path
import csv
import re
from difflib import SequenceMatcher


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

FINAL_STANDINGS_CSV = PACKAGE_DIR / "11_series_standings_import_with_driver_ids.csv"
DRIVERS_REF_CSV = PACKAGE_DIR / "drivers_reference.csv"
OUTPUT_CSV = PACKAGE_DIR / "12_standings_driver_review.csv"


def normalize_name(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace(".", "")
    value = value.replace(",", "")
    value = value.replace("'", "")
    value = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def load_drivers():
    drivers = []

    with DRIVERS_REF_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            drivers.append({
                "driver_id": row["id"],
                "driver_name": row["driver_name"],
                "driver_slug": row["slug"],
                "norm": normalize_name(row["driver_name"])
            })

    return drivers


def main():
    drivers = load_drivers()
    driver_by_norm = {d["norm"]: d for d in drivers if d["norm"]}

    missing_names = set()

    with FINAL_STANDINGS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            driver_name = (row.get("driver_name") or "").strip()
            driver_id = (row.get("driver_id") or "").strip()

            if driver_name and not driver_id:
                missing_names.add(driver_name)

    rows = []

    for name in sorted(missing_names, key=lambda x: x.lower()):
        norm = normalize_name(name)
        exact = driver_by_norm.get(norm)

        if exact:
            rows.append({
                "standings_driver_name": name,
                "museum_driver_name": exact["driver_name"],
                "driver_id": exact["driver_id"],
                "driver_slug": exact["driver_slug"],
                "match_status": "matched_exact",
                "match_score": "1.000",
                "review_action": "use_existing_driver",
                "notes": ""
            })
            continue

        best = None
        best_score = 0

        for d in drivers:
            score = similarity(norm, d["norm"])
            if score > best_score:
                best_score = score
                best = d

        if best_score >= 0.94:
            status = "matched_fuzzy_review"
        elif best_score >= 0.86:
            status = "possible_match"
        else:
            status = "new_or_unmatched"

        rows.append({
            "standings_driver_name": name,
            "museum_driver_name": best["driver_name"] if best else "",
            "driver_id": best["driver_id"] if best else "",
            "driver_slug": best["driver_slug"] if best else "",
            "match_status": status,
            "match_score": f"{best_score:.3f}",
            "review_action": "",
            "notes": ""
        })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "standings_driver_name",
            "museum_driver_name",
            "driver_id",
            "driver_slug",
            "match_status",
            "match_score",
            "review_action",
            "notes"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} standings driver review rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()