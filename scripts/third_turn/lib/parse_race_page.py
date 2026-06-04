from pathlib import Path
from html.parser import HTMLParser
import re


MONTHS = {
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
}


class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []

    def handle_data(self, data):
        cleaned = data.strip()
        if cleaned:
            self.text_parts.append(cleaned)

    def get_text(self) -> str:
        return "\n".join(self.text_parts)


def html_to_text(html: str) -> str:
    parser = TextParser()
    parser.feed(html)
    return parser.get_text()


def clean_lines(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    # Remove obvious JavaScript/config noise
    cleaned = []
    for line in lines:
        if line.startswith("document.documentElement"):
            continue
        if line.startswith("RLCONF="):
            continue
        if line.startswith("RLSTATE="):
            continue
        if line.startswith("(RLQ="):
            continue
        if line.startswith("#mw-"):
            continue
        cleaned.append(line)

    return cleaned


def extract_title(lines: list[str]) -> str:
    for line in lines:
        if " - The Third Turn" in line:
            return line.replace(" - The Third Turn", "").strip()

    for line in lines:
        if line.startswith("Badger Mod Tour:") or "Modified Nationals:" in line or "Clash at the Creek" in line:
            return line.strip()

    return ""


def extract_date(lines: list[str]) -> str:
    for i, line in enumerate(lines):
        if line == "Held on" and i + 3 < len(lines):
            month_day = lines[i + 1].replace(",", "").strip()
            year = lines[i + 3].strip()

            if any(month_day.startswith(month) for month in MONTHS) and re.fullmatch(r"\d{4}", year):
                return f"{month_day}, {year}"

    return ""


def extract_track_name(lines: list[str]) -> str:
    for i, line in enumerate(lines):
        if line == "at" and i + 1 < len(lines):
            candidate = lines[i + 1].strip()

            # Avoid grabbing navigation text or page title
            bad_candidates = {
                "Races & Series",
                "All Series",
                "Upcoming Races",
                "Drivers",
                "Tracks",
                "Tools"
            }

            if candidate not in bad_candidates and len(candidate) > 2:
                return candidate

    return ""


def extract_location(lines: list[str]) -> str:
    for i, line in enumerate(lines):
        if line.startswith("in ") and i > 0:
            return line.replace("in ", "", 1).strip()

    return ""


def extract_winner_name(lines: list[str]) -> str:
    try:
        start = lines.index("FEATURE RESULTS")
    except ValueError:
        return ""

    # Find the first finishing position row after FEATURE RESULTS.
    # Third Turn tables can appear as:
    # 2012: Fin, Driver
    #   1
    #   Mitch McGrath
    #
    # 2013: Fin, St, #, Driver
    #   1
    #   2
    #   54
    #   Benji LaCrosse

    for i in range(start, min(start + 80, len(lines))):
        if lines[i] == "1":
            candidates = lines[i + 1:i + 6]

            for possible in candidates:
                possible = possible.strip()

                if not possible:
                    continue

                # skip numbers, car numbers, statuses, and headers
                if possible in {"Fin", "St", "#", "Driver", "Sponsor", "Make", "Laps", "Led", "Status", "Pts"}:
                    continue

                if re.fullmatch(r"[A-Za-z]?\d+[A-Za-z]?", possible):
                    continue

                if possible.lower() in {"running", "dns", "dnq", "dq"}:
                    continue

                return possible

    return ""


def parse_race_page(race_page_path: Path, source_url: str = "") -> dict:
    html = race_page_path.read_text(encoding="utf-8", errors="replace")
    text = html_to_text(html)
    lines = clean_lines(text)

    title = extract_title(lines)
    race_date = extract_date(lines)
    track_name = extract_track_name(lines)
    location = extract_location(lines)
    winner_name = extract_winner_name(lines)

    return {
        "race_file": race_page_path.name,
        "race_title": title,
        "race_date": race_date,
        "track_name": track_name,
        "location": location,
        "winner_name": winner_name,
        "source_url": source_url
    }


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[3]
    race_dir = root / "scripts" / "third_turn" / "cache" / "badger_modified_tour" / "races"

    for path in sorted(race_dir.glob("*.html")):
        data = parse_race_page(path)
        print("\n" + "=" * 80)
        print(path.name)
        for key, value in data.items():
            print(f"{key}: {value}")