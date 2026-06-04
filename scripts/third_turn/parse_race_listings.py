from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime

SEASON_DIR = Path("scripts/third_turn/cache/seasons")
OUTPUT_DIR = Path("scripts/third_turn/output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "wisconsin_challenge_series_race_listings.csv"

BASE_URL = "https://www.thethirdturn.com"

def full_url(href):
    if not href:
        return ""
    if href.startswith("/"):
        return BASE_URL + href
    return href

def clean_text(value):
    if value is None:
        return ""
    return " ".join(value.get_text(" ", strip=True).split())

def parse_date(date_text, season_year):
    """
    Converts Third Turn dates into YYYY-MM-DD.
    Handles:
    8-Jul-01
    8 July 2001
    """
    date_text = str(date_text).strip()

    if not date_text:
        return ""

    formats = [
        "%d-%b-%y",
        "%d %B %Y",
        "%d %b %Y",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_text.title(), fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

    return date_text
rows = []

for html_file in sorted(SEASON_DIR.glob("*_wisconsin_challenge_series.html")):
    season_year = html_file.name[:4]

    html = html_file.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "lxml")

    tables = soup.find_all("table")

    if len(tables) <= 1:
        print(f"Skipping {season_year}: no race listing table found")
        continue

    race_table = tables[1]

    for tr in race_table.find_all("tr"):
        cells = tr.find_all(["th", "td"])

        if len(cells) != 4:
            continue

        race_number = clean_text(cells[0])

        if not race_number.isdigit():
            continue

        race_link = cells[0].find("a")
        track_link = cells[2].find("a")
        winner_link = cells[3].find("a")

        race_date_raw = clean_text(cells[1])
        race_date = parse_date(race_date_raw, season_year)

        rows.append({
            "series_slug": "wisconsin-challenge-series",
            "series_name": "Wisconsin Challenge Series",
            "season_year": season_year,
            "race_number": race_number,
            "race_date": race_date,
            "race_date_raw": race_date_raw,

            "race_name": race_link.get_text(" ", strip=True) if race_link else "",
            "race_url": full_url(race_link.get("href")) if race_link else "",

            "track_display": clean_text(cells[2]),
            "track_url": full_url(track_link.get("href")) if track_link else "",

            "winner_name": clean_text(cells[3]),
            "winner_url": full_url(winner_link.get("href")) if winner_link else "",

            "source_file": html_file.name,
        })

df = pd.DataFrame(rows)
print(df[["season_year", "race_date_raw", "race_date"]].head(10))
df.to_csv(OUTPUT_FILE, index=False)

print("Race listing parser complete.")
print(f"Exported {len(df)} race rows.")
print(f"Saved to: {OUTPUT_FILE}")