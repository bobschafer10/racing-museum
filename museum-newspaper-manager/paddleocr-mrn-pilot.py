#!/usr/bin/env python3
"""PaddleOCR pilot for one Midwest Racing News issue.

This is intentionally non-destructive: it downloads the existing public Supabase
page images and writes OCR output only to a local audit folder for review.
"""
from __future__ import annotations

import json
import re
import statistics
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps
from paddleocr import PaddleOCR

PROJECT_URL = "https://szvkleurojiwqkkztxtr.supabase.co"
BUCKET = "media"
PUBLICATION = "midwest-racing-news"
ISSUE_DATE = "1959-06-03"
PAGES = [f"{n}.jpg" for n in range(1, 9)]

ROOT = Path("audit/paddleocr-mrn-1959-06-03")
INPUT = ROOT / "input"
PREPARED = ROOT / "prepared"
JSON_DIR = ROOT / "json"
TEXT_DIR = ROOT / "text"
for folder in (INPUT, PREPARED, JSON_DIR, TEXT_DIR):
    folder.mkdir(parents=True, exist_ok=True)

USER_AGENT = "UMARM newspaper OCR research pilot/1.0"
KEYWORD_RE = re.compile(
    r"\b(final\s+point(?:s|\s+standings)?|final\s+standings|point\s+standings|"
    r"season\s+standings|championship\s+points?|champion(?:ship)?|standings)\b",
    re.IGNORECASE,
)


def public_url(page: str) -> str:
    return (
        f"{PROJECT_URL}/storage/v1/object/public/{BUCKET}/newspapers/"
        f"{PUBLICATION}/{ISSUE_DATE}/{page}"
    )


def download(url: str, target: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as response:
        target.write_bytes(response.read())


def prepare_image(source: Path, target: Path) -> dict:
    """Normalize contrast and cap width to keep CPU/RAM reasonable."""
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        original_size = img.size
        img = ImageOps.grayscale(img)
        img = ImageOps.autocontrast(img, cutoff=0.5)
        max_width = 2800
        if img.width > max_width:
            height = round(img.height * max_width / img.width)
            img = img.resize((max_width, height), Image.Resampling.LANCZOS)
        prepared_size = img.size
        img.save(target, format="PNG", optimize=True)
    return {"original_size": original_size, "prepared_size": prepared_size}


def find_values(obj, key: str):
    found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                found.append(v)
            found.extend(find_values(v, key))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(find_values(item, key))
    return found


def flatten_text(payloads: list[dict]) -> tuple[list[str], list[float]]:
    texts: list[str] = []
    scores: list[float] = []
    for payload in payloads:
        for value in find_values(payload, "rec_texts"):
            if isinstance(value, list):
                texts.extend(str(x).strip() for x in value if str(x).strip())
        for value in find_values(payload, "rec_scores"):
            if isinstance(value, list):
                for x in value:
                    try:
                        scores.append(float(x))
                    except (TypeError, ValueError):
                        pass
    return texts, scores


def context_hits(lines: list[str], radius: int = 2) -> list[dict]:
    hits = []
    for i, line in enumerate(lines):
        if KEYWORD_RE.search(line):
            lo = max(0, i - radius)
            hi = min(len(lines), i + radius + 1)
            hits.append({"line": i + 1, "context": lines[lo:hi]})
    return hits


def main() -> None:
    print(f"PaddleOCR pilot: {PUBLICATION} {ISSUE_DATE} ({len(PAGES)} pages)")

    for page in PAGES:
        source = INPUT / page
        if not source.exists():
            url = public_url(page)
            print(f"Downloading {page}: {url}")
            download(url, source)

    prep_meta = {}
    for page in PAGES:
        prepared = PREPARED / f"{Path(page).stem}.png"
        prep_meta[page] = prepare_image(INPUT / page, prepared)
        print(f"Prepared {page}: {prep_meta[page]}")

    print("Starting PaddleOCR model (English, CPU)...")
    ocr = PaddleOCR(
        lang="en",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device="cpu",
    )

    combined_blocks = []
    summary_pages = []

    for page in PAGES:
        prepared = PREPARED / f"{Path(page).stem}.png"
        print(f"OCR {page} ...")
        results = list(ocr.predict(str(prepared)))
        payloads = []
        for idx, res in enumerate(results, start=1):
            json_path = JSON_DIR / f"{Path(page).stem}-{idx}.json"
            res.save_to_json(str(json_path))
            payload = res.json
            if not isinstance(payload, dict):
                try:
                    payload = json.loads(payload)
                except Exception:
                    payload = {"raw": str(payload)}
            payloads.append(payload)

        lines, scores = flatten_text(payloads)
        page_text = "\n".join(lines).strip()
        (TEXT_DIR / f"{Path(page).stem}.txt").write_text(page_text + "\n", encoding="utf-8")
        combined_blocks.append(f"--- {page} ---\n{page_text}")

        hits = context_hits(lines)
        page_summary = {
            "page": page,
            **prep_meta[page],
            "recognized_lines": len(lines),
            "characters": len(page_text),
            "average_recognition_score": round(statistics.mean(scores), 4) if scores else None,
            "minimum_recognition_score": round(min(scores), 4) if scores else None,
            "keyword_hits": hits,
        }
        summary_pages.append(page_summary)
        print(
            f"{page}: lines={len(lines)} chars={len(page_text)} "
            f"avg_score={page_summary['average_recognition_score']} hits={len(hits)}"
        )

    combined = "\n\n".join(combined_blocks) + "\n"
    (ROOT / "issue-ocr.txt").write_text(combined, encoding="utf-8")
    summary = {
        "publication": PUBLICATION,
        "issue_date": ISSUE_DATE,
        "engine": "PaddleOCR",
        "mode": "general OCR / English / CPU",
        "pages": summary_pages,
        "total_characters": sum(p["characters"] for p in summary_pages),
        "total_keyword_hits": sum(len(p["keyword_hits"]) for p in summary_pages),
    }
    (ROOT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\nPILOT COMPLETE")
    print(json.dumps({
        "pages": len(summary_pages),
        "total_characters": summary["total_characters"],
        "keyword_hits": summary["total_keyword_hits"],
    }, indent=2))


if __name__ == "__main__":
    main()
