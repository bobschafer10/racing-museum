from pathlib import Path
import argparse
import subprocess

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers"

COVER_FILES = ["front_cover.jpg", "back_cover.jpg"]


def run_tesseract(image_path: Path, output_txt: Path):
    output_base = output_txt.with_suffix("")

    subprocess.run(
    [r"C:\Program Files\Tesseract-OCR\tesseract.exe", str(image_path), str(output_base)],
    check=True,
)


def process_issue(issue_dir: Path):
    ocr_dir = issue_dir / "ocr"
    ocr_dir.mkdir(exist_ok=True)

    for cover_file in COVER_FILES:
        image_path = issue_dir / cover_file

        if not image_path.exists():
            continue

        output_txt = ocr_dir / cover_file.replace(".jpg", ".txt")

        if output_txt.exists():
            print(f"SKIPPED existing OCR: {output_txt}")
            continue

        print(f"OCR: {image_path}")
        run_tesseract(image_path, output_txt)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publication", required=True)
    args = parser.parse_args()

    publication_dir = NEWSPAPER_ROOT / args.publication

    if not publication_dir.exists():
        raise FileNotFoundError(f"Publication folder not found: {publication_dir}")

    issue_dirs = sorted([p for p in publication_dir.iterdir() if p.is_dir()])

    for issue_dir in issue_dirs:
        process_issue(issue_dir)

    print("")
    print(f"Finished OCR cover pass for {len(issue_dirs)} issue folders.")


if __name__ == "__main__":
    main()