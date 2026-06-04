import csv
from pathlib import Path
from datetime import datetime


BASE_DIR = Path(r"C:\Users\schaf\racing-museum")
OUTPUT_DIR = BASE_DIR / "scripts" / "third_turn" / "output"

STAGING_CSV = OUTPUT_DIR / "series_event_results_staging.csv"
TRACKS_LOOKUP_CSV = OUTPUT_DIR / "tracks_lookup.csv"
TRACK_ALIASES_CSV = OUTPUT_DIR / "track_aliases.csv"
SERIES_SEASONS_LOOKUP_CSV = OUTPUT_DIR / "series_seasons_lookup.csv"

SERIES_EVENTS_IMPORT_CSV = OUTPUT_DIR / "series_events_import.csv"
SERIES_EVENT_RESULTS_STAGE_CSV = OUTPUT_DIR / "series_event_results_stage.csv"
MISSING_TRACKS_CSV = OUTPUT_DIR / "missing_tracks_review.csv"
MISSING_SEASONS_CSV = OUTPUT_DIR / "missing_series_seasons_review.csv"

SERIES_ID = "3"


def clean(value):
    return str(value or "").strip()


def normalize_date(value):
    value = clean(value)

    if not value:
        return ""

    for fmt in ("%B %d, %Y", "%b %d, %Y", "%d-%b-%y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return value


def load_tracks():
    tracks = {}

    if not TRACKS_LOOKUP_CSV.exists():
        print(f"WARNING: Missing tracks lookup file: {TRACKS_LOOKUP_CSV}")
        return tracks

    with open(TRACKS_LOOKUP_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            track_id = clean(row.get("track_id"))
            track_name = clean(row.get("track_name"))
            slug = clean(row.get("slug"))

            if not track_id:
                continue

            track_data = {
                "track_id": track_id,
                "track_name": track_name,
                "slug": slug,
            }

            if track_name:
                tracks[track_name.lower()] = track_data

            if slug:
                tracks[slug.lower()] = track_data

    return tracks


def load_track_aliases():
    aliases = {}

    if not TRACK_ALIASES_CSV.exists():
        print(f"WARNING: Missing track aliases file: {TRACK_ALIASES_CSV}")
        return aliases

    with open(TRACK_ALIASES_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            source_name = clean(row.get("source_track_name"))
            source_slug = clean(row.get("source_track_slug"))
            resolved_track_id = clean(row.get("resolved_track_id"))
            resolved_track_name = clean(row.get("resolved_track_name"))
            resolved_track_slug = clean(row.get("resolved_track_slug"))

            if not source_name or not resolved_track_id:
                continue

            alias_data = {
                "track_id": resolved_track_id,
                "track_name": resolved_track_name,
                "slug": resolved_track_slug,
            }

            aliases[source_name.lower()] = alias_data

            if source_slug:
                aliases[source_slug.lower()] = alias_data

    return aliases


def load_series_seasons():
    seasons = {}

    if not SERIES_SEASONS_LOOKUP_CSV.exists():
        print(f"WARNING: Missing series seasons lookup file: {SERIES_SEASONS_LOOKUP_CSV}")
        return seasons

    with open(SERIES_SEASONS_LOOKUP_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            season_id = clean(row.get("id"))
            year = clean(row.get("year"))

            if season_id and year:
                seasons[year] = season_id

    return seasons


def main():
    tracks = load_tracks()
    track_aliases = load_track_aliases()
    seasons = load_series_seasons()

    print(f"Loaded tracks: {len(tracks)}")
    print(f"Loaded track aliases: {len(track_aliases)}")
    print(f"Loaded series seasons: {len(seasons)}")

    series_events = {}
    series_event_results = []
    missing_tracks = {}
    missing_seasons = {}

    with open(STAGING_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            event_slug = clean(row.get("event_slug"))
            track_name = clean(row.get("track_name"))
            track_slug = clean(row.get("track_slug"))
            year = clean(row.get("source_season_year"))

            season_id = seasons.get(year)

            if not season_id:
                missing_seasons[year] = {
                    "year": year,
                    "event_slug": event_slug,
                    "notes": "",
                }
                continue

            track_match = (
                tracks.get(track_slug.lower())
                or tracks.get(track_name.lower())
                or track_aliases.get(track_slug.lower())
                or track_aliases.get(track_name.lower())
            )

            if not track_match:
                missing_key = track_slug or track_name or event_slug

                missing_tracks[missing_key] = {
                    "track_name": track_name,
                    "track_slug": track_slug,
                    "first_seen_year": year,
                    "event_slug": event_slug,
                    "notes": "",
                }
                continue

            track_id = clean(track_match["track_id"])
            resolved_track_name = clean(track_match["track_name"]) or track_name

            if event_slug not in series_events:
                series_events[event_slug] = {
                    "series_id": SERIES_ID,
                    "season_id": season_id,
                    "event_id": "",
                    "race_number": clean(row.get("source_race_number")),
                    "race_date": normalize_date(row.get("race_date")),
                    "track_name": resolved_track_name,
                    "track_id": track_id,
                    "winner_name": "",
                    "winner_driver_id": "",
                    "source_url": clean(row.get("source_url")),
                    "event_slug": event_slug,
                }

            series_event_results.append({
    "event_slug": event_slug,
    "series_event_id": "",
    "season_id": season_id,
    "race_number": clean(row.get("source_race_number")),
    "track_id": track_id,
    "finishing_position": clean(row.get("finishing_position")),
                "starting_position": "",
                "car_number": "",
                "driver_id": clean(row.get("matched_driver_id")),
                "driver_name": clean(row.get("matched_driver_name")),
                "driver_slug": clean(row.get("driver_slug_guess")),
                "sponsor": "",
                "make": "",
                "laps": "",
                "led": "",
                "status": "",
                "points": "",
                "result_section": "feature",
                "source_url": clean(row.get("source_url")),
            })

    series_event_fieldnames = [
        "series_id",
        "season_id",
        "event_id",
        "race_number",
        "race_date",
        "track_name",
        "track_id",
        "winner_name",
        "winner_driver_id",
        "source_url",
        "event_slug",
    ]

    with open(SERIES_EVENTS_IMPORT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=series_event_fieldnames)
        writer.writeheader()
        writer.writerows(series_events.values())

        series_event_result_fieldnames = [
        "event_slug",
        "series_event_id",
        "season_id",
        "race_number",
        "track_id",
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

    with open(SERIES_EVENT_RESULTS_STAGE_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=series_event_result_fieldnames)
        writer.writeheader()
        writer.writerows(series_event_results)

    with open(MISSING_TRACKS_CSV, "w", newline="", encoding="utf-8-sig") as f:
        fieldnames = ["track_name", "track_slug", "first_seen_year", "event_slug", "notes"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(missing_tracks.values())

    with open(MISSING_SEASONS_CSV, "w", newline="", encoding="utf-8-sig") as f:
        fieldnames = ["year", "event_slug", "notes"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(missing_seasons.values())

    print("")
    print("Done.")
    print(f"Series events created: {len(series_events)}")
    print(f"Series event result rows created: {len(series_event_results)}")
    print(f"Missing tracks: {len(missing_tracks)}")
    print(f"Missing seasons: {len(missing_seasons)}")
    print(f"Wrote: {SERIES_EVENTS_IMPORT_CSV}")
    print(f"Wrote: {SERIES_EVENT_RESULTS_STAGE_CSV}")
    print(f"Wrote: {MISSING_TRACKS_CSV}")
    print(f"Wrote: {MISSING_SEASONS_CSV}")


if __name__ == "__main__":
    main()