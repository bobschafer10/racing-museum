#!/usr/bin/env python3
"""Read-only full newspaper source/R2 key reconciliation. Never deletes or uploads."""
import json, os, sys, collections
from pathlib import Path
import boto3, requests
from botocore.config import Config

manifest = json.loads(Path("migration-inventory/supabase-newspaper-issue-manifest.json").read_text())
prefixes = {"mrn":"midwest-racing-news", "cfrn":"checkered-flag-racing-news"}
session = requests.Session()
secret = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
session.headers.update({"apikey":secret})
if not secret.startswith("sb_secret_"):
    session.headers["Authorization"] = "Bearer " + secret
root = os.environ["SUPABASE_URL"].rstrip("/")
r2 = boto3.client("s3", endpoint_url=os.environ["R2_ENDPOINT"],
    aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
    region_name="auto", config=Config(signature_version="s3v4", retries={"max_attempts":5,"mode":"standard"},s3={"addressing_style":"path"}))
bucket = "umarm-newspapers"

def list_source(folder):
    offset = 0
    while True:
        resp = session.post(root + "/storage/v1/object/list/media",
            json={"prefix":folder,"limit":100,"offset":offset,
                  "sortBy":{"column":"name","order":"asc"}},timeout=90)
        resp.raise_for_status()
        items = resp.json()
        if not isinstance(items,list):
            raise RuntimeError("Unexpected Supabase listing for " + folder)
        for obj in items:
            if not obj.get("id"):
                raise RuntimeError("Unexpected nested directory in " + folder)
            yield folder + obj["name"], obj.get("metadata") or {}
        if len(items) < 100:
            return
        offset += len(items)

def list_r2():
    token = None
    while True:
        kwargs = {"Bucket":bucket,"Prefix":"newspapers/","MaxKeys":1000}
        if token: kwargs["ContinuationToken"] = token
        resp = r2.list_objects_v2(**kwargs)
        for obj in resp.get("Contents",[]):
            yield obj["Key"],obj["Size"]
        if not resp.get("IsTruncated"): break
        token = resp["NextContinuationToken"]

source = {}
issues = collections.Counter()
for short, years in manifest["publications"].items():
    publication = prefixes[short]
    for year, dates in sorted(years.items()):
        for date in sorted(set(dates)):
            folder = f"newspapers/{publication}/{date}/"
            n = 0
            for key,meta in list_source(folder):
                if key in source: raise RuntimeError("Duplicate source key " + key)
                raw_size = meta.get("size")
                source[key] = int(raw_size) if raw_size is not None else None
                n += 1
            if not n: raise RuntimeError("Empty source issue " + folder)
            issues[publication] += 1

dest = dict(list_r2())
missing = sorted(set(source) - set(dest))
extra = sorted(set(dest) - set(source))
size_mismatch = sorted(k for k in source.keys() & dest.keys()
                       if source[k] is not None and source[k] != dest[k])
report = {
 "status":"success" if not (missing or extra or size_mismatch) else "mismatch",
 "source_objects":len(source),"r2_objects":len(dest),
 "issues_by_publication":dict(issues),
 "source_by_publication":dict(collections.Counter(k.split("/")[1] for k in source)),
 "r2_by_publication":dict(collections.Counter(k.split("/")[1] for k in dest)),
 "source_sizes_available":sum(v is not None for v in source.values()),
 "missing_count":len(missing),"extra_count":len(extra),"size_mismatch_count":len(size_mismatch),
 "missing":missing[:200],"extra":extra[:200],"size_mismatch":size_mismatch[:200],
 "note":"Object key/size audit only; original migration verified SHA-256 at transfer time. No R2 mutations."
}
Path("migration-reports").mkdir(exist_ok=True)
Path("migration-reports/full-r2-reconciliation.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps({k:v for k,v in report.items() if k not in ("missing","extra","size_mismatch")},indent=2))
if report["status"] != "success": sys.exit(1)
