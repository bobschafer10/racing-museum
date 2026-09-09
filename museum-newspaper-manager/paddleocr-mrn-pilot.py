#!/usr/bin/env python3
"""Optimized PaddleOCR pilot for one Midwest Racing News issue.

Non-destructive: reads existing public Supabase newspaper page images and writes
only local audit outputs. Uses lightweight PP-OCRv5 detection + English mobile
recognition and reconstructs the five newspaper columns from OCR coordinates.
"""
from __future__ import annotations

import json
import re
import statistics
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps
from paddleocr import PaddleOCR

PROJECT_URL = "https://szvkleurojiwqkkztxtr.supabase.co"
BUCKET = "media"
PUBLICATION = "midwest-racing-news"
ISSUE_DATE = "1959-06-03"
PAGES = [f"{n}.jpg" for n in range(1, 9)]
COLUMN_COUNT = 5
MAX_WIDTH = 2400

ROOT = Path("audit/paddleocr-mrn-1959-06-03-mobile")
INPUT = ROOT / "_input"
PREPARED = ROOT / "_prepared"
JSON_DIR = ROOT / "json"
TEXT_DIR = ROOT / "text"
for folder in (INPUT, PREPARED, JSON_DIR, TEXT_DIR):
    folder.mkdir(parents=True, exist_ok=True)

USER_AGENT = "UMARM newspaper OCR research/1.1"
KEYWORD_RE = re.compile(
    r"\b(final\s+point(?:s|\s+standings)?|final\s+standings|point\s+standings|"
    r"season\s+standings|championship\s+points?|points?\s+leaders?|standings)\b",
    re.IGNORECASE,
)
FINAL_RE = re.compile(r"\b(final|season[- ]end|year[- ]end|champions?|championship)\b", re.I)
CURRENT_RE = re.compile(r"\b(as\s+of|up\s+to\s+date|current|through\s+\w+|to\s+date)\b", re.I)


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
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        original_size = img.size
        img = ImageOps.grayscale(img)
        img = ImageOps.autocontrast(img, cutoff=0.5)
        if img.width > MAX_WIDTH:
            height = round(img.height * MAX_WIDTH / img.width)
            img = img.resize((MAX_WIDTH, height), Image.Resampling.LANCZOS)
        prepared_size = img.size
        img.save(target, format="PNG", optimize=False)
    return {"original_size": original_size, "prepared_size": prepared_size}


def result_payload(res) -> dict:
    payload = res.json
    if isinstance(payload, dict):
        return payload
    try:
        return json.loads(payload)
    except Exception:
        return {"raw": str(payload)}


def extract_lines(payloads: list[dict]) -> list[dict]:
    lines: list[dict] = []
    for payload in payloads:
        texts = payload.get("rec_texts") or []
        scores = payload.get("rec_scores") or []
        polys = payload.get("rec_polys") or payload.get("dt_polys") or []
        for idx, text in enumerate(texts):
            text = str(text).strip()
            if not text:
                continue
            poly = polys[idx] if idx < len(polys) else None
            if not poly:
                continue
            xs = [float(p[0]) for p in poly]
            ys = [float(p[1]) for p in poly]
            score = None
            if idx < len(scores):
                try:
                    score = float(scores[idx])
                except (TypeError, ValueError):
                    pass
            lines.append({
                "text": text,
                "score": score,
                "x0": min(xs), "x1": max(xs),
                "y0": min(ys), "y1": max(ys),
                "xc": sum(xs) / len(xs), "yc": sum(ys) / len(ys),
            })
    return lines


def assign_columns(lines: list[dict], page_width: int) -> list[list[dict]]:
    """Reconstruct MRN's five newspaper columns using line center coordinates."""
    cols: list[list[dict]] = [[] for _ in range(COLUMN_COUNT)]
    col_width = page_width / COLUMN_COUNT
    for line in lines:
        idx = min(COLUMN_COUNT - 1, max(0, int(line["xc"] / col_width)))
        line = dict(line)
        line["column"] = idx + 1
        cols[idx].append(line)
    for col in cols:
        col.sort(key=lambda x: (x["yc"], x["x0"]))
    return cols


def classify_context(context: str) -> str:
    if CURRENT_RE.search(context):
        return "in_season_likely"
    if FINAL_RE.search(context):
        return "possible_final_needs_review"
    return "standings_candidate_needs_review"


def candidate_hits(columns: list[list[dict]], radius: int = 8) -> list[dict]:
    hits: list[dict] = []
    seen = set()
    for ci, col in enumerate(columns, start=1):
        for i, line in enumerate(col):
            if not KEYWORD_RE.search(line["text"]):
                continue
            lo = max(0, i - radius)
            hi = min(len(col), i + radius + 1)
            context_lines = [x["text"] for x in col[lo:hi]]
            context = "\n".join(context_lines)
            key = (ci, line["text"].lower(), round(line["yc"] / 50))
            if key in seen:
                continue
            seen.add(key)
            hits.append({
                "column": ci,
                "anchor": line["text"],
                "anchor_y": round(line["yc"], 1),
                "classification_hint": classify_context(context),
                "context": context_lines,
            })
    return hits


