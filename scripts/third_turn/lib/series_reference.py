from pathlib import Path
import csv


ROOT = Path(__file__).resolve().parents[3]
REFERENCE_CSV = ROOT / "scripts" / "third_turn" / "series_configs" / "series_id_reference.csv"


def load_series_reference() -> list[dict]:
    if not REFERENCE_CSV.exists():
        raise FileNotFoundError(f"Series reference CSV not found: {REFERENCE_CSV}")

    with REFERENCE_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def find_series_by_slug(supabase_series_slug: str) -> dict | None:
    rows = load_series_reference()

    for row in rows:
        if row.get("slug") == supabase_series_slug:
            return row

    return None


def confirm_series_id(config: dict) -> dict:
    expected_slug = config["supabase_series_slug"]
    expected_id = config["supabase_series_id"]

    row = find_series_by_slug(expected_slug)

    if not row:
        raise ValueError(
            f"Series slug not found in series_id_reference.csv: {expected_slug}"
        )

    actual_id = int(row["id"])

    if expected_id is None:
        raise ValueError(
            f"Config has supabase_series_id set to null.\n"
            f"Found matching Supabase series:\n"
            f"  id: {actual_id}\n"
            f"  series_name: {row.get('series_name')}\n"
            f"  slug: {row.get('slug')}\n\n"
            f"Update your config JSON with this id before importing."
        )

    if int(expected_id) != actual_id:
        raise ValueError(
            f"Series ID mismatch.\n"
            f"Config id: {expected_id}\n"
            f"Reference CSV id: {actual_id}\n"
            f"Slug: {expected_slug}\n\n"
            f"Stop. Do not import until this is fixed."
        )

    return row


if __name__ == "__main__":
    from load_series_config import load_series_config

    config = load_series_config("badger_modified_tour")
    row = confirm_series_id(config)

    print("Series ID confirmed:")
    print(row)