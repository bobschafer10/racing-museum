from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
import re


BASE_URL = "https://www.thethirdturn.com"


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.current_href = None
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            attrs_dict = dict(attrs)
            self.current_href = attrs_dict.get("href")
            self.current_text = []

    def handle_data(self, data):
        if self.current_href is not None:
            self.current_text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self.current_href is not None:
            text = " ".join(t.strip() for t in self.current_text if t.strip())
            self.links.append({
                "text": text,
                "href": self.current_href
            })
            self.current_href = None
            self.current_text = []


def parse_links(html: str) -> list[dict]:
    parser = LinkParser()
    parser.feed(html)
    return parser.links


def find_season_links(series_page_path: Path) -> list[dict]:
    html = series_page_path.read_text(encoding="utf-8", errors="replace")
    links = parse_links(html)

    season_links = []

    for link in links:
        text = link.get("text", "").strip()
        href = link.get("href", "").strip()

        if not href:
            continue

        # Third Turn series pages often link seasons like:
        # text='2013'
        # href='/wiki/2013_Custom_Windows_Plus_Badger_Mod_Tour_presented_by_Gandrud_Chevrolet_Central'
        text_year_match = re.fullmatch(r"\d{4}", text)
        href_year_match = re.search(r"/wiki/(\d{4})_", href)

        if not text_year_match and not href_year_match:
            continue

        year = int(text_year_match.group(0)) if text_year_match else int(href_year_match.group(1))

        # Avoid non-season utility links that happen to contain years
        if "/wiki/" not in href:
            continue

        full_url = urljoin(BASE_URL, href)

        season_links.append({
            "season_year": year,
            "link_text": text,
            "url": full_url
        })

    # Deduplicate by year + url
    seen = set()
    unique = []

    for item in season_links:
        key = (item["season_year"], item["url"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return sorted(unique, key=lambda x: x["season_year"])


if __name__ == "__main__":
    test_path = Path(
        r"C:\Users\schaf\racing-museum\scripts\third_turn\cache\badger_modified_tour\series_page.html"
    )

    seasons = find_season_links(test_path)

    print(f"Found {len(seasons)} season links")

    for season in seasons:
        print(season)