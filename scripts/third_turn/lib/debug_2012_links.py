from pathlib import Path
from parse_series_page import parse_links


ROOT = Path(__file__).resolve().parents[3]

path = ROOT / "scripts" / "third_turn" / "cache" / "badger_modified_tour" / "season_2012.html"

html = path.read_text(encoding="utf-8", errors="replace")
links = parse_links(html)

print(f"Links found: {len(links)}")
print("=" * 80)

for i, link in enumerate(links, start=1):
    text = link.get("text", "")
    href = link.get("href", "")

    if (
        "2012" in text
        or "2012" in href
        or "Badger" in text
        or "Badger" in href
        or "Modified" in text
        or "Modified" in href
        or "Nationals" in text
        or "Nationals" in href
    ):
        print(f"{i}. text={text!r} href={href!r}")