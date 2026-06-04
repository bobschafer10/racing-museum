from pathlib import Path
import argparse
import json
import re
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def extract_date_from_folder(folder_name: str) -> str:
    match = re.search(r"(19\d{2}|20\d{2})-(\d{2})-(\d{2})", folder_name)
    if match:
        return match.group(0)

    match = re.search(r"(\d{1,2})-(\d{1,2})-(\d{2})", folder_name)
    if match:
        return f"{1900 + int(match.group(3)):04d}-{int(match.group(1)):02d}-{int(match.group(2)):02d}"

    raise ValueError(f"Could not find date in folder name: {folder_name}")


def issue_title_from_date(date_text: str) -> str:
    dt = datetime.strptime(date_text, "%Y-%m-%d")
    return dt.strftime("%B %#d, %Y Issue")


def numeric_sort_key(path: Path):
    nums = re.findall(r"\d+", path.stem)
    return [int(n) for n in nums] if nums else [999999]


def prepare_issue(source_dir: Path, publication: str):
    issue_date = extract_date_from_folder(source_dir.name)

    issue_dir = NEWSPAPER_ROOT / publication / issue_date
    issue_dir.mkdir(parents=True, exist_ok=True)

    images = sorted(
        [p for p in source_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS],
        key=numeric_sort_key,
    )

    if not images:
        print(f"SKIPPED - no images found: {source_dir}")
        return

    total = len(images)

    for index, image in enumerate(images, start=1):
        if index == 1:
            new_name = "front_cover.jpg"
        elif index == total:
            new_name = "back_cover.jpg"
        else:
            new_name = f"page_{index:03}.jpg"

        shutil.copy2(image, issue_dir / new_name)

    publication_title = publication.replace("-", " ").title()

    meta = {
        "title": issue_title_from_date(issue_date),
        "date": issue_date,
        "year": int(issue_date[:4]),
        "description": f"Historic {publication_title} issue featuring race coverage, results, photos, standings, and regional reporting.",
        "featured": False,
        "topHighlights": [],
        "highlights": [],
        "relatedTracks": [],
        "relatedDrivers": [],
    }

    with open(issue_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    (issue_dir / "ocr").mkdir(exist_ok=True)

    print(f"CREATED: {issue_dir} ({total} images)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publication", required=True)
    parser.add_argument("--source", required=True)
    args = parser.parse_args()

    source_root = Path(args.source)

    if not source_root.exists():
        raise FileNotFoundError(f"Source folder not found: {source_root}")

    folders = [p for p in source_root.iterdir() if p.is_dir()]

    if not folders:
        raise ValueError(f"No issue folders found in: {source_root}")

    folders = sorted(folders, key=lambda p: extract_date_from_folder(p.name))

    for folder in folders:
        prepare_issue(folder, args.publication)

    print("")
    print(f"Finished batch: {len(folders)} issue folders processed.")


if __name__ == "__main__":
    main()