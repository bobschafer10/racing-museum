import csv
from pathlib import Path

BASE_DIR = Path(r"C:\Users\schaf\racing-museum")
OUTPUT_DIR = BASE_DIR / "scripts" / "third_turn" / "output"

INPUT_CSV = OUTPUT_DIR / "series_event_results_import.csv"
OUTPUT_SQL = OUTPUT_DIR / "insert_series_event_results.sql"


def sql_value(value, numeric=False):
    value = "" if value is None else str(value).strip()

    if value == "":
        return "null"

    if numeric:
        return value

    escaped = value.replace("'", "''")
    return f"'{escaped}'"


rows = []

with open(INPUT_CSV, newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)

    for row in reader:
        rows.append(
            "("
            + ", ".join([
                sql_value(row.get("series_event_id"), numeric=True),
                sql_value(row.get("finishing_position"), numeric=True),
                sql_value(row.get("starting_position"), numeric=True),
                sql_value(row.get("car_number")),
                sql_value(row.get("driver_id"), numeric=True),
                sql_value(row.get("driver_name")),
                sql_value(row.get("driver_slug")),
                sql_value(row.get("sponsor")),
                sql_value(row.get("make")),
                sql_value(row.get("laps"), numeric=True),
                sql_value(row.get("led"), numeric=True),
                sql_value(row.get("status")),
                sql_value(row.get("points"), numeric=True),
                sql_value(row.get("result_section")),
                sql_value(row.get("source_url")),
            ])
            + ")"
        )

sql = """insert into "SeriesEventResults" (
  series_event_id,
  finishing_position,
  starting_position,
  car_number,
  driver_id,
  driver_name,
  driver_slug,
  sponsor,
  make,
  laps,
  led,
  status,
  points,
  result_section,
  source_url
)
values
"""

sql += ",\n".join(rows)
sql += "\nreturning id, series_event_id, finishing_position, driver_name;\n"

OUTPUT_SQL.write_text(sql, encoding="utf-8")

print(f"Wrote: {OUTPUT_SQL}")
print(f"Rows: {len(rows)}")