#!/usr/bin/env python3
"""PaddleOCR upgrade runner for museum yearbooks with original scan images.

No scanned image is modified. Each page emits search text plus normalized line boxes.
The merge step writes an audited JSON backup and can index the existing Supabase
archive_ocr_pages table when SUPABASE_SERVICE_ROLE_KEY is configured in GitHub Actions.
"""
import argparse
import hashlib
import json
import os
import re
import statistics
import time
import urllib.request
from pathlib import Path
from urllib.parse import quote

SLUG = os.environ.get("OCR_DOCUMENT_SLUG", "1981-national-late-model-annual-yearbook")
TITLE = os.environ.get("OCR_DOCUMENT_TITLE", SLUG.replace("-", " ").title())
YEAR = int(os.environ.get("OCR_DOCUMENT_YEAR", SLUG[:4]))
BASE = "https://szvkleurojiwqkkztxtr.supabase.co"
PREFIX = f"programs/{SLUG}/"
MODEL = "PP-OCRv5_mobile_det + en_PP-OCRv5_mobile_rec"

def url_for(page):
    return f"{BASE}/storage/v1/object/public/media/{quote(PREFIX + page, safe='/')}"

def get_image(page):
    req = urllib.request.Request(url_for(page), headers={"User-Agent": "UMARM-Archive-OCR/2026"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                return response.read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))

def slim_boxes(ocr_result, w, h):
    payload = ocr_result.json
    if not isinstance(payload, dict):
        payload = json.loads(payload)
    payload = payload.get("res", payload)
    texts = payload.get("rec_texts") or []
    scores = payload.get("rec_scores") or []
    polygons = payload.get("rec_polys") or payload.get("dt_polys") or []
    lines = []
    for i, raw in enumerate(texts):
        t = str(raw).strip()
        if not t or i >= len(polygons):
            continue
        poly = polygons[i]
        if poly is None or len(poly) < 3:
            continue
        xs = [float(p[0]) for p in poly]
        ys = [float(p[1]) for p in poly]
        x0, x1 = max(0, min(xs)), min(w, max(xs))
        y0, y1 = max(0, min(ys)), min(h, max(ys))
        if x1 <= x0 or y1 <= y0:
            continue
        score = float(scores[i]) if i < len(scores) else None
        lines.append({
            "t": t, "x": round(x0 / w, 6), "y": round(y0 / h, 6),
            "w": round((x1 - x0) / w, 6), "h": round((y1 - y0) / h, 6),
            "s": round(score, 4) if score is not None else None,
        })
    return lines

def reconstruct(lines):
    # Preserve predictable reading order for two-column racing publication text.
    if len(lines) < 12:
        return "\n".join(x["t"] for x in sorted(lines, key=lambda r:(r["y"],r["x"])))
    left = [x for x in lines if x["x"] + x["w"]/2 < .49]
    right = [x for x in lines if x["x"] + x["w"]/2 >= .49]
    wide = sum(1 for x in lines if x["w"] > .62)
    if len(left) >= 8 and len(right) >= 8 and wide < len(lines)*.15:
        left.sort(key=lambda r:(r["y"],r["x"]))
        right.sort(key=lambda r:(r["y"],r["x"]))
        return "=== COLUMN 1 ===\n" + "\n".join(x["t"] for x in left) + "\n\n=== COLUMN 2 ===\n" + "\n".join(x["t"] for x in right)
    return "\n".join(x["t"] for x in sorted(lines, key=lambda r:(r["y"],r["x"])))

