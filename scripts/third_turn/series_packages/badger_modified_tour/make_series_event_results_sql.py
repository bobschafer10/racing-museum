from pathlib import Path
import csv

SERIES_KEY = "badger_modified_tour"

BASE_DIR = Path(__file__).resolve().parent
PACKAGE_DIR = BASE_DIR / "series_packages" / SERIES_KEY

INPUT_CSV = PACKAGE_DIR / "08_series_event_results_import_with_driver_ids.csv"
OUTPUT_SQL = PACKAGE_DIR / "09_series_event_results_insert.sql"

COLUMNS = [
    "series_event_id",
    "finishing_position",
    "starting_position",
    "car_number",
    "driver_name",
    "sponsor",
    "make",
    "laps",
    "led",
    "status",
    "points",
    "result_section",
    "source_url",
    "driver_id",
    "driver_slug",
]

INTEGER_COLUMNS = {
    "series_event_id",
    "finishing_position",
    "starting_position",
    "laps",
    "led",
    "points",
    "driver_id",
}


def sql_value(value, column):
    if value is None:
        return "null"

    value = str(value).strip()

    if value == "":
        return "null"

    if column in INTEGER_COLUMNS:
        return value

    value = value.replace("'", "''")
    return f"'{value}'"


def main():
    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Missing input CSV: {INPUT_CSV}")

    rows = []
    missing_driver_rows = []

    with INPUT_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for i, row in enumerate(reader, start=2):
            driver_name = (row.get("driver_name") or "").strip()
            driver_id = (row.get("driver_id") or "").strip()
            driver_slug = (row.get("driver_slug") or "").strip()

            if not driver_id or not driver_slug:
                missing_driver_rows.append((i, driver_name, driver_id, driver_slug))

            rows.append(row)

    if missing_driver_rows:
        print("STOP: Missing driver_id or driver_slug on these rows:")
        for line_num, driver_name, driver_id, driver_slug in missing_driver_rows:
            print(f"  CSV line {line_num}: {driver_name} | driver_id={driver_id} | driver_slug={driver_slug}")
        print()
        print("Fix those rows first, then rerun this script.")
        return

    lines = []
    lines.append("-- Badger Modified Tour SeriesEventResults import")
    lines.append("-- Generated from 08_series_event_results_import_with_driver_ids.csv")
    lines.append("")
    lines.append('insert into "SeriesEventResults" (')
    lines.append("  " + ",\n  ".join(COLUMNS))
    lines.append(")")
    lines.append("values")

    value_lines = []
    for row in rows:
        vals = [sql_value(row.get(col), col) for col in COLUMNS]
        value_lines.append("  (" + ", ".join(vals) + ")")

    lines.append(",\n".join(value_lines) + ";")
    lines.append("")

    OUTPUT_SQL.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(rows)} rows:")
    print(OUTPUT_SQL)


if __name__ == "__main__":
    main()