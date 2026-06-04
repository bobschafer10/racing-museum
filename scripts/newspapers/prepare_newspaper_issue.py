from pathlib import Path
import argparse
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publication", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--description", default="")
    parser.add_argument("--featured", action="store_true")
    args = parser.parse_args()

    source_dir = Path(args.source)

    if not source_dir.exists():
        raise FileNotFoundError(f"Source folder not found: {source_dir}")

    images = sorted(
        [p for p in source_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS],
        key=lambda p: p.name.lower(),
    )

    if not images:
        raise ValueError("No image files found in source folder.")

    issue_dir = NEWSPAPER_ROOT / args.publication / args.date
    issue_dir.mkdir(parents=True, exist_ok=True)

    total = len(images)

    for index, image in enumerate(images, start=1):
        if index == 1:
            new_name = "front_cover.jpg"
        elif index == total:
            new_name = "back_cover.jpg"
        else:
            new_name = f"page_{index:03}.jpg"

        shutil.copy2(image, issue_dir / new_name)

    meta = {
        "title": args.title,
        "date": args.date,
        "year": int(args.date[:4]),
        "description": args.description
        or "Historic racing newspaper issue featuring race coverage, results, photos, standings, and regional reporting.",
        "featured": args.featured,
    }

    with open(issue_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    (issue_dir / "ocr").mkdir(exist_ok=True)

    print(f"Created newspaper issue folder:")
    print(issue_dir)
    print(f"Copied {total} image files.")


if __name__ == "__main__":
    main()