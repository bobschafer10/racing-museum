import time
import pandas as pd
import requests
from pathlib import Path

INPUT_FILE = Path("scripts/third_turn/output/wisconsin_challenge_series_tables_with_links.csv")
CACHE_DIR = Path("scripts/third_turn/cache/seasons")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

headers = {
    "User-Agent": "Virtual Midwest Auto Racing Museum research script; contact: bobschafer100@gmail.com"
}

df = pd.read_csv(INPUT_FILE)

season_rows = df[
    (df["table_index"] == 2) &
    (df["cell_1"].astype(str).str.match(r"^\d{4}$", na=False))
].copy()

print(f"Found {len(season_rows)} season rows.")

for _, row in season_rows.iterrows():
    season_year = str(row["cell_1"])
    url = str(row.get("cell_1_url", "")).strip()

    if not url or url == "nan":
        print(f"Skipping {season_year}: no URL found")
        continue

    output_file = CACHE_DIR / f"{season_year}_wisconsin_challenge_series.html"

    if output_file.exists():
        print(f"Already cached: {season_year}")
        continue

    print(f"Fetching {season_year}: {url}")

    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    output_file.write_text(response.text, encoding="utf-8")

    print(f"Saved: {output_file}")

    time.sleep(3)

print("Done.")