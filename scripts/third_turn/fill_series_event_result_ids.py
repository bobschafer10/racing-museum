import csv
from pathlib import Path

BASE_DIR = Path(r"C:\Users\schaf\racing-museum")
OUTPUT_DIR = BASE_DIR / "scripts" / "third_turn" / "output"

EVENTS_LOOKUP_CSV = OUTPUT_DIR / "series_events_lookup.csv"
RESULTS_STAGE_CSV = OUTPUT_DIR / "series_event_results_stage.csv"
RESULTS_FINAL_CSV = OUTPUT_DIR / "series_event_results_import.csv"

def clean(value):
    return str(value or "").strip()

def load_event_lookup():
    lookup = {}

    with open(EVENTS_LOOKUP_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            key = (
                clean(row.get("season_id")),
                clean(row.get("race_number")),
                clean(row.get("track_id")),
            )
            lookup[key] = clean(row.get("id"))

    return lookup

def main():
    event_lookup = load_event_lookup()
    final_rows = []
    missing = []

    with open(RESULTS_STAGE_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            key = (
                clean(row.get("season_id")),
                clean(row.get("race_number")),
                clean(row.get("track_id")),
            )

            series_event_id = event_lookup.get(key)

            if not series_event_id:
                missing.append(row)
                continue

            row["series_event_id"] = series_event_id

            # Remove helper columns not in Supabase table
            row.pop("event_slug", None)
            row.pop("season_id", None)
            row.pop("race_number", None)
            row.pop("track_id", None)

            final_rows.append(row)

    fieldnames = [
        "series_event_id",
        "finishing_position",
        "starting_position",
        "car_number",
        "driver_id",
        "driver_name",
        "driver_slug",
        "sponsor",
        "make",
        "laps",
        "led",
        "status",
        "points",
        "result_section",
        "source_url",
    ]

    with open(RESULTS_FINAL_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_rows)

    print("")
    print("Done.")
    print(f"Event lookup rows: {len(event_lookup)}")
    print(f"Final result rows: {len(final_rows)}")
    print(f"Missing event matches: {len(missing)}")
    print(f"Wrote: {RESULTS_FINAL_CSV}")

if __name__ == "__main__":
    main()