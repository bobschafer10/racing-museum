from pathlib import Path
import csv
import re
from PIL import Image
import imagehash

MAX_KNOWN_PHOTOS = 2000
MAX_UNKNOWN_PHOTOS = 200


# ============================================================
# CONFIG
# ============================================================

ROOT = Path(r"C:\Users\schaf\racing-museum")

# Known/tagged museum photos
KNOWN_DIR = ROOT / "public" / "photos"

# CHANGE THIS to your unknown photo folder
UNKNOWN_DIR = Path(r"C:\Users\schaf\Desktop\PHOTOS-UNKNOWN")
# Output review file
OUTPUT_CSV = ROOT / "scripts" / "photo_matching" / "photo_match_review.csv"

# Cache file so the known photo fingerprints do not need to rebuild every time
KNOWN_HASH_CACHE = ROOT / "scripts" / "photo_matching" / "known_photo_hash_cache.csv"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

TOP_MATCHES = 5


# ============================================================
# HELPERS
# ============================================================

def parse_museum_filename(file_name: str):
    """
    Expected museum format:
    track_slug_year_driver_slug_photographer_slug_photo_sequence.ext

    Example:
    141-speedway_2013_rod-snellenberger_unknown-photographer_photo_001.jpg
    """

    stem = Path(file_name).stem
    parts = stem.split("_")

    track_slug = parts[0] if len(parts) > 0 else ""
    year = parts[1] if len(parts) > 1 else ""
    driver_slug = parts[2] if len(parts) > 2 else ""
    photographer_slug = parts[3] if len(parts) > 3 else ""
    credit_type = parts[4] if len(parts) > 4 else ""
    sequence = parts[5] if len(parts) > 5 else ""

    return {
        "track_slug": track_slug,
        "year": year,
        "driver_slug": driver_slug,
        "photographer_slug": photographer_slug,
        "credit_type": credit_type,
        "sequence": sequence,
    }


def list_images(folder: Path):
    if not folder.exists():
        raise FileNotFoundError(f"Folder does not exist: {folder}")

    files = []
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS:
            files.append(p)

    return sorted(files)


def compute_hashes(image_path: Path):
    """
    Creates several perceptual hashes.
    These are good for duplicate / near-duplicate matching.
    """

    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")

            return {
                "ahash": str(imagehash.average_hash(img)),
                "phash": str(imagehash.phash(img)),
                "dhash": str(imagehash.dhash(img)),
                "whash": str(imagehash.whash(img)),
            }

    except Exception as e:
        print(f"Could not read image: {image_path} | {e}")
        return None


def hash_distance(hash_a: str, hash_b: str):
    return imagehash.hex_to_hash(hash_a) - imagehash.hex_to_hash(hash_b)


def combined_distance(a, b):
    """
    Lower is better.
    0 = identical by hash.
    """

    distances = []

    for key in ["ahash", "phash", "dhash", "whash"]:
        if a.get(key) and b.get(key):
            distances.append(hash_distance(a[key], b[key]))

    if not distances:
        return 9999

    return sum(distances)


def load_known_cache():
    if not KNOWN_HASH_CACHE.exists():
        return None

    rows = []
    with KNOWN_HASH_CACHE.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    return rows


