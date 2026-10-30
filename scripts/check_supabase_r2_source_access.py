#!/usr/bin/env python3
"""Read-only gate for GitHub-hosted Supabase -> R2 migration.

Proves source bytes are retrievable and R2 is accessible before any bulk job.
Does not upload, delete, or alter anything.
"""
import hashlib
import os
import sys
from urllib.parse import quote

import boto3
import requests
from botocore.config import Config

source_path = "newspapers/midwest-racing-news/1960-09-21/1.jpg"
root = os.environ["SUPABASE_URL"].rstrip("/")
secret = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": secret}
if not secret.startswith("sb_secret_"):
    headers["Authorization"] = "Bearer " + secret
source_url = f"{root}/storage/v1/object/media/{quote(source_path, safe='/')}"
session = requests.Session()
try:
    response = session.get(source_url, headers=headers, timeout=90, stream=True)
except requests.RequestException as e:
    sys.exit(f"FAIL: Supabase Storage unreachable ({type(e).__name__}). No changes.")
if response.status_code != 200:
    code = response.status_code
    response.close()
    if code == 402:
        sys.exit("BLOCKED: Supabase Storage returns HTTP 402 Payment Required. "
                 "GitHub cannot download source files; do not start bulk migration. "
                 "Use verified local originals or restore source access. No changes.")
    sys.exit(f"BLOCKED: Supabase Storage returned HTTP {code}. No changes.")
h = hashlib.sha256()
size = 0
for block in response.iter_content(chunk_size=1024*1024):
    if block:
        size += len(block)
        h.update(block)
response.close()
if size < 1000:
    sys.exit(f"FAIL: Source response unexpectedly small ({size} bytes). No changes.")
print(f"PASS: Supabase source readable: {source_path}, {size:,} bytes, SHA-256={h.hexdigest()}")
r2 = boto3.client(
    "s3", endpoint_url=os.environ["R2_ENDPOINT"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
    config=Config(signature_version="s3v4", s3={"addressing_style":"path"}),
)
pilot_key = "migration-pilots/mrn/1980-04-03/4-3-80-1/1.jpg"
try:
    obj = r2.head_object(Bucket="umarm-newspapers", Key=pilot_key)
except Exception as e:
    sys.exit(f"FAIL: R2 read of existing pilot failed ({type(e).__name__}). No changes.")
print(f"PASS: R2 existing pilot object accessible, {obj['ContentLength']:,} bytes.")
print("PASS: Both endpoints reachable. This is a read-only preflight; no migration was performed.")
