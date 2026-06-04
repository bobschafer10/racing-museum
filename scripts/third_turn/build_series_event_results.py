import csv
import re
from pathlib import Path
from bs4 import BeautifulSoup


BASE_DIR = Path(r"C:\Users\schaf\racing-museum")
THIRD_TURN_DIR = BASE_DIR / "scripts" / "third_turn"

INPUT_DIR = THIRD_TURN_DIR / "cache" / "races"
OUTPUT_DIR = THIRD_TURN_DIR / "output"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SERIES_RESULTS_CSV = OUTPUT_DIR / "series_event_results_staging.csv"
MISSING_DRIVERS_CSV = OUTPUT_DIR / "missing_drivers_review.csv"
DRIVERS_LOOKUP_CSV = OUTPUT_DIR / "drivers_lookup.csv"
DRIVER_ALIASES_CSV = OUTPUT_DIR / "driver_aliases.csv"


def clean_text(value):
    if not value:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def slugify(value):
    value = str(value or "").lower().strip()
    value = re.sub(r"&", " and ", value)
    value = re.sub(r"['’]", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def clean_driver_name(name):
    name = clean_text(name)
    name = re.sub(r"\s*\([^)]*\)", "", name)
    name = name.replace("*", "").strip()
    return name


def load_driver_lookup():
    lookup = {}

    if not DRIVERS_LOOKUP_CSV.exists():
        print(f"WARNING: Missing driver lookup file: {DRIVERS_LOOKUP_CSV}")
        return lookup

    with open(DRIVERS_LOOKUP_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            driver_id = clean_text(row.get("driver_id", ""))
            driver_name = clean_driver_name(row.get("driver_name", ""))
            driver_slug = clean_text(row.get("slug", "")) or slugify(driver_name)

            if not driver_name:
                continue

            lookup[driver_name.lower()] = {
                "driver_id": driver_id,
                "driver_name": driver_name,
                "slug": driver_slug,
            }

            if driver_slug:
                lookup[driver_slug.lower()] = {
                    "driver_id": driver_id,
                    "driver_name": driver_name,
                    "slug": driver_slug,
                }

    return lookup


def load_driver_aliases():
    aliases = {}

    if not DRIVER_ALIASES_CSV.exists():
        print(f"WARNING: Missing driver aliases file: {DRIVER_ALIASES_CSV}")
        return aliases

    with open(DRIVER_ALIASES_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            source_name = clean_driver_name(row.get("source_driver_name", ""))
            source_slug = clean_text(row.get("source_driver_slug", ""))
            resolved_driver_id = clean_text(row.get("resolved_driver_id", ""))
            resolved_driver_name = clean_text(row.get("resolved_driver_name", ""))
            resolved_driver_slug = clean_text(row.get("resolved_driver_slug", ""))

            if not source_name or not resolved_driver_id or not resolved_driver_name:
                continue

            alias_data = {
                "driver_id": resolved_driver_id,
                "driver_name": resolved_driver_name,
                "slug": resolved_driver_slug,
            }

            aliases[source_name.lower()] = alias_data

            if source_slug:
                aliases[source_slug.lower()] = alias_data

    return aliases


def parse_metadata(soup, file_path):
    page_text = soup.get_text(" ", strip=True)

    source_season_year = ""
    source_race_number = ""
    race_date = ""
    track_name = ""
    source_series_slug = "wisconsin-challenge-series"
    class_name = "Super Late Model"

    stem = file_path.stem

    file_match = re.match(r"(\d{4})_(\d{2})_", stem)
    if file_match:
        source_season_year = file_match.group(1)
        source_race_number = str(int(file_match.group(2)))

    title_tag = soup.find("title")
    title_text = clean_text(title_tag.get_text()) if title_tag else stem
    event_name = title_text.replace(" - The Third Turn", "").strip()
    event_slug = slugify(event_name)

    held_match = re.search(
        r"Held on\s+([A-Za-z]+\s+\d{1,2})\s*,\s*(\d{4})\s+at\s+(.+?)\s+in\s+",
        page_text,
        re.IGNORECASE | re.DOTALL,
    )

    if held_match:
        race_date = f"{held_match.group(1)}, {held_match.group(2)}"
        track_name = clean_text(held_match.group(3))

    return {
        "source_series_slug": source_series_slug,
        "source_season_year": source_season_year,
        "source_race_number": source_race_number,
        "source_url": "",
        "race_date": race_date,
        "track_name": track_name,
        "track_slug": slugify(track_name) if track_name else "",
        "class_name": class_name,
        "event_slug": event_slug,
    }


def find_results_table(soup):
    result_div = soup.find("div", class_="resultdiv")
    if result_div:
        table = result_div.find("table")
        if table:
            return table

    for table in soup.find_all("table"):
        headers = [clean_text(th.get_text()).lower() for th in table.find_all("th")]
        if "fin" in headers and "driver" in headers:
            return table

    return None


def parse_results_rows(table):
    rows = []

    if not table:
        return rows

    trs = table.find_all("tr")
    current_section = "feature"

    for tr in trs:
        cells = tr.find_all(["th", "td"])
        cell_texts = [clean_text(cell.get_text()) for cell in cells]

        if not cell_texts:
            continue

        row_text = " ".join(cell_texts).lower()

        if "fin" in row_text and "driver" in row_text:
            continue

        if "did not qualify" in row_text:
            current_section = "dnq"
            continue

        if "did not start" in row_text:
            current_section = "dns"
            continue

        if current_section != "feature":
            continue

        ths = tr.find_all("th")
        tds = tr.find_all("td")

        if not ths or len(tds) < 3:
            continue

        finishing_position = clean_text(ths[0].get_text())

        if not finishing_position.isdigit():
            continue

        driver_cell = tds[2]
        driver_name = clean_driver_name(driver_cell.get_text())

        if not driver_name:
            continue

        rows.append({
            "finishing_position": finishing_position,
            "driver_name_raw": driver_name,
            "driver_name_clean": driver_name,
            "driver_slug_guess": slugify(driver_name),
        })

    return rows


def main():
    driver_lookup = load_driver_lookup()
    driver_aliases = load_driver_aliases()

    print(f"Loaded drivers from lookup: {len(driver_lookup)}")
    print(f"Loaded driver aliases: {len(driver_aliases)}")

    staging_rows = []
    missing_driver_map = {}

    html_files = sorted(INPUT_DIR.glob("*.html"))

    print(f"Found {len(html_files)} saved race-page files")

    for file_path in html_files:
        html = file_path.read_text(encoding="utf-8", errors="ignore")
        soup = BeautifulSoup(html, "html.parser")

        metadata = parse_metadata(soup, file_path)
        results_table = find_results_table(soup)
        result_rows = parse_results_rows(results_table)

        for result in result_rows:
            driver_key = result["driver_name_clean"].lower()
            driver_slug_key = result["driver_slug_guess"].lower()

            matched = driver_lookup.get(driver_key) or driver_lookup.get(driver_slug_key)

            if matched:
                match_status = "matched"
                matched_driver_id = matched["driver_id"]
                matched_driver_name = matched["driver_name"]
            else:
                alias_match = driver_aliases.get(driver_key) or driver_aliases.get(driver_slug_key)

                if alias_match:
                    match_status = "alias_matched"
                    matched_driver_id = alias_match["driver_id"]
                    matched_driver_name = alias_match["driver_name"]
                else:
                    match_status = "missing_driver"
                    matched_driver_id = ""
                    matched_driver_name = ""

                    missing_key = result["driver_name_clean"].lower()

                    if missing_key not in missing_driver_map:
                        missing_driver_map[missing_key] = {
                            "driver_name_raw": result["driver_name_raw"],
                            "driver_name_clean": result["driver_name_clean"],
                            "driver_slug_guess": result["driver_slug_guess"],
                            "first_seen_series": metadata["source_series_slug"],
                            "first_seen_year": metadata["source_season_year"],
                            "first_seen_track": metadata["track_name"],
                            "source_url": metadata["source_url"],
                            "action": "",
                            "resolved_driver_id": "",
                            "resolved_driver_name": "",
                            "notes": "",
                        }

            staging_rows.append({
                "source_series_slug": metadata["source_series_slug"],
                "source_season_year": metadata["source_season_year"],
                "source_race_number": metadata["source_race_number"],
                "source_url": metadata["source_url"],
                "race_date": metadata["race_date"],
                "track_name": metadata["track_name"],
                "track_slug": metadata["track_slug"],
                "class_name": metadata["class_name"],
                "event_slug": metadata["event_slug"],
                "finishing_position": result["finishing_position"],
                "driver_name_raw": result["driver_name_raw"],
                "driver_name_clean": result["driver_name_clean"],
                "driver_slug_guess": result["driver_slug_guess"],
                "matched_driver_id": matched_driver_id,
                "matched_driver_name": matched_driver_name,
                "match_status": match_status,
                "notes": "",
            })

    staging_fieldnames = [
        "source_series_slug",
        "source_season_year",
        "source_race_number",
        "source_url",
        "race_date",
        "track_name",
        "track_slug",
        "class_name",
        "event_slug",
        "finishing_position",
        "driver_name_raw",
        "driver_name_clean",
        "driver_slug_guess",
        "matched_driver_id",
        "matched_driver_name",
        "match_status",
        "notes",
    ]

    with open(SERIES_RESULTS_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=staging_fieldnames)
        writer.writeheader()
        writer.writerows(staging_rows)

    missing_fieldnames = [
        "driver_name_raw",
        "driver_name_clean",
        "driver_slug_guess",
        "first_seen_series",
        "first_seen_year",
        "first_seen_track",
        "source_url",
        "action",
        "resolved_driver_id",
        "resolved_driver_name",
        "notes",
    ]

    with open(MISSING_DRIVERS_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=missing_fieldnames)
        writer.writeheader()
        writer.writerows(missing_driver_map.values())

    print("")
    print("Done.")
    print(f"Staging rows: {len(staging_rows)}")
    print(f"Missing drivers: {len(missing_driver_map)}")
    print(f"Wrote: {SERIES_RESULTS_CSV}")
    print(f"Wrote: {MISSING_DRIVERS_CSV}")


if __name__ == "__main__":
    main()