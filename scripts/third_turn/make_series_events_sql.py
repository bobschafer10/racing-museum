import csv
from pathlib import Path

BASE_DIR = Path(r"C:\Users\schaf\racing-museum")
OUTPUT_DIR = BASE_DIR / "scripts" / "third_turn" / "output"

INPUT_CSV = OUTPUT_DIR / "series_events_import.csv"
OUTPUT_SQL = OUTPUT_DIR / "insert_series_events.sql"


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
                sql_value(row.get("series_id"), numeric=True),
                sql_value(row.get("season_id"), numeric=True),
                sql_value(row.get("event_id"), numeric=True),
                sql_value(row.get("race_number"), numeric=True),
                sql_value(row.get("race_date")),
                sql_value(row.get("track_name")),
                sql_value(row.get("track_id"), numeric=True),
                sql_value(row.get("winner_name")),
                sql_value(row.get("winner_driver_id"), numeric=True),
                sql_value(row.get("source_url")),
            ])
            + ")"
        )

sql = """insert into "SeriesEvents" (
  series_id,
  season_id,
  event_id,
  race_number,
  race_date,
  track_name,
  track_id,
  winner_name,
  winner_driver_id,
  source_url
)
values
"""

sql += ",\n".join(rows)
sql += "\nreturning id, series_id, season_id, race_number, race_date, track_id;\n"

OUTPUT_SQL.write_text(sql, encoding="utf-8")

print(f"Wrote: {OUTPUT_SQL}")
print(f"Rows: {len(rows)}")