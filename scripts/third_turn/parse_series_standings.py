from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup
import re

SEASON_DIR = Path("scripts/third_turn/cache/seasons")
OUTPUT_DIR = Path("scripts/third_turn/output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "wisconsin_challenge_series_standings.csv"

def slugify(value):
    if pd.isna(value):
        return ""
    value = str(value).strip().lower()
    value = re.sub(r"['’]", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")

rows = []

for html_file in sorted(SEASON_DIR.glob("*_wisconsin_challenge_series.html")):
    season_year = int(html_file.name[:4])
    html = html_file.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table")

    if len(tables) <= 3:
        print(f"Skipping {season_year}: standings table not found")
        continue

    standings_table = tables[3]

    for tr in standings_table.find_all("tr"):
        cells = [cell.get_text(" ", strip=True) for cell in tr.find_all(["th", "td"])]

        if len(cells) < 8:
            continue

        if cells[0] == "Fin":
            continue

        driver_name = cells[1]

        rows.append({
            "series_slug": "wisconsin-challenge-series",
            "season_year": season_year,
            "finishing_position": cells[0],
            "driver_name": driver_name,
            "driver_slug_guess": slugify(driver_name),
            "points": cells[2],
            "starts": cells[3],
            "wins": cells[4],
            "top5": cells[5],
            "top10": cells[6],
            "poles": cells[7],
        })

df = pd.DataFrame(rows)
df.to_csv(OUTPUT_FILE, index=False)

print("Standings parser complete.")
print(f"Exported {len(df)} standings rows.")
print(f"Saved to: {OUTPUT_FILE}")