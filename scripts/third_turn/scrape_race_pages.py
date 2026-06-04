import time
from pathlib import Path
import pandas as pd
import requests
import re

INPUT_FILE = Path("scripts/third_turn/output/wisconsin_challenge_series_supabase_review.csv")
CACHE_DIR = Path("scripts/third_turn/cache/races")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

headers = {
    "User-Agent": "Virtual Midwest Auto Racing Museum research script; contact: bobschafer100@gmail.com"
}

def safe_filename(value):
    value = str(value).strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")

df = pd.read_csv(INPUT_FILE)

for _, row in df.iterrows():
    season_year = str(row["season_year"])
    race_number = str(row["race_number"]).zfill(2)
    race_title = str(row["race_title"])
    race_url = str(row["race_url"])

    filename = f"{season_year}_{race_number}_{safe_filename(race_title)}.html"
    output_file = CACHE_DIR / filename

    if output_file.exists():
        print(f"Already cached: {filename}")
        continue

    print(f"Fetching: {race_url}")
    response = requests.get(race_url, headers=headers, timeout=30)
    response.raise_for_status()

    output_file.write_text(response.text, encoding="utf-8")
    print(f"Saved: {output_file}")

    time.sleep(3)

print("Done.")