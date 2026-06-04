from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
NEWSPAPER_ROOT = ROOT / "public" / "media" / "newspapers" / "midwest-racing-news"


def main():
    for issue_dir in sorted(NEWSPAPER_ROOT.iterdir()):
        if not issue_dir.is_dir():
            continue

        meta_path = issue_dir / "meta.json"
        ocr_dir = issue_dir / "ocr"

        if not meta_path.exists() or not ocr_dir.exists():
            continue

        all_text = []

        for txt_file in sorted(ocr_dir.glob("*.txt")):
            text = txt_file.read_text(encoding="utf-8", errors="ignore")
            all_text.append(text)

        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        meta["ocr_complete"] = True
        meta["search_text"] = "\n".join(all_text)[:50000]

        if "highlights" not in meta:
            meta["highlights"] = []

        if "featured_tracks" not in meta:
            meta["featured_tracks"] = []

        if "featured_drivers" not in meta:
            meta["featured_drivers"] = []

        if "tags" not in meta:
            meta["tags"] = []

        if "notes" not in meta:
            meta["notes"] = ""

        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        print(f"{issue_dir.name}: OCR search text updated")

    print("Done building newspaper metadata.")


if __name__ == "__main__":
    main()