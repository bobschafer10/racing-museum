import time
import requests
from pathlib import Path

BASE_URL = "https://www.thethirdturn.com/wiki/Wisconsin_Challenge_Series"

CACHE_DIR = Path("scripts/third_turn/cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

headers = {
    "User-Agent": "Virtual Midwest Auto Racing Museum research script; contact: bobschafer100@gmail.com"
}

def fetch_page(url: str, filename: str):
    cache_path = CACHE_DIR / filename

    if cache_path.exists():
        print(f"Using cached file: {cache_path}")
        return cache_path.read_text(encoding="utf-8", errors="ignore")

    print(f"Fetching: {url}")
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    html = response.text
    cache_path.write_text(html, encoding="utf-8")

    time.sleep(3)
    return html

if __name__ == "__main__":
    html = fetch_page(BASE_URL, "wisconsin_challenge_series.html")
    print("Downloaded page successfully.")
    print("Saved to scripts/third_turn/cache/wisconsin_challenge_series.html")
    print(html[:1000])