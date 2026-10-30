#!/usr/bin/env python3
"""Bounded, resumable Supabase Storage -> Cloudflare R2 newspaper migration.

Copies exactly one deterministic batch of issue folders. No Supabase deletes.
Never overwrites a pre-existing different R2 object. SHA-256 verifies all
source and destination bytes. Outputs a JSON report for every run.
"""
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote

import boto3
import requests
from botocore.config import Config
from botocore.exceptions import ClientError

PUBLICATIONS = {
    "mrn": "midwest-racing-news",
    "cfrn": "checkered-flag-racing-news",
}
publication = os.environ["PUBLICATION"]
year = os.environ["YEAR"]
batch_index = int(os.environ["BATCH_INDEX"])
issues_per_batch = int(os.environ.get("ISSUES_PER_BATCH", "20"))
execute = os.environ.get("EXECUTE_COPY") == "yes"
if publication not in PUBLICATIONS or not re.fullmatch(r"(19|20)\d\d", year):
    sys.exit("Invalid publication/year")
if not 0 <= batch_index <= 1000 or not 1 <= issues_per_batch <= 30:
    sys.exit("Invalid batch selection")
root = os.environ["SUPABASE_URL"].rstrip("/")
secret = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": secret}
if not secret.startswith("sb_secret_"):
    headers["Authorization"] = "Bearer " + secret
session = requests.Session()
session.headers.update(headers)
r2 = boto3.client(
    "s3", endpoint_url=os.environ["R2_ENDPOINT"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
    config=Config(signature_version="s3v4", retries={"max_attempts": 5, "mode": "standard"},
                  s3={"addressing_style": "path"}),
)
bucket = "umarm-newspapers"
prefix = f"newspapers/{PUBLICATIONS[publication]}/"
report = {
    "publication": publication, "year": year, "batch_index": batch_index,
    "issues_per_batch": issues_per_batch, "execute": execute,
    "status": "started", "issues": [], "source_objects": 0,
    "copied": 0, "verified_existing": 0, "verified_new": 0,
    "bytes_from_supabase": 0, "bytes_uploaded": 0, "conflicts": [],
    "failures": [],
}
Path("migration-reports").mkdir(exist_ok=True)
report_path = Path(f"migration-reports/{publication}-{year}-batch-{batch_index:03d}.json")

def save():
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

def storage_list(path):
    """Storage list is hierarchical: folder rows have null id."""
    offset, results = 0, []
    while True:
        resp = session.post(
            f"{root}/storage/v1/object/list/media",
            json={"prefix": path, "limit": 100, "offset": offset,
                  "sortBy": {"column": "name", "order": "asc"}},
            timeout=90,
        )
        resp.raise_for_status()
        page = resp.json()
        if not isinstance(page, list):
            raise RuntimeError(f"Unexpected listing response for {path}")
        results.extend(page)
        if len(page) < 100:
            return results
        offset += len(page)

def download_source(path):
    response = session.get(
        f"{root}/storage/v1/object/media/{quote(path, safe='/')}",
        timeout=180, stream=True,
    )
    response.raise_for_status()
    digest = hashlib.sha256()
    chunks = []
    size = 0
    for chunk in response.iter_content(chunk_size=1024 * 1024):
        if chunk:
            digest.update(chunk)
            chunks.append(chunk)
            size += len(chunk)
    content_type = response.headers.get("Content-Type", "application/octet-stream")
    response.close()
    return b"".join(chunks), digest.hexdigest(), size, content_type

def r2_digest(path):
    obj = r2.get_object(Bucket=bucket, Key=path)
    h = hashlib.sha256()
    for chunk in obj["Body"].iter_chunks(chunk_size=1024 * 1024):
        h.update(chunk)
    obj["Body"].close()
    return h.hexdigest()

try:
    top = storage_list(prefix)
    issues = sorted(
        prefix + item["name"].strip("/") + "/"
        for item in top
        if item.get("id") is None
        and re.fullmatch(year + r"-\d{2}-\d{2}", item.get("name", "").strip("/"))
    )
    if not issues:
        raise RuntimeError(f"No dated issue folders found for {publication} {year}")
    start = batch_index * issues_per_batch
    selected = issues[start:start + issues_per_batch]
    if not selected:
        raise RuntimeError(f"Batch index out of range: {len(issues)} issues in year")
    report["issues_in_year"] = len(issues)
    report["issues"] = selected
    all_paths = []
    for issue in selected:
        entries = storage_list(issue)
        for entry in entries:
            if entry.get("id"):
                all_paths.append(issue + entry["name"])
            else:
                # Stop rather than silently miss a nested directory.
                raise RuntimeError(f"Nested folder needs separate handling: {issue}{entry.get('name')}")
    if not all_paths or len(all_paths) > 800:
        raise RuntimeError(f"Batch has {len(all_paths)} objects; expected 1..800. Adjust issues_per_batch.")
    report["source_objects"] = len(all_paths)
    save()
    print(f"Found {len(issues)} issues for {publication} {year}; selected "
          f"{len(selected)} issues, {len(all_paths)} files, execute={execute}", flush=True)
    if not execute:
        print("DRY RUN: no bytes downloaded and no R2 writes. Sample:", all_paths[:5])
    else:
        for i, path in enumerate(all_paths, 1):
            try:
                data, digest, size, content_type = download_source(path)
                report["bytes_from_supabase"] += size
                try:
                    head = r2.head_object(Bucket=bucket, Key=path)
                except ClientError as exc:
                    if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 404:
                        raise
                    head = None
                if head is not None:
                    # Metadata from a previously SHA-verified migration can avoid
                    # downloading R2 bytes again; all other objects get a full readback.
                    if head.get("ContentLength") == size and head.get("Metadata", {}).get("sha256") == digest:
                        report["verified_existing"] += 1
                    elif r2_digest(path) == digest:
                        report["verified_existing"] += 1
                    else:
                        report["conflicts"].append(path)
                        raise RuntimeError(f"R2 object differs; will not overwrite: {path}")
                else:
                    try:
                        r2.put_object(
                            Bucket=bucket, Key=path, Body=data, ContentType=content_type,
                            Metadata={"sha256": digest}, IfNoneMatch="*",
                        )
                        report["copied"] += 1
                        report["bytes_uploaded"] += size
                    except ClientError as exc:
                        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") not in (409, 412):
                            raise
                    if r2_digest(path) != digest:
                        report["conflicts"].append(path)
                        raise RuntimeError(f"R2 readback mismatch: {path}")
                    report["verified_new"] += 1
                if i % 10 == 0 or i == len(all_paths):
                    print(f"Verified {i}/{len(all_paths)}; new={report['verified_new']}, "
                          f"existing={report['verified_existing']}", flush=True)
                    save()
            except Exception as exc:
                report["failures"].append({"path": path, "error": str(exc)[:400]})
                raise
    report["status"] = "success"
except Exception as exc:
    report["status"] = "failed"
    report["error"] = str(exc)[:600]
    print(f"FAILED: {exc}", file=sys.stderr, flush=True)
finally:
    save()
print(json.dumps({k: v for k, v in report.items() if k not in ("issues", "failures", "conflicts")}, indent=2))
if report["status"] != "success":
    sys.exit(1)
