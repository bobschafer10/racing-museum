from pathlib import Path
import csv
import re
from collections import defaultdict, Counter


# =========================
# CONFIG
# =========================

ROOT = Path(r"C:\Users\schaf\racing-museum")

SERIES_SLUG = "artgo-challenge-series"
SERIES_ID = 0          # fill later
SEASON_ID_BLANK = ""   # seasons will be reviewed later

INPUT_CSV = Path(r"C:\Users\schaf\racing-museum\scripts\third_turn\incoming\ARTGO.csv")

PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG
PACKAGE_DIR.mkdir(parents=True, exist_ok=True)

EVENTS_REVIEW = PACKAGE_DIR / "01_events_review.csv"
TRACK_REVIEW = PACKAGE_DIR / "02_track_review.csv"
DRIVER_REVIEW = PACKAGE_DIR / "03_driver_review.csv"
RESULTS_PREVIEW = PACKAGE_DIR / "04_results_import_preview.csv"
IMPORT_CHECKS = PACKAGE_DIR / "05_import_checks.csv"


def clean(value):
    return (value or "").strip()


def parse_year(date_value):
    date_value = clean(date_value)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_value):
        return date_value[:4]
    if re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", date_value):
        return date_value.split("/")[-1]
    return ""


def normalize_date(date_value):
    date_value = clean(date_value)

    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_value):
        return date_value

    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", date_value)
    if m:
        month, day, year = m.groups()
        return f"{year}-{int(month):02d}-{int(day):02d}"

    return date_value


def slugify(value):
    value = clean(value).lower()
    value = value.replace("&", " and ")
    value = value.replace("'", "")
    value = value.replace(".", "")
    value = value.replace(",", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def is_dnq_status(status):
    return clean(status).upper() in {"DNQ", "DNS"}


def safe_int(value):
    value = clean(value)
    if value == "":
        return ""
    try:
        return str(int(float(value)))
    except Exception:
        return value


def main():
    rows = []

    with INPUT_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    print(f"Loaded rows: {len(rows)}")

    # -------------------------
    # Build event keys
    # -------------------------
    event_map = {}
    events = []

    grouped = defaultdict(list)

    for row in rows:
        race = clean(row.get("Race"))
        track = clean(row.get("Track"))
        race_date = normalize_date(row.get("Date"))
        year = parse_year(race_date)
        key = (race, track, race_date)

        grouped[key].append(row)

    sorted_keys = sorted(grouped.keys(), key=lambda x: (x[2], x[1], x[0]))

    for idx, key in enumerate(sorted_keys, start=1):
        race, track, race_date = key
        year = parse_year(race_date)

        # Winner = first row with DriverFinish = 1
        winner = ""
        for r in grouped[key]:
            if safe_int(r.get("DriverFinish")) == "1":
                winner = clean(r.get("DriverName"))
                break

        event_map[key] = idx

        events.append({
            "series_id": SERIES_ID,
            "season_year": year,
            "season_id": "",
            "race_number": idx,
            "source_race_name": race,
            "series_event_id": "",
            "race_date": race_date,
            "track_name_source": track,
            "track_name_museum": track,
            "track_slug": slugify(track),
            "winner_name_source": winner,
            "winner_name_museum": winner,
            "winner_driver_id": "",
            "winner_driver_slug": slugify(winner),
            "source_url": "",
            "notes": "",
        })

    # -------------------------
    # Track review
    # -------------------------
    tracks = sorted({clean(r.get("Track")) for r in rows if clean(r.get("Track"))})
    track_rows = [{
        "source_track_name": t,
        "museum_track_name": t,
        "track_id": "",
        "track_slug": slugify(t),
        "match_status": "",
        "review_action": "",
        "notes": "",
    } for t in tracks]

    # -------------------------
    # Driver review
    # -------------------------
    drivers = sorted({clean(r.get("DriverName")) for r in rows if clean(r.get("DriverName"))})
    driver_rows = [{
        "source_driver_name": d,
        "alias_driver_name": "",
        "museum_driver_name": d,
        "driver_id": "",
        "driver_slug": slugify(d),
        "match_status": "",
        "review_action": "",
        "notes": "",
    } for d in drivers]

    # -------------------------
    # Results preview
    # -------------------------
    result_rows = []

    for row in rows:
        race = clean(row.get("Race"))
        track = clean(row.get("Track"))
        race_date = normalize_date(row.get("Date"))
        year = parse_year(race_date)
        key = (race, track, race_date)
        race_number = event_map[key]

        status = clean(row.get("DriverStatus"))
        finish = safe_int(row.get("DriverFinish"))

        result_section = "DNQ" if is_dnq_status(status) or finish == "" else "Feature"
        finishing_position = "" if result_section == "DNQ" else finish

        driver_name = clean(row.get("DriverName"))

        result_rows.append({
            "series_id": SERIES_ID,
            "season_year": year,
            "season_id": "",
            "race_number": race_number,
            "source_race_name": race,
            "series_event_id": "",
            "race_date": race_date,
            "track_name_source": track,
            "track_slug": slugify(track),
            "result_section": result_section,
            "finishing_position": finishing_position,
            "starting_position": safe_int(row.get("DriverStart")),
            "car_number": clean(row.get("DriverNum")),
            "source_driver_name": driver_name,
            "alias_driver_name": "",
            "museum_driver_name": driver_name,
            "driver_id": "",
            "driver_slug": slugify(driver_name),
            "sponsor": clean(row.get("DriverSponsor")),
            "make": clean(row.get("DriverMake")),
            "laps": safe_int(row.get("DriverLaps")),
            "led": safe_int(row.get("DriverLed")),
            "status": status,
            "points": safe_int(row.get("DriverPts")),
            "source_url": "",
            "notes": "",
        })

    # -------------------------
    # Checks
    # -------------------------
    status_counts = Counter(clean(r.get("DriverStatus")) or "blank" for r in rows)
    section_counts = Counter(r["result_section"] for r in result_rows)

    check_rows = [
        {"check_name": "source_rows", "value": len(rows), "notes": ""},
        {"check_name": "events_found", "value": len(events), "notes": ""},
        {"check_name": "tracks_found", "value": len(tracks), "notes": ""},
        {"check_name": "unique_drivers_found", "value": len(drivers), "notes": ""},
        {"check_name": "feature_rows", "value": section_counts.get("Feature", 0), "notes": ""},
        {"check_name": "dnq_rows", "value": section_counts.get("DNQ", 0), "notes": ""},
    ]

    for status, count in status_counts.most_common():
        check_rows.append({
            "check_name": f"status_{status}",
            "value": count,
            "notes": "",
        })

    # -------------------------
    # Write files
    # -------------------------
    def write_csv(path, fieldnames, data):
        with path.open("w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        print(f"Wrote {len(data)} rows: {path}")

    write_csv(EVENTS_REVIEW, list(events[0].keys()), events)
    write_csv(TRACK_REVIEW, list(track_rows[0].keys()), track_rows)
    write_csv(DRIVER_REVIEW, list(driver_rows[0].keys()), driver_rows)
    write_csv(RESULTS_PREVIEW, list(result_rows[0].keys()), result_rows)
    write_csv(IMPORT_CHECKS, list(check_rows[0].keys()), check_rows)

    print()
    print("Done. Review these files before importing:")
    print(EVENTS_REVIEW)
    print(TRACK_REVIEW)
    print(DRIVER_REVIEW)
    print(RESULTS_PREVIEW)
    print(IMPORT_CHECKS)


if __name__ == "__main__":
    main()