#!/usr/bin/env python3
"""Copy one MRN issue from Supabase Storage to Cloudflare R2; never delete source."""
import hashlib
import os
import re
import sys
import requests
import boto3
from botocore.config import Config

BUCKET = "media"
PREFIX = "newspapers/midwest-racing-news"
ISSUE = os.environ["MRN_ISSUE"]
if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", ISSUE):
    sys.exit("MRN_ISSUE must be YYYY-MM-DD")
root = os.environ["SUPABASE_URL"].rstrip("/")
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
# Modern sb_secret_* keys authenticate via apikey only; legacy JWT service_role
# keys may also be sent as Bearer tokens.
headers = {"apikey": key}
if not key.startswith("sb_secret_"):
    headers["Authorization"] = f"Bearer {key}"
r2 = boto3.client(
    "s3",
    endpoint_url=os.environ["R2_ENDPOINT"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto",
    config=Config(signature_version="s3v4"),
)
destination = os.environ.get("R2_BUCKET", "umarm-newspapers")
folder = f"{PREFIX}/{ISSUE}"
session = requests.Session()
files = []
offset = 0
while True:
    resp = session.post(
        f"{root}/storage/v1/object/list/{BUCKET}",
        headers=headers,
        json={"prefix": folder + "/", "limit": 100, "offset": offset, "sortBy": {"column": "name", "order": "asc"}},
        timeout=60,
    )
    resp.raise_for_status()
    batch = resp.json()
    files.extend(item["name"] for item in batch if item.get("id"))
    if len(batch) < 100:
        break
    offset += len(batch)
if not files:
    sys.exit(f"No objects found in {folder}; no changes made")
print(f"Found {len(files)} files in {folder}")
if os.environ.get("EXECUTE_COPY") != "yes":
    print("DRY RUN ONLY. Set EXECUTE_COPY=yes to copy this single issue.")
    sys.exit(0)
from urllib.parse import quote
for index, name in enumerate(files, 1):
    path = f"{folder}/{name}"
    source = session.get(f"{root}/storage/v1/object/{BUCKET}/{quote(path, safe='/')}", headers=headers, timeout=180)
    source.raise_for_status()
    payload = source.content
    digest = hashlib.sha256(payload).hexdigest()
    content_type = source.headers.get("Content-Type", "image/jpeg")
    r2.put_object(Bucket=destination, Key=path, Body=payload, ContentType=content_type, Metadata={"sha256": digest})
    check = r2.get_object(Bucket=destination, Key=path)
    copied = check["Body"].read()
    if hashlib.sha256(copied).hexdigest() != digest:
        sys.exit(f"Verification FAILED for {path}")
    print(f"[{index}/{len(files)}] Verified {path} ({len(payload)} bytes)")
print(f"SUCCESS: {len(files)} objects copied and SHA-256 verified; Supabase originals unchanged")
