#!/usr/bin/env python3
"""UMARM PaddleOCR runner for one Midwest Racing News issue.

Reads already-uploaded public Supabase page images, performs CPU OCR with
PP-OCRv5 mobile models, reconstructs newspaper columns, and emits searchable
text + standings-candidate JSON. It never writes to live standings.

For older issues with simple 1.jpg, 2.jpg... naming, set MRN_PAGE_COUNT.
For later issues with padded or non-contiguous names, set MRN_PAGES_JSON to a
JSON array such as ["001.jpg","002.jpg","020.jpg"].
"""
from __future__ import annotations

import json
import os
import re
import statistics
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps
from paddleocr import PaddleOCR

PROJECT_URL = "https://szvkleurojiwqkkztxtr.supabase.co"
BUCKET = "media"
PUBLICATION = os.environ.get("NEWSPAPER_PUBLICATION", "midwest-racing-news")
ISSUE_DATE = os.environ.get("MRN_ISSUE_DATE", "1959-06-03")
COLUMN_COUNT = int(os.environ.get("MRN_COLUMN_COUNT", "5"))
MAX_WIDTH = int(os.environ.get("MRN_MAX_WIDTH", "2400"))

pages_json = os.environ.get("MRN_PAGES_JSON", "").strip()
if pages_json:
    parsed_pages = json.loads(pages_json)
    if not isinstance(parsed_pages, list) or not parsed_pages:
        raise ValueError("MRN_PAGES_JSON must be a non-empty JSON array")
    PAGES = []
    for raw_page in parsed_pages:
        page = str(raw_page).strip()
        if not re.fullmatch(r"[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)", page, re.IGNORECASE):
            raise ValueError(f"Unsafe/unsupported page filename: {page!r}")
        PAGES.append(page)
else:
    requested_count = int(os.environ.get("MRN_PAGE_COUNT", "8"))
    PAGES = [f"{n}.jpg" for n in range(1, requested_count + 1)]

PAGE_COUNT = len(PAGES)
ROOT = Path(os.environ.get("MRN_OUTPUT_ROOT", f"audit/paddleocr-mrn/{ISSUE_DATE}"))
INPUT = ROOT / "_input"
PREPARED = ROOT / "_prepared"
JSON_DIR = ROOT / "json"
TEXT_DIR = ROOT / "text"
for folder in (INPUT, PREPARED, JSON_DIR, TEXT_DIR):
    folder.mkdir(parents=True, exist_ok=True)

USER_AGENT = "UMARM newspaper OCR research/1.3"
KEYWORD_RE = re.compile(
    r"\b(final\s+point(?:s|\s+standings)?|final\s+standings|point\s+standings|"
    r"season\s+standings|championship\s+points?|points?\s+leaders?|standings)\b",
    re.IGNORECASE,
)
FINAL_RE = re.compile(
    r"\b(final|season[- ]end|year[- ]end|final\s+points?|final\s+standings|champions?)\b",
    re.IGNORECASE,
)
CURRENT_RE = re.compile(
    r"\b(as\s+of|up\s+to\s+date|current|through\s+(?:may|june|july|august|september|october)|to\s+date)\b",
    re.IGNORECASE,
)


def public_url(page: str) -> str:
    return (
        f"{PROJECT_URL}/storage/v1/object/public/{BUCKET}/newspapers/"
        f"{PUBLICATION}/{ISSUE_DATE}/{page}"
    )


def download(url: str, target: Path) -> None:
    """Download a scan, retrying temporary storage/network failures."""
    for attempt in range(1, 4):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                target.write_bytes(response.read())
            return
        except urllib.error.HTTPError as exc:
            if exc.code < 500 and exc.code != 429:
                raise
            if attempt == 3:
                raise
            delay = attempt * 10
            print(
                f"Temporary scan download HTTP {exc.code}; retry {attempt}/3 in {delay}s: {url}",
                flush=True,
            )
            time.sleep(delay)
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == 3:
                raise
            delay = attempt * 10
            print(
                f"Temporary scan download error {exc!r}; retry {attempt}/3 in {delay}s: {url}",
                flush=True,
            )
            time.sleep(delay)


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


def unwrap_payload(res) -> dict:
    payload = res.json
    if not isinstance(payload, dict):
        try:
            payload = json.loads(payload)
        except Exception:
            return {"raw": str(payload)}
    if isinstance(payload.get("res"), dict):
        payload = payload["res"]
    return payload


def extract_lines(payloads: list[dict]) -> list[dict]:
    lines: list[dict] = []
    for payload in payloads:
        texts = payload.get("rec_texts") or []
        scores = payload.get("rec_scores") or []
        polys = payload.get("rec_polys") or payload.get("dt_polys") or []
        for idx, text in enumerate(texts):
            text = str(text).strip()
            if not text or idx >= len(polys):
                continue
            poly = polys[idx]
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
    cols: list[list[dict]] = [[] for _ in range(COLUMN_COUNT)]
    col_width = page_width / COLUMN_COUNT
    for src in lines:
        line = dict(src)
        idx = min(COLUMN_COUNT - 1, max(0, int(line["xc"] / col_width)))
        line["column"] = idx + 1
        cols[idx].append(line)
    for col in cols:
        col.sort(key=lambda x: (x["yc"], x["x0"]))
    return cols


