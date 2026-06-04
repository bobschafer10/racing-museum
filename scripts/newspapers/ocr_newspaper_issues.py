from pathlib import Path
import subprocess
import json
import csv

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers" / "midwest-racing-news"
REVIEW_CSV = ROOT / "scripts" / "newspapers" / "newspaper_ocr_review.csv"

TESSERACT_EXE = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def run_ocr(image_path: Path, output_txt_path: Path):
    output_base = output_txt_path.with_suffix("")

    command = [
        TESSERACT_EXE,
        str(image_path),
        str(output_base),
        "-l",
        "eng",
        "--psm",
        "11",
    ]

    result = subprocess.run(command, capture_output=True, text=True)

    return result.returncode, result.stderr.strip()


def main():
    rows = []

    for issue_dir in sorted(NEWSPAPER_ROOT.iterdir()):
        if not issue_dir.is_dir():
            continue

        meta_path = issue_dir / "meta.json"
        if not meta_path.exists():
            continue

        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        pages = meta.get("pages", [])
        ocr_dir = issue_dir / "ocr"
        ocr_dir.mkdir(exist_ok=True)

        success_count = 0

        for page in pages:
            image_path = issue_dir / page
            if not image_path.exists():
                rows.append({
                    "issue": issue_dir.name,
                    "page": page,
                    "status": "missing image",
                    "error": "",
                })
                continue

            txt_path = ocr_dir / f"{Path(page).stem}.txt"
            code, err = run_ocr(image_path, txt_path)

            if code == 0 and txt_path.exists():
                success_count += 1
                status = "ocr created"
            else:
                status = "ocr failed"

            rows.append({
                "issue": issue_dir.name,
                "page": page,
                "status": status,
                "error": err,
            })

        print(f"{issue_dir.name}: OCR created for {success_count}/{len(pages)} pages")

    with open(REVIEW_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["issue", "page", "status", "error"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Done. OCR review file: {REVIEW_CSV}")


if __name__ == "__main__":
    main()