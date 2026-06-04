from pathlib import Path
import json
import csv
import re

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers" / "midwest-racing-news"
REVIEW_CSV = ROOT / "scripts" / "newspapers" / "candidate_highlights_review.csv"


def clean_line(line):
    return re.sub(r"\s+", " ", line).strip()


def score_candidate(line):
    upper = line.upper()
    score = 0

    good_words = [
        "WINS", "WIN", "FEATURE", "SPEEDWAY", "RACEWAY",
        "RECORD", "OPENER", "CHAMPION", "STANDINGS",
        "RESULTS", "HONORS", "VICTOR", "TAKES", "TOPS"
    ]

    bad_words = [
        "PAGE", "PHONE", "CALL", "SECONDS", "TIRES",
        "FUEL", "LAP", "CLASSIFIED", "ADVERTISEMENT"
    ]

    for word in good_words:
        if word in upper:
            score += 3

    for word in bad_words:
        if word in upper:
            score -= 4

    letter_count = len(re.findall(r"[A-Za-z]", line))
    symbol_count = len(re.findall(r"[^A-Za-z0-9\s'.,&-]", line))

    if letter_count >= 12:
        score += 2

    if symbol_count > 5:
        score -= 5

    if upper.count("EE") >= 2:
        score -= 5

    if len(line) < 10 or len(line) > 90:
        score -= 4

    return score


def main():
    rows = []

    for issue_dir in sorted(NEWSPAPER_ROOT.iterdir()):
        if not issue_dir.is_dir():
            continue

        meta_path = issue_dir / "meta.json"
        ocr_dir = issue_dir / "ocr"

        if not meta_path.exists() or not ocr_dir.exists():
            continue

        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        seen = set()

        for txt_file in sorted(ocr_dir.glob("*.txt")):
            text = txt_file.read_text(encoding="utf-8", errors="ignore")

            for raw_line in text.splitlines():
                line = clean_line(raw_line)

                if not line or line in seen:
                    continue

                seen.add(line)

                score = score_candidate(line)

                if score >= 3:
                    rows.append({
                        "approve": "",
                        "issue_slug": meta.get("slug", issue_dir.name),
                        "issue_title": meta.get("title", ""),
                        "date": meta.get("date", ""),
                        "page": txt_file.stem,
                        "score": score,
                        "candidate_highlight": line,
                    })

    rows.sort(key=lambda r: (r["issue_slug"], -int(r["score"])))

    REVIEW_CSV.parent.mkdir(parents=True, exist_ok=True)

    with open(REVIEW_CSV, "w", newline="", encoding="utf-8") as f:
      writer = csv.DictWriter(f, fieldnames=[
          "approve",
          "issue_slug",
          "issue_title",
          "date",
          "page",
          "score",
          "candidate_highlight",
      ])
      writer.writeheader()
      writer.writerows(rows)

    print(f"Done. Created highlight review file with {len(rows)} candidates.")
    print(f"Review file: {REVIEW_CSV}")


if __name__ == "__main__":
    main()