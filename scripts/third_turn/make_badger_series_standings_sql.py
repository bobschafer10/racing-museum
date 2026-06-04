from pathlib import Path
import csv


SERIES_SLUG = "badger_modified_tour"

ROOT = Path(__file__).resolve().parents[2]
PACKAGE_DIR = ROOT / "scripts" / "third_turn" / "series_packages" / SERIES_SLUG

INPUT_CSV = PACKAGE_DIR / "11_series_standings_import_with_driver_ids.csv"
OUTPUT_SQL = PACKAGE_DIR / "14_series_standings_insert.sql"

COLUMNS = [
    "season_id",
    "finishing_position",
    "driver_name",
    "driver_id",
    "points",
    "starts",
    "wins",
    "top5",
    "top10",
    "poles",
]

INTEGER_COLUMNS = {
    "season_id",
    "finishing_position",
    "driver_id",
    "points",
    "starts",
    "wins",
    "top5",
    "top10",
    "poles",
}


def sql_value(value, column):
    value = (value or "").strip()

    if value == "":
        return "null"

    if column in INTEGER_COLUMNS:
        return value

    value = value.replace("'", "''")
    return f"'{value}'"


def main():
    rows = []

    with INPUT_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    lines = []
    lines.append("-- Badger Modified Tour SeriesStandings top 10 import")
    lines.append("")
    lines.append('insert into "SeriesStandings" (')
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