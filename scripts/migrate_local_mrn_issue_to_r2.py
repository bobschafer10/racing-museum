#!/usr/bin/env python3
"""Stage original MRN page scans from a LOCAL Windows folder to Cloudflare R2.

No Supabase calls. Never deletes source or overwrites a different R2 object.
Run with --execute only after reviewing the dry-run inventory.
"""
import argparse
import hashlib
import os
from pathlib import Path
import re
import sys

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source", required=True, help="Directory holding one issue's numbered JPG page files")
    p.add_argument("--issue", required=True, help="ISO issue date YYYY-MM-DD")
    p.add_argument("--execute", action="store_true", help="Upload; otherwise print a local dry run")
    p.add_argument("--pilot-prefix", default="migration-pilots/mrn", help="Isolated destination prefix (must start migration-pilots/)")
    a = p.parse_args()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", a.issue):
        p.error("--issue must be YYYY-MM-DD")
    from datetime import date
    try:
        date.fromisoformat(a.issue)
    except ValueError:
        p.error("Invalid issue date")
    if not a.pilot_prefix.startswith("migration-pilots/") or ".." in a.pilot_prefix.split("/"):
        p.error("Only isolated migration-pilots/ prefixes are allowed")
    src = Path(a.source).expanduser()
    if not src.is_dir():
        p.error(f"Source folder not found: {src}")
    pages = sorted((f for f in src.iterdir() if f.is_file() and re.fullmatch(r"[1-9]\d*\.jpe?g", f.name, re.I)), key=lambda f: int(f.stem))
    if not pages:
        p.error("No numbered JPEG pages found. Refusing to upload.")
    numbers = [int(f.stem) for f in pages]
    if numbers != list(range(1, len(pages) + 1)):
        p.error("Missing or duplicate numbered pages. Refusing to upload.")
    total = sum(f.stat().st_size for f in pages)
    print(f"Issue: {a.issue}; source: {src}; {len(pages)} pages; {total:,} bytes")
    print(f"Pilot destination: {a.pilot_prefix.rstrip('/')}/{a.issue}/")
    for f in pages:
        print(f"  {f.name} ({f.stat().st_size:,} bytes)")
    if not a.execute:
        print("DRY RUN: no network calls and no files changed.")
        return
    import boto3
    from botocore.config import Config
    needed = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]
    missing = [k for k in needed if not os.environ.get(k)]
    if missing:
        p.error("Missing local environment settings: " + ", ".join(missing))
    r2 = boto3.client("s3", endpoint_url=os.environ["R2_ENDPOINT"],
                      aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                      region_name="auto", config=Config(signature_version="s3v4"))
    bucket = os.environ.get("R2_BUCKET", "umarm-newspapers")
    for index, f in enumerate(pages, 1):
        path = f"{a.pilot_prefix.rstrip('/')}/{a.issue}/{int(f.stem)}.jpg"
        payload = f.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        try:
            obj = r2.get_object(Bucket=bucket, Key=path)
        except r2.exceptions.NoSuchKey:
            obj = None
        except Exception as e:
            if getattr(e, "response", {}).get("Error", {}).get("Code") in ("NoSuchKey", "404", "NotFound"):
                obj = None
            else:
                raise
        if obj is not None:
            existing_digest = hashlib.sha256(obj["Body"].read()).hexdigest()
            if existing_digest != digest:
                raise RuntimeError(f"REFUSING to overwrite different existing R2 object: {path}")
            print(f"[{index}/{len(pages)}] Already verified: {path}")
            continue
        try:
            r2.put_object(Bucket=bucket, Key=path, Body=payload, ContentType="image/jpeg",
                          Metadata={"sha256": digest}, IfNoneMatch="*")
        except Exception as e:
            if getattr(e, "response", {}).get("Error", {}).get("Code") in ("PreconditionFailed", "412", "ConditionalRequestConflict", "409"):
                raise RuntimeError(f"Concurrent object creation; refusing to overwrite: {path}") from e
            raise
        copied = r2.get_object(Bucket=bucket, Key=path)["Body"].read()
        if hashlib.sha256(copied).hexdigest() != digest:
            raise RuntimeError(f"SHA256 VERIFICATION FAILED: {path}")
        print(f"[{index}/{len(pages)}] Uploaded and verified: {path}")
    print("COMPLETE. Originals retained. Website configuration unchanged.")

if __name__ == "__main__":
    main()
