from pathlib import Path
import argparse
import csv
import re

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers"


def clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def looks_like_highlight(line: str) -> bool:
    line = clean_line(line)
    if len(line) < 12 or len(line) > 95:
        return False

    bad_fragments = [
        "photo by",
        "staff photo",
        "united press",
        "per copy",
        "vol.",
        "copyright",
    ]

    lower = line.lower()
    if any(bad in lower for bad in bad_fragments):
        return False

    letters = sum(c.isalpha() for c in line)
    if letters < 8:
        return False

    return True


def extract_candidates(text: str, limit: int = 8):
    lines = [clean_line(line) for line in text.splitlines()]
    lines = [line for line in lines if looks_like_highlight(line)]

    seen = set()
    candidates = []

    for line in lines:
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        candidates.append(line)

        if len(candidates) >= limit:
            break

    return candidates


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publication", required=True)
    args = parser.parse_args()

    publication_dir = NEWSPAPER_ROOT / args.publication

    if not publication_dir.exists():
        raise FileNotFoundError(f"Publication folder not found: {publication_dir}")

    rows = []

    for issue_dir in sorted([p for p in publication_dir.iterdir() if p.is_dir()]):
        ocr_file = issue_dir / "ocr" / "front_cover.txt"

        if not ocr_file.exists():
            continue

        text = ocr_file.read_text(encoding="utf-8", errors="ignore")
        candidates = extract_candidates(text)

        rows.append({
            "publication": args.publication,
            "issue_slug": issue_dir.name,
            "candidate_1": candidates[0] if len(candidates) > 0 else "",
            "candidate_2": candidates[1] if len(candidates) > 1 else "",
            "candidate_3": candidates[2] if len(candidates) > 2 else "",
            "candidate_4": candidates[3] if len(candidates) > 3 else "",
            "candidate_5": candidates[4] if len(candidates) > 4 else "",
            "candidate_6": candidates[5] if len(candidates) > 5 else "",
            "approved_1": "",
            "approved_2": "",
            "approved_3": "",
            "approved_4": "",
            "approved_5": "",
        })

    output_path = ROOT / "scripts" / "newspapers" / f"{args.publication}_cover_highlight_review.csv"

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "publication",
                "issue_slug",
                "candidate_1",
                "candidate_2",
                "candidate_3",
                "candidate_4",
                "candidate_5",
                "candidate_6",
                "approved_1",
                "approved_2",
                "approved_3",
                "approved_4",
                "approved_5",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Created review file: {output_path}")
    print(f"Issues reviewed: {len(rows)}")


if __name__ == "__main__":
    main()