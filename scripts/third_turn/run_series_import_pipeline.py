from pathlib import Path
from urllib.parse import urlparse
import argparse
import json
import sys
import csv


ROOT = Path(__file__).resolve().parents[2]
LIB_DIR = ROOT / "scripts" / "third_turn" / "lib"

sys.path.append(str(LIB_DIR))

from load_series_config import load_series_config
from series_reference import confirm_series_id
from download_page import download_page
from parse_series_page import find_season_links
from parse_season_page import find_race_links


THIRD_TURN_DIR = ROOT / "scripts" / "third_turn"
PACKAGE_DIR = THIRD_TURN_DIR / "series_packages"
COMPLETED_DIR = THIRD_TURN_DIR / "completed_imports"
CACHE_DIR = THIRD_TURN_DIR / "cache"


def ensure_series_folders(series_slug: str) -> dict:
    package_dir = PACKAGE_DIR / series_slug
    completed_dir = COMPLETED_DIR / series_slug
    cache_dir = CACHE_DIR / series_slug
    race_cache_dir = cache_dir / "races"

    folders = {
        "package_dir": package_dir,
        "completed_dir": completed_dir,
        "cache_dir": cache_dir,
        "race_cache_dir": race_cache_dir
    }

    for folder in folders.values():
        folder.mkdir(parents=True, exist_ok=True)

    return folders


def write_pipeline_manifest(config: dict, series_row: dict, folders: dict) -> Path:
    manifest_path = folders["package_dir"] / "pipeline_manifest.json"

    manifest = {
        "series_slug": config["series_slug"],
        "series_name": config["series_name"],
        "supabase_series_id": config["supabase_series_id"],
        "supabase_series_name": config["supabase_series_name"],
        "supabase_series_slug": config["supabase_series_slug"],
        "third_turn_series_url": config["third_turn_series_url"],
        "reference_series_row": series_row,
        "folders": {key: str(value) for key, value in folders.items()}
    }

    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return manifest_path


def add_manual_race_links(config: dict, race_links: list[dict], season_year: int) -> list[dict]:
    for item in config.get("manual_race_links", []):
        if int(item["season_year"]) == int(season_year):
            race_links.append({
                "season_year": int(item["season_year"]),
                "race_number": int(item["race_number"]),
                "link_text": item.get("title", ""),
                "url": item["url"]
            })

    seen_urls = set()
    unique = []

    for race in race_links:
        key = race["url"]
        if key not in seen_urls:
            seen_urls.add(key)
            unique.append(race)

    return sorted(
        unique,
        key=lambda x: (int(x["season_year"]), int(x["race_number"]), x["url"])
    )


def race_url_to_filename(race_url: str) -> str:
    race_slug = urlparse(race_url).path.split("/")[-1].replace(":", "_")
    return f"{race_slug}.html"


def run_pipeline(series_slug: str):
    print("=" * 70)
    print("THIRD TURN SERIES IMPORT PIPELINE")
    print("=" * 70)

    print(f"\nLoading config for: {series_slug}")
    config = load_series_config(series_slug)

    print("Confirming Supabase Series.id...")
    series_row = confirm_series_id(config)

    print("Creating/checking series folders...")
    folders = ensure_series_folders(series_slug)

    print("Downloading/checking main Third Turn series page...")
    series_page_path = folders["cache_dir"] / "series_page.html"
    download_page(config["third_turn_series_url"], series_page_path)

    print("Finding season links...")
    season_links = find_season_links(series_page_path)

    print(f"Found {len(season_links)} season links.")

    total_race_links = 0
    race_manifest_rows = []

    for season in season_links:
        season_year = int(season["season_year"])
        season_url = season["url"]
        season_path = folders["cache_dir"] / f"season_{season_year}.html"

        print(f"Downloading/checking season page: {season_year}")
        download_page(season_url, season_path)

        race_links = find_race_links(season_path, season_year)
        race_links = add_manual_race_links(config, race_links, season_year)

        print(f"Found {len(race_links)} race links for {season_year}.")
        total_race_links += len(race_links)

        for race in race_links:
            race_number = int(race["race_number"])
            race_url = race["url"]
            race_path = folders["race_cache_dir"] / race_url_to_filename(race_url)

            race_manifest_rows.append({
                "race_file": race_path.name,
                "season_year": season_year,
                "race_number": race_number,
                "source_url": race_url,
                "link_text": race.get("link_text", "")
            })

            print(f"Downloading/checking race page: {season_year}-{race_number:02d}")
            download_page(race_url, race_path)

    manifest_path = write_pipeline_manifest(config, series_row, folders)

    race_manifest_path = folders["package_dir"] / "race_links_manifest.csv"

    with race_manifest_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "race_file",
            "season_year",
            "race_number",
            "source_url",
            "link_text"
        ])
        writer.writeheader()
        writer.writerows(race_manifest_rows)

    print("\nRace link manifest written:")
    print(f"  {race_manifest_path}")

    print("\nSeries confirmed:")
    print(f"  Series name: {config['series_name']}")
    print(f"  Supabase ID: {config['supabase_series_id']}")
    print(f"  Supabase slug: {config['supabase_series_slug']}")

    print("\nRace page summary:")
    print(f"  Total race links found: {total_race_links}")

    print("\nWorking folders:")
    for label, path in folders.items():
        print(f"  {label}: {path}")

    print(f"\nManifest written:")
    print(f"  {manifest_path}")

    print("\nPipeline download stage complete.")
    print("Next step will be parsing race metadata and finishing results.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("series_slug", help="Config slug, e.g. badger_modified_tour")
    args = parser.parse_args()

    run_pipeline(args.series_slug)


if __name__ == "__main__":
    main()