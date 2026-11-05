#!/usr/bin/env python3
"""Read-only inventory of local Midwest Racing News original scans.

Example: python scripts/inventory_local_mrn.py --root "%USERPROFILE%\\Desktop\\MRN"
Produces CSV issue and file inventories; does not contact the network or modify scans.
"""
import argparse
import csv
from datetime import date
from pathlib import Path
import re
import sys

ISSUE = re.compile(r"^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})-(\d+)$")
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".pdf"}

def parse_issue(folder, year):
    match = ISSUE.fullmatch(folder)
    if not match:
        return None, None
    m, d, y, n = map(int, match.groups())
    full_year = (1900 + y if y >= 50 else 2000 + y) if y < 100 else y
    try:
        issue_date = date(full_year, m, d).isoformat()
    except ValueError:
        return None, n
    return (issue_date if full_year == year else None), n

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", required=True, help="Local MRN collection root (contains year directories)")
    p.add_argument("--out", default="mrn-local-inventory", help="Output directory for CSV reports")
    a = p.parse_args()
    root = Path(a.root).expanduser()
    if not root.is_dir():
        p.error(f"MRN folder not found: {root}")
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    issues, files, warnings = [], [], []
    for year_folder in sorted(root.iterdir()):
        if not year_folder.is_dir():
            continue
        if not re.fullmatch(r"19\d{2}|20\d{2}", year_folder.name):
            warnings.append((str(year_folder), "unexpected year folder name"))
            continue
        year = int(year_folder.name)
        for issue_folder in sorted(year_folder.iterdir()):
            if not issue_folder.is_dir():
                warnings.append((str(issue_folder), "unexpected file in year directory"))
                continue
            issue_date, issue_number = parse_issue(issue_folder.name, year)
            if not issue_date:
                warnings.append((str(issue_folder), "issue folder date does not match year or naming pattern"))
            entries = [f for f in issue_folder.rglob("*") if f.is_file()]
            image_files = [f for f in entries if f.suffix.lower() in IMAGE_EXT]
            numbered = [f for f in image_files if re.fullmatch(r"[1-9]\d*", f.stem)]
            page_numbers = sorted(int(f.stem) for f in numbered)
            page_complete = bool(page_numbers) and page_numbers == list(range(1, len(page_numbers) + 1))
            if not page_complete:
                warnings.append((str(issue_folder), "numbered page sequence missing or nonstandard; review before upload"))
            issues.append({"year": year, "issue_date": issue_date or "", "issue_number": issue_number or "",
                           "folder": str(issue_folder), "files": len(entries), "image_files": len(image_files),
                           "numbered_pages": len(numbered), "numbered_pages_complete": page_complete,
                           "total_bytes": sum(f.stat().st_size for f in entries)})
            for f in entries:
                files.append({"year": year, "issue_date": issue_date or "", "folder": str(issue_folder),
                              "relative_file": str(f.relative_to(issue_folder)), "bytes": f.stat().st_size,
                              "image_file": f.suffix.lower() in IMAGE_EXT})
    def write(name, rows, fields):
        with (out / name).open("w", newline="", encoding="utf-8-sig") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
    write("issues.csv", issues, ["year", "issue_date", "issue_number", "folder", "files", "image_files", "numbered_pages", "numbered_pages_complete", "total_bytes"])
    write("files.csv", files, ["year", "issue_date", "folder", "relative_file", "bytes", "image_file"])
    write("warnings.csv", [{"path": p, "warning": w} for p,w in warnings], ["path", "warning"])
    print(f"Read-only inventory complete: {len(issues)} issue folders, {len(files)} files, {len(warnings)} warnings.")
    print(f"Years: {min((x['year'] for x in issues), default='none')} through {max((x['year'] for x in issues), default='none')}")
    print(f"Total size: {sum(x['total_bytes'] for x in issues):,} bytes")
    print(f"Reports: {out.resolve()}")

if __name__ == "__main__":
    main()
