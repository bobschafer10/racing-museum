from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup

CACHE_FILE = Path("scripts/third_turn/cache/wisconsin_challenge_series.html")
OUTPUT_DIR = Path("scripts/third_turn/output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "wisconsin_challenge_series_tables_with_links.csv"

BASE_URL = "https://www.thethirdturn.com"

html = CACHE_FILE.read_text(encoding="utf-8", errors="ignore")
soup = BeautifulSoup(html, "lxml")

rows = []

tables = soup.find_all("table")

for table_index, table in enumerate(tables):
    for row_index, tr in enumerate(table.find_all("tr")):
        cells = tr.find_all(["th", "td"])

        if not cells:
            continue

        row = {
            "table_index": table_index,
            "row_index": row_index,
            "cell_count": len(cells),
        }

        for i, cell in enumerate(cells, start=1):
            text = cell.get_text(" ", strip=True)
            link = cell.find("a")

            row[f"cell_{i}"] = text

            if link and link.get("href"):
                href = link.get("href")
                row[f"cell_{i}_url"] = BASE_URL + href if href.startswith("/") else href
            else:
                row[f"cell_{i}_url"] = ""

        rows.append(row)

df = pd.DataFrame(rows)
df.to_csv(OUTPUT_FILE, index=False)

print("Parser complete.")
print(f"Found {len(tables)} tables.")
print(f"Exported {len(df)} rows.")
print(f"Saved to: {OUTPUT_FILE}")