def run_chunk(start, end):
    from io import BytesIO
    from PIL import Image, ImageFile, ImageOps
    from paddleocr import PaddleOCR
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    out = Path("audit-ocr") / SLUG; out.mkdir(parents=True,exist_ok=True)
    ocr = PaddleOCR(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="en_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device="cpu",
    )
    rows=[]
    for number in range(start,end+1):
        page=f"{number:03d}.jpg"
        path=PREFIX+page
        try:
            src=get_image(page)
            img=Image.open(BytesIO(src))
            img=ImageOps.exif_transpose(img).convert("L")
            img=ImageOps.autocontrast(img,cutoff=.5)
            if img.width > 2400:
                img=img.resize((2400,round(img.height*2400/img.width)),Image.Resampling.LANCZOS)
            work=out/f"prepared-{page}.png"
            img.save(work)
            found=list(ocr.predict(str(work)))
            lines=[]
            for result in found:
                lines.extend(slim_boxes(result,img.width,img.height))
            text=reconstruct(lines)
            scores=[x["s"] for x in lines if x["s"] is not None]
            row={
                "document_type":"yearbook","document_slug":SLUG,
                "document_title":TITLE,"publication_year":YEAR,
                "page_label":page,"page_number":number,
                "storage_path":path,"mime_type":"image/jpeg",
                "status":"complete" if text.strip() else "failed",
                "ocr_engine":"PaddleOCR","ocr_model":MODEL,
                "ocr_text":text,
                "ocr_json":{"space":"normalized","source":"prepared_image",
                            "image_sha256":hashlib.sha256(src).hexdigest(),
                            "lines":lines},
                "avg_confidence":round(statistics.mean(scores),4) if scores else None,
                "error_message":None if text.strip() else "No recognizable text"
            }
            print(f"{page}: {len(lines)} lines {len(text)} characters; status={row['status']}",flush=True)
            work.unlink(missing_ok=True)
        except Exception as exc:
            row={
                "document_type":"yearbook","document_slug":SLUG,
                "document_title":TITLE,"publication_year":YEAR,
                "page_label":page,"page_number":number,
                "storage_path":path,"mime_type":"image/jpeg",
                "status":"failed","ocr_engine":"PaddleOCR",
                "ocr_model":MODEL,"ocr_text":"",
                "ocr_json":{"lines":[]},"avg_confidence":None,
                "error_message":f"{type(exc).__name__}: {exc}"[:400]
            }
            print(f"FAILED {page}: {row['error_message']}",flush=True)
        rows.append(row)
    filename=out/f"part-{start:03d}.json"
    filename.write_text(json.dumps(rows,ensure_ascii=False),encoding="utf-8")
    if any(r["status"]=="failed" for r in rows):
        raise RuntimeError("One or more scans failed; see part JSON artifact")

def merge_and_index():
    import urllib.error
    paths=sorted(Path("audit-ocr").glob("part-*.json"))
    rows=[]
    for part in paths:
        rows.extend(json.loads(part.read_text(encoding="utf-8")))
    rows.sort(key=lambda x:x["page_number"])
    assert len(rows)==67, f"Expected 67 source scans, found {len(rows)}"
    assert [r["page_number"] for r in rows] == list(range(1,68)), "Missing or duplicate pages"
    failed=[r["page_number"] for r in rows if r["status"]!="complete"]
    path=Path("audit/yearbook-ocr")/f"{SLUG}.json"
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(rows,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"OCR JSON backup: {path}; pages={len(rows)}, failures={failed}, characters={sum(len(r['ocr_text']) for r in rows)}",flush=True)
    if failed:
        raise RuntimeError(f"Cannot publish incomplete OCR; failed pages: {failed}")
    key=os.getenv("SUPABASE_SERVICE_ROLE_KEY","").strip()
    if not key:
        print("INDEX_STATUS=NEEDS_IMPORT: no GitHub secret SUPABASE_SERVICE_ROLE_KEY configured. Validated OCR JSON was committed for connector import.",flush=True)
        return
    endpoint=f"{BASE}/rest/v1/archive_ocr_pages?on_conflict=storage_path"
    headers={"apikey":key,"Authorization":f"Bearer {key}","Content-Type":"application/json",
             "Prefer":"resolution=merge-duplicates,return=minimal"}
    # Preserve one public index record per source scan. No image assets are replaced.
    for start in range(0,len(rows),8):
        batch=rows[start:start+8]
        req=urllib.request.Request(endpoint,data=json.dumps(batch).encode(),headers=headers,method="POST")
        try:
            with urllib.request.urlopen(req,timeout=120) as res:
                print(f"INDEXED {start+1}-{start+len(batch)}: HTTP {res.status}",flush=True)
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"Supabase OCR upsert failed HTTP {exc.code}: {exc.read(500).decode(errors='replace')}")
    print("INDEX_STATUS=COMPLETE: 67 pages upserted into archive_ocr_pages",flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--start",type=int)
    ap.add_argument("--end",type=int)
    ap.add_argument("--merge",action="store_true")
    a=ap.parse_args()
    if a.merge:
        merge_and_index()
    else:
        assert 1<=a.start<=a.end<=100
        run_chunk(a.start,a.end)
