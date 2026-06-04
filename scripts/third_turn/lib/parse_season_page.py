from pathlib import Path
from urllib.parse import urljoin
import re

from parse_series_page import parse_links


BASE_URL = "https://www.thethirdturn.com"


def find_race_links(season_page_path: Path, season_year: int) -> list[dict]:
    html = season_page_path.read_text(encoding="utf-8", errors="replace")
    links = parse_links(html)

    race_links = []

    for link in links:
        text = link.get("text", "").strip()
        href = link.get("href", "").strip()

        if not href:
            continue

        # Skip utility/special MediaWiki pages
        if "/wiki/Special:" in href:
            continue

        # Race links commonly contain :YYYY-NN
        # Examples:
        # /wiki/Badger_Mod_Tour:2013-05
        # /wiki/Modified_Nationals:2013-04
        if f":{season_year}-" not in href:
            continue

        match = re.search(rf":{season_year}-(\d+)", href)

        if not match:
            continue

        race_number = int(match.group(1))
        full_url = urljoin(BASE_URL, href)

        race_links.append({
            "season_year": season_year,
            "race_number": race_number,
            "link_text": text,
            "url": full_url
        })

    seen = set()
    unique = []

    for item in race_links:
        key = (item["season_year"], item["race_number"], item["url"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return sorted(unique, key=lambda x: (x["season_year"], x["race_number"], x["url"]))


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[3]
    cache_dir = root / "scripts" / "third_turn" / "cache" / "badger_modified_tour"

    for year in [2012, 2013]:
        path = cache_dir / f"season_{year}.html"
        races = find_race_links(path, year)

        print(f"\n{year}: Found {len(races)} race links")
        for race in races:
            print(race)