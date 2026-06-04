from pathlib import Path
import csv
import re
from difflib import SequenceMatcher


SERIES_SLUG = "badger_stock_car_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

INPUT_CSV = PACKAGE_DIR / "badger_stock_car_tour_driver_review.csv"
OUTPUT_CSV = PACKAGE_DIR / "badger_stock_car_tour_driver_review_matched.csv"

# Reuse the full Drivers export from the Badger Modified package
DRIVERS_REF_CSV = ROOT / "scripts" / "third_turn" / "series_packages" / "badger_modified_tour" / "drivers_reference.csv"


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
                "museum_driver_name": row["driver_name"],
                "driver_slug": row["slug"],
                "norm": normalize_name(row["driver_name"]),
            })

    return drivers


def main():
    drivers = load_drivers()
    driver_by_norm = {d["norm"]: d for d in drivers if d["norm"]}

    output_rows = []

    with INPUT_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            source_name = (row.get("standings_driver_name") or "").strip()
            norm = normalize_name(source_name)

            exact = driver_by_norm.get(norm)

            if exact:
                output_rows.append({
                    "standings_driver_name": source_name,
                    "museum_driver_name": exact["museum_driver_name"],
                    "driver_id": exact["driver_id"],
                    "driver_slug": exact["driver_slug"],
                    "match_status": "matched_exact",
                    "review_action": "use_existing_driver",
                    "notes": "",
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

            output_rows.append({
                "standings_driver_name": source_name,
                "museum_driver_name": best["museum_driver_name"] if best else "",
                "driver_id": best["driver_id"] if best else "",
                "driver_slug": best["driver_slug"] if best else "",
                "match_status": status,
                "review_action": "",
                "notes": f"score={best_score:.3f}",
            })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "standings_driver_name",
            "museum_driver_name",
            "driver_id",
            "driver_slug",
            "match_status",
            "review_action",
            "notes",
        ])
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Wrote {len(output_rows)} rows:")
    print(OUTPUT_CSV)

    unresolved = [
        r for r in output_rows
        if r["review_action"] != "use_existing_driver"
    ]

    if unresolved:
        print("\nReview needed:")
        for r in unresolved:
            print(
                f"  {r['standings_driver_name']} -> "
                f"{r['museum_driver_name']} "
                f"({r['match_status']} / {r['notes']})"
            )
    else:
        print("\nAll rows matched exactly.")


if __name__ == "__main__":
    main()