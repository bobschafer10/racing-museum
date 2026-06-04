from pathlib import Path
import csv
import re
from difflib import SequenceMatcher


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

REVIEW_CSV = PACKAGE_DIR / "05_driver_name_review.csv"
DRIVERS_REF_CSV = PACKAGE_DIR / "drivers_reference.csv"
OUTPUT_CSV = PACKAGE_DIR / "05_driver_name_review_matched.csv"


def normalize_name(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace(".", "")
    value = value.replace(",", "")
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
                "id": row["id"],
                "driver_name": row["driver_name"],
                "slug": row["slug"],
                "norm": normalize_name(row["driver_name"])
            })

    return drivers


def main():
    drivers = load_drivers()
    driver_by_norm = {d["norm"]: d for d in drivers if d["norm"]}

    output_rows = []

    with REVIEW_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            third_turn_name = row["third_turn_driver_name"]
            norm = normalize_name(third_turn_name)

            match = driver_by_norm.get(norm)
            best_score = ""
            best_name = ""
            best_slug = ""
            best_id = ""
            status = ""

            if match:
                best_score = "1.000"
                best_name = match["driver_name"]
                best_slug = match["slug"]
                best_id = match["id"]
                status = "matched_exact"
            else:
                best = None
                best_ratio = 0

                for driver in drivers:
                    ratio = similarity(norm, driver["norm"])

                    if ratio > best_ratio:
                        best_ratio = ratio
                        best = driver

                if best:
                    best_score = f"{best_ratio:.3f}"
                    best_name = best["driver_name"]
                    best_slug = best["slug"]
                    best_id = best["id"]

                    if best_ratio >= 0.94:
                        status = "matched_fuzzy_review"
                    elif best_ratio >= 0.86:
                        status = "possible_match"
                    else:
                        status = "new_or_unmatched"

            output_rows.append({
                "third_turn_driver_name": third_turn_name,
                "result_count": row["result_count"],
                "museum_driver_name": best_name,
                "driver_slug": best_slug,
                "driver_id": best_id,
                "match_status": status,
                "match_score": best_score,
                "notes": row.get("notes", "")
            })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "third_turn_driver_name",
            "result_count",
            "museum_driver_name",
            "driver_slug",
            "driver_id",
            "match_status",
            "match_score",
            "notes"
        ])
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Wrote {len(output_rows)} rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()