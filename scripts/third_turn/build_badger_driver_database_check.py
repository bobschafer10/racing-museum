from pathlib import Path
import csv
import re
from collections import Counter
from difflib import SequenceMatcher


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

RESULTS_CSV = PACKAGE_DIR / "04_series_event_results_import.csv"
DRIVERS_REF_CSV = PACKAGE_DIR / "drivers_reference.csv"
OUTPUT_CSV = PACKAGE_DIR / "06_badger_driver_database_check.csv"


def normalize_name(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace(".", "")
    value = value.replace(",", "")
    value = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def looks_like_car_number(value: str) -> bool:
    value = (value or "").strip()
    return bool(re.fullmatch(r"[A-Za-z]?\d+[A-Za-z]{0,3}", value))


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
    drivers_by_norm = {d["norm"]: d for d in drivers if d["norm"]}

    counts = Counter()

    with RESULTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            name = (row.get("driver_name") or "").strip()
            if name:
                counts[name] += 1

    rows = []

    for name, result_count in sorted(counts.items(), key=lambda x: x[0].lower()):
        norm = normalize_name(name)

        suspected_issue = ""
        if looks_like_car_number(name):
            suspected_issue = "possible_car_number_parsed_as_driver"

        exact = drivers_by_norm.get(norm)

        if exact:
            rows.append({
                "third_turn_driver_name": name,
                "result_count": result_count,
                "museum_driver_name": exact["driver_name"],
                "driver_id": exact["driver_id"],
                "driver_slug": exact["driver_slug"],
                "match_status": "matched_exact",
                "match_score": "1.000",
                "suspected_issue": suspected_issue,
                "review_action": "",
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
            "third_turn_driver_name": name,
            "result_count": result_count,
            "museum_driver_name": best["driver_name"] if best else "",
            "driver_id": best["driver_id"] if best else "",
            "driver_slug": best["driver_slug"] if best else "",
            "match_status": status,
            "match_score": f"{best_score:.3f}",
            "suspected_issue": suspected_issue,
            "review_action": "",
            "notes": ""
        })

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "third_turn_driver_name",
            "result_count",
            "museum_driver_name",
            "driver_id",
            "driver_slug",
            "match_status",
            "match_score",
            "suspected_issue",
            "review_action",
            "notes"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} driver check rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()