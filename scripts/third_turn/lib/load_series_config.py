from pathlib import Path
import json


ROOT = Path(__file__).resolve().parents[3]

CONFIG_DIR = ROOT / "scripts" / "third_turn" / "series_configs"


def load_series_config(series_slug: str) -> dict:
    config_path = CONFIG_DIR / f"{series_slug}.json"

    if not config_path.exists():
        raise FileNotFoundError(f"Series config not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as f:
        config = json.load(f)

    required_fields = [
    "series_slug",
    "series_name",
    "supabase_series_id",
    "supabase_series_name",
    "supabase_series_slug",
    "third_turn_series_url",
    "years",
    "manual_race_links",
    "track_slug_overrides",
    "driver_name_overrides"
]

    missing = [field for field in required_fields if field not in config]

    if missing:
        raise ValueError(f"Missing required config fields: {missing}")

    if config["series_slug"] != series_slug:
        raise ValueError(
            f"Config slug mismatch. File requested: {series_slug}. "
            f"Config contains: {config['series_slug']}"
        )

    return config


if __name__ == "__main__":
    config = load_series_config("badger_modified_tour")
    print(json.dumps(config, indent=2))