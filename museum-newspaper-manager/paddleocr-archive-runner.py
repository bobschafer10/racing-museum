#!/usr/bin/env python3
"""UMARM PaddleOCR runner for one stored yearbook or program.

Reads an explicit list of already-uploaded Supabase page images, performs CPU
OCR with PP-OCRv5 mobile models, reconstructs a configurable number of reading
columns, and emits one payload that the authenticated archive-ocr-import Edge
Function can ingest. Candidate extraction is review-only; it never writes live
race results or standings.
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
from urllib.parse import quote

from PIL import Image, ImageFile, ImageOps
from paddleocr import PaddleOCR

ImageFile.LOAD_TRUNCATED_IMAGES = True

PROJECT_URL = "https://szvkleurojiwqkkztxtr.supabase.co"
BUCKET = "media"
DOCUMENT_TYPE = os.environ.get("ARCHIVE_DOCUMENT_TYPE", "yearbook").strip().lower()
DOCUMENT_SLUG = os.environ.get("ARCHIVE_DOCUMENT_SLUG", "").strip()
DOCUMENT_TITLE = os.environ.get("ARCHIVE_DOCUMENT_TITLE", DOCUMENT_SLUG.replace("-", " ")).strip()
PUBLICATION_YEAR = int(os.environ.get("ARCHIVE_PUBLICATION_YEAR", "0"))
COLUMN_COUNT = int(os.environ.get("ARCHIVE_COLUMN_COUNT", "2"))
MAX_WIDTH = int(os.environ.get("ARCHIVE_MAX_WIDTH", "2400"))
ROOT = Path(os.environ.get("ARCHIVE_OUTPUT_ROOT", f"audit/paddleocr-archive/{DOCUMENT_SLUG}"))

SAFE_PAGE_RE = re.compile(r"[A-Za-z0-9._ -]+\.(?:jpg|jpeg|png|webp)", re.IGNORECASE)
SAFE_SLUG_RE = re.compile(r"[a-z0-9][a-z0-9-]{2,160}")
KEYWORD_RE = re.compile(
    r"\b(final\s+point(?:s|\s+standings)?|final\s+standings|point\s+standings|"
    r"season\s+standings|champions?|championship\s+points?|feature\s+winners?|"
    r"race\s+results?|rookie\s+of\s+the\s+year|track\s+records?|season\s+recap|top\s+ten)\b",
    re.IGNORECASE,
)
FINAL_RE = re.compile(
    r"\b(final|season[- ]end|year[- ]end|champions?|yearbook|annual)\b",
    re.IGNORECASE,
)
CURRENT_RE = re.compile(
    r"\b(as\s+of|up\s+to\s+date|current|through\s+(?:may|june|july|august|september|october)|to\s+date)\b",
    re.IGNORECASE,
)


def validate_config() -> list[str]:
    if DOCUMENT_TYPE not in {"yearbook", "program"}:
        raise ValueError("ARCHIVE_DOCUMENT_TYPE must be yearbook or program")
    if not SAFE_SLUG_RE.fullmatch(DOCUMENT_SLUG):
        raise ValueError(f"Unsafe document slug: {DOCUMENT_SLUG!r}")
    if not 1900 <= PUBLICATION_YEAR <= 2100:
        raise ValueError("ARCHIVE_PUBLICATION_YEAR is invalid")
    if not 1 <= COLUMN_COUNT <= 6:
        raise ValueError("ARCHIVE_COLUMN_COUNT must be 1..6")
    raw = os.environ.get("ARCHIVE_PAGES_JSON", "").strip()
    if not raw:
        raise ValueError("ARCHIVE_PAGES_JSON is required")
    parsed = json.loads(raw)
    if not isinstance(parsed, list) or not parsed or len(parsed) > 64:
        raise ValueError("ARCHIVE_PAGES_JSON must contain 1..64 page filenames")
    pages: list[str] = []
    for raw_page in parsed:
        page = str(raw_page).strip()
        if not SAFE_PAGE_RE.fullmatch(page) or Path(page).name != page or page in {".", ".."}:
            raise ValueError(f"Unsafe/unsupported page filename: {page!r}")
        pages.append(page)
    return pages


PAGES = validate_config()
INPUT = ROOT / "_input"
PREPARED = ROOT / "_prepared"
TEXT_DIR = ROOT / "text"
for folder in (INPUT, PREPARED, TEXT_DIR):
    folder.mkdir(parents=True, exist_ok=True)


def public_url(page: str) -> str:
    return (
        f"{PROJECT_URL}/storage/v1/object/public/{BUCKET}/programs/"
        f"{quote(DOCUMENT_SLUG, safe='-._~')}/{quote(page, safe='-._~')}"
    )


def download(url: str, target: Path) -> None:
    for attempt in range(1, 4):
        req = urllib.request.Request(url, headers={"User-Agent": "UMARM archive OCR research/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                target.write_bytes(response.read())
            return
        except urllib.error.HTTPError as exc:
            if exc.code < 500 and exc.code != 429:
                raise
            if attempt == 3:
                raise
            time.sleep(attempt * 10)
        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(attempt * 10)


def prepare_image(source: Path, target: Path) -> dict:
    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img)
        original_size = list(img.size)
        img = ImageOps.grayscale(img)
        img = ImageOps.autocontrast(img, cutoff=0.5)
        if img.width > MAX_WIDTH:
            height = round(img.height * MAX_WIDTH / img.width)
            img = img.resize((MAX_WIDTH, height), Image.Resampling.LANCZOS)
        prepared_size = list(img.size)
        img.save(target, format="PNG", optimize=False)
    return {"original_size": original_size, "prepared_size": prepared_size}


def unwrap_payload(result) -> dict:
    payload = result.json
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
        for idx, raw_text in enumerate(texts):
            text = str(raw_text).strip()
            if not text or idx >= len(polys) or not polys[idx]:
                continue
            xs = [float(p[0]) for p in polys[idx]]
            ys = [float(p[1]) for p in polys[idx]]
            score = None
            if idx < len(scores):
                try:
                    score = float(scores[idx])
                except (TypeError, ValueError):
                    pass
            lines.append({
                "text": text,
                "score": score,
                "x0": min(xs),
                "x1": max(xs),
                "y0": min(ys),
                "y1": max(ys),
                "xc": sum(xs) / len(xs),
                "yc": sum(ys) / len(ys),
            })
    return lines


def assign_columns(lines: list[dict], page_width: int) -> list[list[dict]]:
    columns: list[list[dict]] = [[] for _ in range(COLUMN_COUNT)]
    width = page_width / COLUMN_COUNT
    for source in lines:
        line = dict(source)
        idx = min(COLUMN_COUNT - 1, max(0, int(line["xc"] / width)))
        line["column"] = idx + 1
        columns[idx].append(line)
    for column in columns:
        column.sort(key=lambda item: (item["yc"], item["x0"]))
    return columns


def classification_hint(context: str) -> str:
    if CURRENT_RE.search(context):
        return "in_season_likely"
    if FINAL_RE.search(context):
        return "possible_final_needs_review"
    return "historical_candidate_needs_review"


def candidate_hits(columns: list[list[dict]], radius: int = 8) -> list[dict]:
    hits: list[dict] = []
    seen: set[tuple] = set()
    for column_no, column in enumerate(columns, start=1):
        for idx, line in enumerate(column):
            if not KEYWORD_RE.search(line["text"]):
                continue
            lo = max(0, idx - radius)
            hi = min(len(column), idx + radius + 1)
            context_lines = [item["text"] for item in column[lo:hi]]
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
        if not folder.exists():
            continue
        for file in folder.glob("*"):
            file.unlink(missing_ok=True)
        try:
            folder.rmdir()
        except OSError:
            pass


def main() -> None:
    started = time.perf_counter()
    print(f"UMARM PaddleOCR archive: {DOCUMENT_TYPE} {DOCUMENT_SLUG} ({len(PAGES)} pages)", flush=True)

    prep_meta: dict[str, dict] = {}
    for page in PAGES:
        source = INPUT / page
        download(public_url(page), source)
        prepared = PREPARED / f"{Path(page).stem}.png"
        prep_meta[page] = prepare_image(source, prepared)

    ocr = PaddleOCR(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="en_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device="cpu",
    )

    payload_pages: list[dict] = []
    all_candidates: list[dict] = []
    total_chars = 0

    for page in PAGES:
        page_started = time.perf_counter()
        prepared = PREPARED / f"{Path(page).stem}.png"
        payloads = [unwrap_payload(result) for result in ocr.predict(str(prepared))]
        lines = extract_lines(payloads)
        columns = assign_columns(lines, prep_meta[page]["prepared_size"][0])
        text = "\n\n".join(
            "\n".join(item["text"] for item in column)
            for column in columns if column
        ).strip()
        if not text:
            text = "\n".join(item["text"] for item in sorted(lines, key=lambda item: (item["yc"], item["x0"]))).strip()
        (TEXT_DIR / f"{Path(page).stem}.txt").write_text(text + "\n", encoding="utf-8")

        scores = [item["score"] for item in lines if item["score"] is not None]
        hits = candidate_hits(columns)
        for hit in hits:
            all_candidates.append({"page": page, **hit})

        page_meta = {
            "page": page,
            **prep_meta[page],
            "recognized_lines": len(lines),
            "characters": len(text),
            "average_recognition_score": round(statistics.mean(scores), 4) if scores else None,
            "minimum_recognition_score": round(min(scores), 4) if scores else None,
            "historical_candidates": len(hits),
            "ocr_seconds": round(time.perf_counter() - page_started, 2),
        }
        payload_pages.append({"page": page, "text": text, "meta": page_meta})
        total_chars += len(text)
        print(
            f"{page}: lines={len(lines)} chars={len(text)} avg={page_meta['average_recognition_score']} "
            f"candidates={len(hits)} seconds={page_meta['ocr_seconds']}",
            flush=True,
        )

    summary = {
        "engine": "PaddleOCR 3.5.0",
        "detection_model": "PP-OCRv5_mobile_det",
        "recognition_model": "en_PP-OCRv5_mobile_rec",
        "max_width": MAX_WIDTH,
        "column_count": COLUMN_COUNT,
        "page_count": len(PAGES),
        "total_characters": total_chars,
        "total_candidates": len(all_candidates),
        "wall_seconds": round(time.perf_counter() - started, 2),
    }
    payload = {
        "document_type": DOCUMENT_TYPE,
        "document_slug": DOCUMENT_SLUG,
        "document_title": DOCUMENT_TITLE,
        "publication_year": PUBLICATION_YEAR,
        "summary": summary,
        "pages": payload_pages,
        "candidates": all_candidates,
    }
    (ROOT / "payload.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    (ROOT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    cleanup_images()

    if total_chars == 0:
        raise RuntimeError("OCR completed but extracted zero characters")
    print("COMPLETE " + json.dumps({
        "document": DOCUMENT_SLUG,
        "pages": len(PAGES),
        "characters": total_chars,
        "candidates": len(all_candidates),
    }), flush=True)


if __name__ == "__main__":
    main()
