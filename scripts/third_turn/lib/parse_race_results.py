from pathlib import Path
import re
import sys

LIB_DIR = Path(__file__).resolve().parent
sys.path.append(str(LIB_DIR))

from parse_race_page import html_to_text, clean_lines


HEADER_NAMES = {
    "Fin",
    "St",
    "#",
    "Driver",
    "Sponsor",
    "Make",
    "Laps",
    "Led",
    "Status",
    "Pts",
    "Points"
}


def is_finishing_position(value: str) -> bool:
    return bool(re.fullmatch(r"\d+", value.strip()))


def is_car_number(value: str) -> bool:
    value = value.strip()
    return bool(re.fullmatch(r"[A-Za-z]?\d+[A-Za-z]?", value))


def looks_like_driver_name(value: str) -> bool:
    value = value.strip()

    if not value:
        return False

    if value in HEADER_NAMES:
        return False

    if is_finishing_position(value):
        return False

    if is_car_number(value):
        return False

    if value.lower() in {"running", "dns", "dnq", "dq", "crash", "engine"}:
        return False

    # Driver names usually contain letters and are not long notes
    return bool(re.search(r"[A-Za-z]", value)) and len(value) <= 60


def find_feature_results_lines(lines: list[str]) -> list[str]:
    try:
        start = lines.index("FEATURE RESULTS")
    except ValueError:
        return []

    # Stop before common next sections/navigation
    stop_markers = {
        "RACE RESULTS",
        "QUALIFYING RESULTS",
        "HEAT RESULTS",
        "B-MAIN RESULTS",
        "DNQ",
        "References",
        "Retrieved from"
    }

    results = []
    for line in lines[start + 1:]:
        if line in stop_markers:
            break
        results.append(line)

    return results


def parse_feature_results(lines: list[str]) -> list[dict]:
    block = find_feature_results_lines(lines)

    # Remove headers
    block = [x for x in block if x not in HEADER_NAMES]

    results = []
    i = 0

    while i < len(block):
        value = block[i].strip()

        if not is_finishing_position(value):
            i += 1
            continue

        finishing_position = value

        # Try to detect table shape:
        # Shape A: Fin, Driver
        #   1, Mitch McGrath
        #
        # Shape B: Fin, St, #, Driver
        #   1, 2, 54, Benji LaCrosse

        starting_position = ""
        car_number = ""
        driver_name = ""

        lookahead = block[i + 1:i + 8]

        # If next two values look numeric/car number and third looks like driver
        if len(lookahead) >= 3 and is_finishing_position(lookahead[0]) and is_car_number(lookahead[1]) and looks_like_driver_name(lookahead[2]):
            starting_position = lookahead[0]
            car_number = lookahead[1]
            driver_name = lookahead[2]
            i += 4

        # If next value looks like driver
        elif len(lookahead) >= 1 and looks_like_driver_name(lookahead[0]):
            driver_name = lookahead[0]
            i += 2

        else:
            i += 1
            continue

        results.append({
            "finishing_position": finishing_position,
            "starting_position": starting_position,
            "car_number": car_number,
            "driver_name": driver_name,
            "sponsor": "",
            "make": "",
            "laps": "",
            "led": "",
            "status": "",
            "points": "",
            "result_section": "Feature Results"
        })

    return results


def parse_race_results(race_page_path: Path) -> list[dict]:
    html = race_page_path.read_text(encoding="utf-8", errors="replace")
    text = html_to_text(html)
    lines = clean_lines(text)

    return parse_feature_results(lines)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[3]
    race_dir = root / "scripts" / "third_turn" / "cache" / "badger_modified_tour" / "races"

    for path in sorted(race_dir.glob("*.html")):
        results = parse_race_results(path)

        print("\n" + "=" * 80)
        print(path.name)
        print(f"Rows parsed: {len(results)}")

        for row in results[:10]:
            print(row)