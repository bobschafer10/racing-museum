from pathlib import Path
import csv


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

OUTPUT_CSV = PACKAGE_DIR / "series_event_id_map.csv"


ROWS = [
    {"season_year": 2012, "race_number": 1, "series_event_id": 334},
    {"season_year": 2012, "race_number": 2, "series_event_id": 335},
    {"season_year": 2012, "race_number": 3, "series_event_id": 336},
    {"season_year": 2012, "race_number": 4, "series_event_id": 337},
    {"season_year": 2012, "race_number": 5, "series_event_id": 338},
    {"season_year": 2012, "race_number": 6, "series_event_id": 339},
    {"season_year": 2012, "race_number": 7, "series_event_id": 340},
    {"season_year": 2013, "race_number": 1, "series_event_id": 341},
    {"season_year": 2013, "race_number": 2, "series_event_id": 342},
    {"season_year": 2013, "race_number": 3, "series_event_id": 343},
    {"season_year": 2013, "race_number": 4, "series_event_id": 344},
    {"season_year": 2013, "race_number": 5, "series_event_id": 345},
    {"season_year": 2013, "race_number": 6, "series_event_id": 346},
    {"season_year": 2013, "race_number": 7, "series_event_id": 347},
]


def main():
    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "season_year",
            "race_number",
            "series_event_id"
        ])
        writer.writeheader()
        writer.writerows(ROWS)

    print(f"Wrote {len(ROWS)} rows:")
    print(OUTPUT_CSV)


if __name__ == "__main__":
    main()