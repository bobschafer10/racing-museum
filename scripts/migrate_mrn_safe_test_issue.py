#!/usr/bin/env python3
"""Safely copy a small MRN issue from Supabase to R2 with readback verification.
No source deletes. Never overwrite an existing R2 object.
"""
import hashlib
import os
import re
import sys
from urllib.parse import quote

import boto3
import requests
from botocore.config import Config
from botocore.exceptions import ClientError

issue = os.environ.get("MRN_ISSUE", "")
if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", issue):
    sys.exit("Invalid MRN_ISSUE")
prefix = f"newspapers/midwest-racing-news/{issue}/"
root = os.environ["SUPABASE_URL"].rstrip("/")
secret = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": secret}
if not secret.startswith("sb_secret_"):
    headers["Authorization"] = "Bearer " + secret
session = requests.Session()
resp = session.post(
    f"{root}/storage/v1/object/list/media",
    headers=headers,
    json={"prefix": prefix, "limit": 100, "offset": 0, "sortBy": {"column": "name", "order": "asc"}},
    timeout=60,
)
resp.raise_for_status()
items = [x["name"] for x in resp.json() if x.get("id")]
if not items or len(items) > 30:
    sys.exit(f"Expected 1-30 files in test issue, found {len(items)}; stopped.")
r2 = boto3.client(
    "s3", endpoint_url=os.environ["R2_ENDPOINT"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto", config=Config(signature_version="s3v4", s3={"addressing_style":"path"}),
)
bucket = "umarm-newspapers"
mode = os.environ.get("EXECUTE_COPY", "no")
print(f"Issue {issue}: {len(items)} source objects; mode={mode}")
for index, name in enumerate(items, 1):
    path = prefix + name
    source = session.get(
        f"{root}/storage/v1/object/media/{quote(path, safe='/')}",
        headers=headers, timeout=180,
    )
    source.raise_for_status()
    payload = source.content
    digest = hashlib.sha256(payload).hexdigest()
    if mode != "yes":
        print(f"DRY RUN {index}/{len(items)}: {path}, {len(payload)} bytes, SHA-256={digest}")
        continue
    exists = False
    try:
        r2.head_object(Bucket=bucket, Key=path)
        exists = True
    except ClientError as e:
        if e.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 404:
            raise
    if exists:
        current = r2.get_object(Bucket=bucket, Key=path)["Body"].read()
        if hashlib.sha256(current).hexdigest() != digest:
            sys.exit(f"CONFLICT: Existing R2 key differs: {path}; no overwrite.")
        print(f"VERIFIED EXISTING {index}/{len(items)}: {path}")
        continue
    # Conditional write prevents overwriting an object created after HEAD.
    try:
        r2.put_object(
            Bucket=bucket, Key=path, Body=payload,
            ContentType=source.headers.get("Content-Type", "image/jpeg"),
            Metadata={"sha256": digest},
            IfNoneMatch="*",
        )
    except ClientError as e:
        code = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if code not in (409, 412):
            raise
        print(f"Concurrent object detected at {path}; checking bytes.")
    copied = r2.get_object(Bucket=bucket, Key=path)["Body"].read()
    if hashlib.sha256(copied).hexdigest() != digest:
        sys.exit(f"FAILED verification for {path}")
    print(f"VERIFIED {index}/{len(items)}: {path}, {len(payload)} bytes")
print("SUCCESS: issue checked; source retained; no existing R2 objects overwritten.")
