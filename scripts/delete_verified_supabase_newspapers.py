#!/usr/bin/env python3
"""Delete only the verified migrated newspaper images from Supabase Storage.

R2 is never modified. Requires an explicit execution flag and exact R2 inventory
count/size, plus matching R2 keys/sizes for every remaining source object.
Resumable after partial deletion. All other Supabase objects are untouched.
"""
import collections
import json
import os
import re
import sys
import time
from pathlib import Path

import boto3
import requests
from botocore.config import Config

EXPECTED_COUNT = 49075
EXPECTED_BYTES = 175572535591
PREFIXES = ("newspapers/midwest-racing-news/", "newspapers/checkered-flag-racing-news/")
BUCKET = "umarm-newspapers"
REPORT = Path("migration-reports/supabase-newspaper-deletion.json")
REPORT.parent.mkdir(parents=True, exist_ok=True)
report = {"status": "starting", "expected_objects": EXPECTED_COUNT,
          "deleted_confirmed": 0, "errors": []}

def save():
    REPORT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k:v for k,v in report.items() if k != "errors"}), flush=True)

def retry_request(method, url, **kwargs):
    for attempt in range(6):
        try:
            resp = session.request(method, url, timeout=90, **kwargs)
            if resp.status_code not in (429, 500, 502, 503, 504):
                resp.raise_for_status()
                return resp
            last = f"HTTP {resp.status_code}: {resp.text[:400]}"
        except requests.RequestException as exc:
            last = str(exc)
        time.sleep(min(30, 2 ** attempt))
    raise RuntimeError(f"Storage request failed after retries: {last}")

secret = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
session = requests.Session()
session.headers["apikey"] = secret
if not secret.startswith("sb_secret_"):
    session.headers["Authorization"] = "Bearer " + secret
root = os.environ["SUPABASE_URL"].rstrip("/")
r2 = boto3.client("s3", endpoint_url=os.environ["R2_ENDPOINT"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto", config=Config(signature_version="s3v4",
    retries={"max_attempts": 5, "mode": "standard"}, s3={"addressing_style": "path"}))

def source_list(folder):
    offset = 0
    while True:
        resp = retry_request("POST", root + "/storage/v1/object/list/media",
            json={"prefix": folder, "limit": 100, "offset": offset,
                  "sortBy": {"column": "name", "order": "asc"}})
        page = resp.json()
        if not isinstance(page, list):
            raise RuntimeError(f"Unexpected source list response: {folder}")
        for obj in page:
            if not obj.get("id"):
                raise RuntimeError(f"Unexpected nested directory in {folder}")
            raw_size = (obj.get("metadata") or {}).get("size")
            if raw_size is None:
                raise RuntimeError(f"Missing size metadata: {folder}{obj['name']}")
            yield folder + obj["name"], int(raw_size)
        if len(page) < 100:
            break
        offset += len(page)

def r2_list(prefix):
    token = None
    while True:
        params = {"Bucket": BUCKET, "Prefix": prefix, "MaxKeys": 1000}
        if token:
            params["ContinuationToken"] = token
        resp = r2.list_objects_v2(**params)
        for obj in resp.get("Contents", []):
            yield obj["Key"], int(obj["Size"])
        if not resp.get("IsTruncated"):
            break
        token = resp["NextContinuationToken"]

try:
    if os.environ.get("EXECUTE_DELETE") != "yes":
        raise RuntimeError("Execution not enabled: EXECUTE_DELETE must equal yes")
    manifest = json.loads(Path("migration-inventory/supabase-newspaper-issue-manifest.json").read_text())
    pubs = {"mrn": PREFIXES[0], "cfrn": PREFIXES[1]}
    if set(manifest["publications"]) != set(pubs):
        raise RuntimeError("Unexpected publication set in manifest")
    dest = {}
    for prefix in PREFIXES:
        for key, size in r2_list(prefix):
            if key in dest:
                raise RuntimeError("Duplicate R2 key " + key)
            dest[key] = size
    if len(dest) != EXPECTED_COUNT or sum(dest.values()) != EXPECTED_BYTES:
        raise RuntimeError(f"R2 guard failed: {len(dest)} objects, {sum(dest.values())} bytes")
    report["r2_verified_count"] = len(dest)
    report["r2_verified_bytes"] = sum(dest.values())
    remaining = {}
    issues = 0
    for pub, years in manifest["publications"].items():
        for year, dates in sorted(years.items()):
            for date in sorted(set(dates)):
                if not re.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", date):
                    raise RuntimeError(f"Invalid manifest date: {date}")
                folder = f"{pubs[pub]}{date}/"
                issues += 1
                for key, size in source_list(folder):
                    if key in remaining:
                        raise RuntimeError("Duplicate source key " + key)
                    if dest.get(key) != size:
                        raise RuntimeError(f"R2 missing or size differs: {key}")
                    remaining[key] = size
    if issues != 2076 or len(remaining) > EXPECTED_COUNT:
        raise RuntimeError(f"Unexpected issue/source counts: {issues}/{len(remaining)}")
    report["source_before"] = len(remaining)
    report["source_bytes_before"] = sum(remaining.values())
    report["status"] = "deleting"
    save()
    keys = sorted(remaining)
    for start in range(0, len(keys), 100):
        batch = keys[start:start + 100]
        if not all(key.startswith(PREFIXES) for key in batch):
            raise RuntimeError("Non-newspaper path detected")
        response = retry_request("DELETE", root + "/storage/v1/object/media",
            json={"prefixes": batch})
        data = response.json()
        if not isinstance(data, list):
            raise RuntimeError(f"Unexpected deletion response at batch {start//100}: {str(data)[:400]}")
        deleted = {obj.get("name") for obj in data if isinstance(obj, dict)}
        if deleted and deleted != set(batch):
            raise RuntimeError(f"Deletion response mismatch at batch {start//100}: {len(deleted)}/{len(batch)}")
        report["deleted_confirmed"] += len(batch)
        if (start // 100) % 10 == 0:
            save()
    # Verify every manifest issue has zero remaining objects.
    leftovers = []
    for pub, years in manifest["publications"].items():
        for year, dates in sorted(years.items()):
            for date in sorted(set(dates)):
                folder = f"{pubs[pub]}{date}/"
                for key, _ in source_list(folder):
                    leftovers.append(key)
                    if len(leftovers) >= 10:
                        break
                if len(leftovers) >= 10:
                    break
            if len(leftovers) >= 10:
                break
    report["remaining_sample"] = leftovers
    report["status"] = "complete" if not leftovers else "incomplete"
    save()
    if leftovers:
        sys.exit(1)
except Exception as exc:
    report["status"] = "failed"
    report["errors"].append(str(exc))
    save()
    raise