def build_known_cache():
    print("Building known photo hash cache...")

    known_files = list_images(KNOWN_DIR)
    known_files = known_files[:MAX_KNOWN_PHOTOS]
    print(f"Known photos found: {len(known_files)}")

    rows = []

    for idx, p in enumerate(known_files, start=1):
        if idx % 500 == 0:
            print(f"  processed {idx}/{len(known_files)} known photos...")

        hashes = compute_hashes(p)
        if not hashes:
            continue

        parsed = parse_museum_filename(p.name)

        rows.append({
            "known_file": str(p),
            "known_file_name": p.name,
            "track_slug": parsed["track_slug"],
            "year": parsed["year"],
            "driver_slug": parsed["driver_slug"],
            "photographer_slug": parsed["photographer_slug"],
            "credit_type": parsed["credit_type"],
            "sequence": parsed["sequence"],
            "ahash": hashes["ahash"],
            "phash": hashes["phash"],
            "dhash": hashes["dhash"],
            "whash": hashes["whash"],
        })

    KNOWN_HASH_CACHE.parent.mkdir(parents=True, exist_ok=True)

    with KNOWN_HASH_CACHE.open("w", encoding="utf-8-sig", newline="") as f:
        fieldnames = [
            "known_file",
            "known_file_name",
            "track_slug",
            "year",
            "driver_slug",
            "photographer_slug",
            "credit_type",
            "sequence",
            "ahash",
            "phash",
            "dhash",
            "whash",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote known cache: {KNOWN_HASH_CACHE}")
    return rows


def get_known_rows():
    cached = load_known_cache()
    if cached:
        print(f"Loaded known hash cache: {len(cached)} rows")
        return cached

    return build_known_cache()


def get_confidence_label(distance):
    """
    Rough labels only.
    These are not guarantees.
    """

    if distance <= 8:
        return "very_high_near_duplicate"
    if distance <= 16:
        return "high_possible_duplicate"
    if distance <= 28:
        return "medium_visual_match"
    if distance <= 42:
        return "low_possible_clue"

    return "very_low"


def main():
    print("Starting photo match review build...")

    known_rows = get_known_rows()

    unknown_files = list_images(UNKNOWN_DIR)
    unknown_files = unknown_files[:MAX_UNKNOWN_PHOTOS]
    print(f"Unknown photos found: {len(unknown_files)}")

    output_rows = []

    for idx, unknown_path in enumerate(unknown_files, start=1):
        if idx % 50 == 0:
            print(f"  processed {idx}/{len(unknown_files)} unknown photos...")

        unknown_hashes = compute_hashes(unknown_path)

        if not unknown_hashes:
            output_rows.append({
                "unknown_file": str(unknown_path),
                "unknown_file_name": unknown_path.name,
                "best_confidence": "unreadable",
                "review_action": "",
                "final_file_name": "",
                "notes": "Could not read image",
            })
            continue

        scored = []

        for known in known_rows:
            dist = combined_distance(unknown_hashes, known)
            scored.append((dist, known))

        scored.sort(key=lambda x: x[0])
        top = scored[:TOP_MATCHES]

        row = {
            "unknown_file": str(unknown_path),
            "unknown_file_name": unknown_path.name,
        }

        best_distance = top[0][0] if top else 9999
        row["best_distance"] = best_distance
        row["best_confidence"] = get_confidence_label(best_distance)

        # Fill top match columns
        for match_num in range(1, TOP_MATCHES + 1):
            if match_num <= len(top):
                dist, known = top[match_num - 1]

                row[f"match_{match_num}_distance"] = dist
                row[f"match_{match_num}_file_name"] = known["known_file_name"]
                row[f"match_{match_num}_track_slug"] = known["track_slug"]
                row[f"match_{match_num}_year"] = known["year"]
                row[f"match_{match_num}_driver_slug"] = known["driver_slug"]
                row[f"match_{match_num}_photographer_slug"] = known["photographer_slug"]
            else:
                row[f"match_{match_num}_distance"] = ""
                row[f"match_{match_num}_file_name"] = ""
                row[f"match_{match_num}_track_slug"] = ""
                row[f"match_{match_num}_year"] = ""
                row[f"match_{match_num}_driver_slug"] = ""
                row[f"match_{match_num}_photographer_slug"] = ""

        # Suggested values from best match
        if top:
            best = top[0][1]
            row["suggested_track_slug"] = best["track_slug"]
            row["suggested_year"] = best["year"]
            row["suggested_driver_slug"] = best["driver_slug"]
            row["suggested_photographer_slug"] = best["photographer_slug"]
        else:
            row["suggested_track_slug"] = ""
            row["suggested_year"] = ""
            row["suggested_driver_slug"] = ""
            row["suggested_photographer_slug"] = ""

        row["review_action"] = ""
        row["final_track_slug"] = ""
        row["final_year"] = ""
        row["final_driver_slug"] = ""
        row["final_photographer_slug"] = ""
        row["final_file_name"] = ""
        row["notes"] = ""

        output_rows.append(row)

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "unknown_file",
        "unknown_file_name",
        "best_distance",
        "best_confidence",
    ]

    for match_num in range(1, TOP_MATCHES + 1):
        fieldnames.extend([
            f"match_{match_num}_distance",
            f"match_{match_num}_file_name",
            f"match_{match_num}_track_slug",
            f"match_{match_num}_year",
            f"match_{match_num}_driver_slug",
            f"match_{match_num}_photographer_slug",
        ])

    fieldnames.extend([
        "suggested_track_slug",
        "suggested_year",
        "suggested_driver_slug",
        "suggested_photographer_slug",
        "review_action",
        "final_track_slug",
        "final_year",
        "final_driver_slug",
        "final_photographer_slug",
        "final_file_name",
        "notes",
    ])

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print("")
    print("Done.")
    print(f"Wrote review file:")
    print(OUTPUT_CSV)
    print("")
    print("No files were renamed.")


if __name__ == "__main__":
    main()