def classification_hint(context: str) -> str:
    if CURRENT_RE.search(context):
        return "in_season_likely"
    if FINAL_RE.search(context):
        return "possible_final_needs_review"
    return "standings_candidate_needs_review"


def candidate_hits(columns: list[list[dict]], radius: int = 10) -> list[dict]:
    hits: list[dict] = []
    seen = set()
    for column_no, col in enumerate(columns, start=1):
        for i, line in enumerate(col):
            if not KEYWORD_RE.search(line["text"]):
                continue
            lo = max(0, i - radius)
            hi = min(len(col), i + radius + 1)
            context_lines = [x["text"] for x in col[lo:hi]]
            context = "\n".join(context_lines)
            key = (column_no, line["text"].lower(), round(line["yc"] / 40))
            if key in seen:
                continue
            seen.add(key)
            hits.append({
                "column": column_no,
                "anchor": line["text"],
                "anchor_y": round(line["yc"], 1),
                "classification_hint": classification_hint(context),
                "context": context_lines,
            })
    return hits


def cleanup_images() -> None:
    for folder in (INPUT, PREPARED):
        if folder.exists():
            for f in folder.glob("*"):
                f.unlink(missing_ok=True)
            try:
                folder.rmdir()
            except OSError:
                pass


def main() -> None:
    started = time.perf_counter()
    print(f"UMARM PaddleOCR: {PUBLICATION} {ISSUE_DATE} ({PAGE_COUNT} pages)", flush=True)
    print("Page files: " + ", ".join(PAGES), flush=True)

    prep_meta = {}
    for page in PAGES:
        source = INPUT / page
        download(public_url(page), source)
        prepared = PREPARED / f"{Path(page).stem}.png"
        prep_meta[page] = prepare_image(source, prepared)

    print("Model: PP-OCRv5_mobile_det + en_PP-OCRv5_mobile_rec / CPU", flush=True)
    ocr = PaddleOCR(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="en_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device="cpu",
    )

    combined_columns = []
    combined_raw = []
    summary_pages = []
    all_candidates = []

    for page in PAGES:
        page_started = time.perf_counter()
        prepared = PREPARED / f"{Path(page).stem}.png"
        results = list(ocr.predict(str(prepared)))
        payloads = [unwrap_payload(res) for res in results]

        for idx, payload in enumerate(payloads, start=1):
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
        for hit in hits:
            all_candidates.append({
                "publication": PUBLICATION,
                "issue_date": ISSUE_DATE,
                "page": page,
                **hit,
            })
        elapsed = round(time.perf_counter() - page_started, 2)
        page_summary = {
            "page": page,
            **prep_meta[page],
            "recognized_lines": len(lines),
            "characters": len(raw_text),
            "average_recognition_score": round(statistics.mean(scores), 4) if scores else None,
            "minimum_recognition_score": round(min(scores), 4) if scores else None,
            "standings_candidates": len(hits),
            "ocr_seconds": elapsed,
        }
        summary_pages.append(page_summary)
        print(
            f"{page}: lines={len(lines)} chars={len(raw_text)} "
            f"avg={page_summary['average_recognition_score']} "
            f"candidates={len(hits)} seconds={elapsed}", flush=True
        )

    (ROOT / "issue-ocr-raw.txt").write_text("\n\n".join(combined_raw) + "\n", encoding="utf-8")
    (ROOT / "issue-ocr-columns.txt").write_text("\n\n".join(combined_columns) + "\n", encoding="utf-8")
    (ROOT / "candidates.json").write_text(json.dumps(all_candidates, indent=2), encoding="utf-8")

    summary = {
        "publication": PUBLICATION,
        "issue_date": ISSUE_DATE,
        "engine": "PaddleOCR 3.5.0",
        "detection_model": "PP-OCRv5_mobile_det",
        "recognition_model": "en_PP-OCRv5_mobile_rec",
        "max_width": MAX_WIDTH,
        "column_count": COLUMN_COUNT,
        "page_count": PAGE_COUNT,
        "page_files": PAGES,
        "pages": summary_pages,
        "total_characters": sum(p["characters"] for p in summary_pages),
        "total_candidates": len(all_candidates),
        "total_ocr_seconds": round(sum(p["ocr_seconds"] for p in summary_pages), 2),
        "wall_seconds": round(time.perf_counter() - started, 2),
    }
    (ROOT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    cleanup_images()

    if summary["total_characters"] == 0:
        raise RuntimeError("OCR completed but extracted zero characters")

    print("COMPLETE " + json.dumps({
        "issue": ISSUE_DATE,
        "pages": PAGE_COUNT,
        "characters": summary["total_characters"],
        "candidates": summary["total_candidates"],
        "ocr_seconds": summary["total_ocr_seconds"],
    }), flush=True)


if __name__ == "__main__":
    main()
