from pathlib import Path
import json
import csv
import re
import shutil
from datetime import date

ROOT = Path(__file__).resolve().parents[2]

INBOX = ROOT / "public" / "media" / "newspapers" / "_inbox"
OUTPUT = ROOT / "public" / "media" / "newspapers"
REVIEW_CSV = ROOT / "scripts" / "newspapers" / "newspaper_upload_review.csv"

PUBLICATION_NAME = "Midwest Racing News"
PUBLICATION_SLUG = "midwest-racing-news"


def parse_issue_folder(folder_name: str):
    # Expected pattern: 6-3-59-1 = June 3, 1959, Issue 1
    match = re.match(r"^(\d{1,2})-(\d{1,2})-(\d{2})-(\d+)$", folder_name)
    if not match:
        return None

    month, day, year2, issue_no = match.groups()
    year = int(year2)

    # Midwest Racing News range: 1959 through 2007
    full_year = 1900 + year if year >= 50 else 2000 + year

    issue_date = date(full_year, int(month), int(day))

    return {
        "date": issue_date.isoformat(),
        "year": full_year,
        "issue_number": int(issue_no),
        "slug": f"{full_year}-{int(month):02d}-{int(day):02d}-issue-{issue_no}",
        "title": f"{PUBLICATION_NAME} - {issue_date.strftime('%B')} {issue_date.day}, {issue_date.year}",
    }


def page_sort_key(path: Path):
    # Sort 1.jpg, 2.jpg, 10.jpg correctly
    match = re.search(r"\d+", path.stem)
    return int(match.group()) if match else 999999


def process_issue_folder(issue_folder: Path):
    parsed = parse_issue_folder(issue_folder.name)

    if not parsed:
        return {
            "source_folder": str(issue_folder),
            "status": "skipped - folder name did not match M-D-YY-Issue pattern",
        }

    image_files = sorted(
        [
            p for p in issue_folder.iterdir()
            if p.is_file() and p.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
        ],
        key=page_sort_key,
    )

    if not image_files:
        return {
            "source_folder": str(issue_folder),
            "status": "skipped - no image files found",
        }

    dest_dir = OUTPUT / PUBLICATION_SLUG / parsed["slug"]
    dest_dir.mkdir(parents=True, exist_ok=True)

    copied_pages = []

    for idx, src in enumerate(image_files, start=1):
        ext = src.suffix.lower()

        if idx == 1:
            dest_name = f"front_cover{ext}"
        elif idx == len(image_files):
            dest_name = f"back_cover{ext}"
        else:
            dest_name = f"page_{idx:03d}{ext}"

        dest = dest_dir / dest_name
        shutil.copy2(src, dest)
        copied_pages.append(dest_name)

    meta = {
    "slug": parsed["slug"],
    "publication": PUBLICATION_NAME,
    "publication_slug": PUBLICATION_SLUG,
    "title": parsed["title"],
    "date": parsed["date"],
    "year": parsed["year"],
    "issue_number": parsed["issue_number"],
    "type": "newspaper",

    "front_cover": copied_pages[0],
    "back_cover": copied_pages[-1],
    "page_count": len(copied_pages),
    "pages": copied_pages,

    "highlights": [],
    "featured_tracks": [],
    "featured_drivers": [],
    "tags": [],
    "notes": "",

    "ocr_complete": False,
    "search_text": ""
}

    with open(dest_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return {
        "publication": PUBLICATION_NAME,
        "source_folder": str(issue_folder),
        "output_folder": str(dest_dir),
        "title": parsed["title"],
        "date": parsed["date"],
        "year": parsed["year"],
        "issue_number": parsed["issue_number"],
        "slug": parsed["slug"],
        "page_count": len(copied_pages),
        "front_cover": copied_pages[0],
        "back_cover": copied_pages[-1],
        "status": "created",
    }


def main():
    source_root = INBOX / PUBLICATION_NAME
    rows = []

    if not source_root.exists():
        print(f"Missing inbox folder: {source_root}")
        return

    for issue_folder in sorted(source_root.iterdir()):
        if issue_folder.is_dir():
            rows.append(process_issue_folder(issue_folder))

    REVIEW_CSV.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "publication",
        "source_folder",
        "output_folder",
        "title",
        "date",
        "year",
        "issue_number",
        "slug",
        "page_count",
        "front_cover",
        "back_cover",
        "status",
    ]

    with open(REVIEW_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    print(f"Done. Processed {len(rows)} issue folders.")
    print(f"Review file: {REVIEW_CSV}")


if __name__ == "__main__":
    main()