def main() -> None:
    started = time.perf_counter()
    print(f"PaddleOCR optimized pilot: {PUBLICATION} {ISSUE_DATE} ({len(PAGES)} pages)")

    for page in PAGES:
        source = INPUT / page
        if not source.exists():
            download(public_url(page), source)

    prep_meta = {}
    for page in PAGES:
        prepared = PREPARED / f"{Path(page).stem}.png"
        prep_meta[page] = prepare_image(INPUT / page, prepared)

    print("Starting PP-OCRv5 mobile detector + English mobile recognizer (CPU)...")
    ocr = PaddleOCR(
        lang="en",
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="en_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device="cpu",
    )

    combined_raw = []
    combined_columns = []
    summary_pages = []

    for page in PAGES:
        page_started = time.perf_counter()
        prepared = PREPARED / f"{Path(page).stem}.png"
        print(f"OCR {page} ...", flush=True)
        results = list(ocr.predict(str(prepared)))
        payloads = []
        for idx, res in enumerate(results, start=1):
            payload = result_payload(res)
            payloads.append(payload)
            # Keep compact OCR geometry for reproducibility, not the full source images.
            slim = {
                "rec_texts": payload.get("rec_texts", []),
                "rec_scores": payload.get("rec_scores", []),
                "rec_polys": payload.get("rec_polys", []),
            }
            (JSON_DIR / f"{Path(page).stem}-{idx}.json").write_text(
                json.dumps(slim, ensure_ascii=False), encoding="utf-8"
            )

        lines = extract_lines(payloads)
        page_width = prep_meta[page]["prepared_size"][0]
        columns = assign_columns(lines, page_width)
        raw_lines = sorted(lines, key=lambda x: (x["yc"], x["x0"]))
        raw_text = "\n".join(x["text"] for x in raw_lines)
        column_text = "\n\n".join(
            f"=== COLUMN {i} ===\n" + "\n".join(x["text"] for x in col)
            for i, col in enumerate(columns, start=1)
        )
        (TEXT_DIR / f"{Path(page).stem}-raw.txt").write_text(raw_text + "\n", encoding="utf-8")
        (TEXT_DIR / f"{Path(page).stem}-columns.txt").write_text(column_text + "\n", encoding="utf-8")
        combined_raw.append(f"--- {page} RAW ---\n{raw_text}")
        combined_columns.append(f"--- {page} COLUMNS ---\n{column_text}")

        scores = [x["score"] for x in lines if x["score"] is not None]
        hits = candidate_hits(columns)
        elapsed = round(time.perf_counter() - page_started, 2)
        summary_pages.append({
            "page": page,
            **prep_meta[page],
            "recognized_lines": len(lines),
            "characters": len(raw_text),
            "average_recognition_score": round(statistics.mean(scores), 4) if scores else None,
            "minimum_recognition_score": round(min(scores), 4) if scores else None,
            "standings_candidates": hits,
            "ocr_seconds": elapsed,
        })
        print(
            f"{page}: lines={len(lines)} chars={len(raw_text)} "
            f"avg={summary_pages[-1]['average_recognition_score']} "
            f"candidates={len(hits)} seconds={elapsed}", flush=True
        )

    (ROOT / "issue-ocr-raw.txt").write_text("\n\n".join(combined_raw) + "\n", encoding="utf-8")
    (ROOT / "issue-ocr-columns.txt").write_text("\n\n".join(combined_columns) + "\n", encoding="utf-8")
    summary = {
        "publication": PUBLICATION,
        "issue_date": ISSUE_DATE,
        "engine": "PaddleOCR 3.5.0",
        "detection_model": "PP-OCRv5_mobile_det",
        "recognition_model": "en_PP-OCRv5_mobile_rec",
        "max_width": MAX_WIDTH,
        "column_count": COLUMN_COUNT,
        "pages": summary_pages,
        "total_characters": sum(p["characters"] for p in summary_pages),
        "total_candidates": sum(len(p["standings_candidates"]) for p in summary_pages),
        "total_ocr_seconds": round(sum(p["ocr_seconds"] for p in summary_pages), 2),
        "wall_seconds": round(time.perf_counter() - started, 2),
    }
    (ROOT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    # Do not include downloaded/prepared images in the artifact.
    for folder in (INPUT, PREPARED):
        for f in folder.glob("*"):
            f.unlink(missing_ok=True)
        folder.rmdir()

    print("\nOPTIMIZED PILOT COMPLETE")
    print(json.dumps({
        "pages": len(summary_pages),
        "total_characters": summary["total_characters"],
        "standings_candidates": summary["total_candidates"],
        "ocr_seconds": summary["total_ocr_seconds"],
        "wall_seconds": summary["wall_seconds"],
    }, indent=2))


if __name__ == "__main__":
    main()
