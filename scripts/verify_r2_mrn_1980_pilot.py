#!/usr/bin/env python3
"""Read-only verification of the 1980-04-03 MRN Cloudflare R2 browser upload."""
import csv
import hashlib
import os
from pathlib import Path

import boto3
from botocore.config import Config

BUCKET = "umarm-newspapers"
PREFIX = "migration-pilots/mrn/1980-04-03/4-3-80-1/"
EXPECTED_NAMES = {f"{n}.jpg" for n in range(1, 17)}
EXPECTED_TOTAL = 83131274

def main():
    required = ("MIGRATION_R2_ENDPOINT", "MIGRATION_R2_ACCESS_KEY_ID", "MIGRATION_R2_SECRET_ACCESS_KEY")
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise SystemExit("Missing GitHub Actions secrets: " + ", ".join(missing))
    s3 = boto3.client(
        "s3", endpoint_url=os.environ["MIGRATION_R2_ENDPOINT"],
        aws_access_key_id=os.environ["MIGRATION_R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["MIGRATION_R2_SECRET_ACCESS_KEY"],
        region_name="auto", config=Config(signature_version="s3v4"),
    )
    # Browser-uploaded R2 objects are verified by exact keys. Avoid ListObjectsV2,
    # which can return NoSuchKey for some S3-compatible R2 configurations.
    # The expected 16 keys are known from the local inventory.
    rows = []
    for number in range(1, 17):
        name = f"{number}.jpg"
        key = PREFIX + name
        response = s3.get_object(Bucket=BUCKET, Key=key)
        sha = hashlib.sha256()
        length = 0
        try:
            for chunk in response["Body"].iter_chunks(chunk_size=1024 * 1024):
                if chunk:
                    sha.update(chunk)
                    length += len(chunk)
        finally:
            response["Body"].close()
        declared = response.get("ContentLength")
        if declared != length:
            raise SystemExit(f"ContentLength mismatch for {name}: {declared} vs {length}")
        rows.append({"file": name, "r2_key": key, "size_bytes": length, "sha256": sha.hexdigest()})
        print(f"Read and SHA-256 hashed {name}: {length:,} bytes")
    total = sum(row["size_bytes"] for row in rows)
    if total != EXPECTED_TOTAL:
        raise SystemExit(f"Size mismatch: expected {EXPECTED_TOTAL:,} bytes, got {total:,} bytes")
    output = Path("r2-pilot-verification")
    output.mkdir(exist_ok=True)
    with (output / "mrn-1980-04-03-r2-sha256.csv").open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=["file", "r2_key", "size_bytes", "sha256"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"PASS: {len(rows)} R2 objects, {total:,} bytes. Read-only R2 SHA-256 report saved.")
    print("NOTE: Original-local-vs-R2 hash comparison is still required to prove byte identity.")

if __name__ == "__main__":
    main()
