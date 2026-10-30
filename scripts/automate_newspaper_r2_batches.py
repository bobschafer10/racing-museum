#!/usr/bin/env python3
"""Run a bounded, resumable sequence of verified newspaper migration batches.

A completed-batch marker is written to R2 only after the existing batch
migration script reports success. Failed batches remain eligible for retry.
No Supabase files are modified or deleted.
"""
import datetime as dt
import hashlib
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

BUCKET = "umarm-newspapers"
MARKER_ROOT = "migration-control/verified-batches/v1"
manifest_path = Path("migration-inventory/supabase-newspaper-issue-manifest.json")
manifest_bytes = manifest_path.read_bytes()
manifest = json.loads(manifest_bytes)
issues_per_batch = int(os.getenv("ISSUES_PER_BATCH", "20"))
max_batches = int(os.getenv("MAX_BATCHES", "3"))
execute = os.getenv("EXECUTE_COPY") == "yes"
if not (1 <= issues_per_batch <= 30 and 1 <= max_batches <= 6):
    sys.exit("Invalid limits (issues_per_batch=1..30, max_batches=1..6)")

r2 = boto3.client(
    "s3", endpoint_url=os.environ["R2_ENDPOINT"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
    config=Config(signature_version="s3v4", retries={"max_attempts": 5, "mode": "standard"},
                  s3={"addressing_style": "path"}),
)

def marker_key(publication, year, index):
    return f"{MARKER_ROOT}/{publication}/{year}/size-{issues_per_batch}/batch-{index:03d}.json"

def verified_marker(key, expected_issues):
    try:
        obj = r2.get_object(Bucket=BUCKET, Key=key)
    except ClientError as exc:
        if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 404:
            return False
        raise
    marker = json.loads(obj["Body"].read())
    if marker.get("issues") != expected_issues or marker.get("status") != "success":
        raise RuntimeError(f"Existing checkpoint does not match current inventory: {key}")
    return True

summary = {"execute": execute, "issues_per_batch": issues_per_batch,
           "max_batches": max_batches, "skipped_verified_batches": 0,
           "processed": [], "status": "started"}
Path("migration-reports").mkdir(exist_ok=True)
summary_path = Path("migration-reports/automation-summary.json")

def save():
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

save()
try:
    for publication in ("mrn", "cfrn"):
        years = manifest["publications"].get(publication, {})
        for year in sorted(years):
            dates = sorted(set(years[year]))
            for index in range(math.ceil(len(dates) / issues_per_batch)):
                selected = dates[index * issues_per_batch:(index + 1) * issues_per_batch]
                key = marker_key(publication, year, index)
                if verified_marker(key, selected):
                    summary["skipped_verified_batches"] += 1
                    continue
                if len(summary["processed"]) >= max_batches:
                    break
                print(f"START {publication} {year} batch {index}, issues={len(selected)}, execute={execute}", flush=True)
                env = os.environ.copy()
                env.update(PUBLICATION=publication, YEAR=year, BATCH_INDEX=str(index),
                           ISSUES_PER_BATCH=str(issues_per_batch))
                result = subprocess.run([sys.executable, "scripts/migrate_newspapers_r2_batch.py"],
                                        env=env, check=False)
                report_file = Path(f"migration-reports/{publication}-{year}-batch-{index:03d}.json")
                if not report_file.exists():
                    raise RuntimeError(f"Missing report: {report_file}")
                report = json.loads(report_file.read_text(encoding="utf-8"))
                summary["processed"].append({
                    "publication": publication, "year": year, "batch_index": index,
                    "status": report.get("status"), "source_objects": report.get("source_objects"),
                    "verified_new": report.get("verified_new"),
                    "verified_existing": report.get("verified_existing"),
                    "bytes_uploaded": report.get("bytes_uploaded"),
                })
                save()
                if result.returncode or report.get("status") != "success":
                    raise RuntimeError(f"Migration failed for {publication} {year} batch {index}")
                if execute:
                    # Durable checkpoint only after the batch script verifies every file.
                    checkpoint = {"status": "success", "issues": selected,
                                  "publication": publication, "year": year, "batch_index": index,
                                  "source_objects": report["source_objects"],
                                  "verified_new": report["verified_new"],
                                  "verified_existing": report["verified_existing"],
                                  "completed_utc": dt.datetime.now(dt.timezone.utc).isoformat()}
                    r2.put_object(Bucket=BUCKET, Key=key,
                                  Body=json.dumps(checkpoint, sort_keys=True).encode("utf-8"),
                                  ContentType="application/json", IfNoneMatch="*")
                if not execute:
                    # A dry run must not repeatedly inspect the same batch.
                    summary["status"] = "dry_run_complete"
                    save()
                    print(json.dumps(summary, indent=2))
                    sys.exit(0)
            if len(summary["processed"]) >= max_batches:
                break
        if len(summary["processed"]) >= max_batches:
            break
    summary["status"] = "success"
except Exception as exc:
    summary["status"] = "failed"
    summary["error"] = str(exc)[:500]
    print(f"AUTOMATION FAILED: {exc}", file=sys.stderr, flush=True)
    save()
    sys.exit(1)
save()
print(json.dumps(summary, indent=2))
