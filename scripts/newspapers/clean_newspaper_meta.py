from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers" / "midwest-racing-news"

for issue_dir in sorted(NEWSPAPER_ROOT.iterdir()):
    if not issue_dir.is_dir():
        continue

    meta_path = issue_dir / "meta.json"
    if not meta_path.exists():
        continue

    meta = json.loads(meta_path.read_text(encoding="utf-8"))

    meta["highlights"] = []
    meta["featured_tracks"] = meta.get("featured_tracks", [])
    meta["featured_drivers"] = meta.get("featured_drivers", [])
    meta["tags"] = meta.get("tags", [])
    meta["notes"] = meta.get("notes", "")
    meta["ocr_complete"] = bool(meta.get("search_text"))

    meta.pop("search_text", None)

    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Cleaned {issue_dir.name}")

print("Done cleaning newspaper metadata.")