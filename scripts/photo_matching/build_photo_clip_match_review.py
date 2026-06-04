from pathlib import Path
import csv
import torch
import open_clip
from PIL import Image
from tqdm import tqdm
import numpy as np


ROOT = Path(r"C:\Users\schaf\racing-museum")

KNOWN_DIR = ROOT / "public" / "photos"
UNKNOWN_DIR = Path(r"C:\Users\schaf\Desktop\PHOTOS-UNKNOWN")

OUTPUT_CSV = ROOT / "scripts" / "photo_matching" / "photo_clip_match_review.csv"
KNOWN_EMBED_CACHE = ROOT / "scripts" / "photo_matching" / "known_clip_embeddings.npz"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

TOP_MATCHES = 5
MAX_KNOWN_PHOTOS = 2000
MAX_UNKNOWN_PHOTOS = 200


def list_images(folder: Path):
    files = []
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS:
            files.append(p)
    return sorted(files)


def parse_museum_filename(file_name: str):
    stem = Path(file_name).stem
    parts = stem.split("_")

    return {
        "track_slug": parts[0] if len(parts) > 0 else "",
        "year": parts[1] if len(parts) > 1 else "",
        "driver_slug": parts[2] if len(parts) > 2 else "",
        "photographer_slug": parts[3] if len(parts) > 3 else "",
        "credit_type": parts[4] if len(parts) > 4 else "",
        "sequence": parts[5] if len(parts) > 5 else "",
    }


def load_model():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32",
        pretrained="laion2b_s34b_b79k"
    )

    model = model.to(device)
    model.eval()

    return model, preprocess, device


def embed_image(path: Path, model, preprocess, device):
    try:
        image = Image.open(path).convert("RGB")
        image_tensor = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            features = model.encode_image(image_tensor)
            features = features / features.norm(dim=-1, keepdim=True)

        return features.cpu().numpy()[0]

    except Exception as e:
        print(f"Could not process image: {path} | {e}")
        return None


def build_known_cache(model, preprocess, device):
    known_files = list_images(KNOWN_DIR)[:MAX_KNOWN_PHOTOS]
    print(f"Known photos for CLIP cache: {len(known_files)}")

    vectors = []
    metadata = []

    for p in tqdm(known_files, desc="Embedding known photos"):
        vec = embed_image(p, model, preprocess, device)
        if vec is None:
            continue

        parsed = parse_museum_filename(p.name)

        vectors.append(vec)
        metadata.append({
            "known_file": str(p),
            "known_file_name": p.name,
            "track_slug": parsed["track_slug"],
            "year": parsed["year"],
            "driver_slug": parsed["driver_slug"],
            "photographer_slug": parsed["photographer_slug"],
        })

    vectors = np.array(vectors, dtype=np.float32)

    KNOWN_EMBED_CACHE.parent.mkdir(parents=True, exist_ok=True)

    np.savez_compressed(
        KNOWN_EMBED_CACHE,
        vectors=vectors,
        metadata=np.array(metadata, dtype=object)
    )

    print(f"Wrote CLIP cache: {KNOWN_EMBED_CACHE}")
    return vectors, metadata


def load_known_cache():
    if not KNOWN_EMBED_CACHE.exists():
        return None, None

    data = np.load(KNOWN_EMBED_CACHE, allow_pickle=True)
    vectors = data["vectors"]
    metadata = list(data["metadata"])

    print(f"Loaded CLIP cache: {len(metadata)} known photos")
    return vectors, metadata


def get_known_embeddings(model, preprocess, device):
    vectors, metadata = load_known_cache()

    if vectors is not None and metadata is not None:
        return vectors, metadata

    return build_known_cache(model, preprocess, device)


def confidence_label(score):
    # CLIP cosine similarity: higher is better.
    # These labels are rough and will need tuning after review.
    if score >= 0.95:
        return "very_high"
    if score >= 0.90:
        return "high"
    if score >= 0.84:
        return "medium"
    if score >= 0.78:
        return "low_clue"
    return "very_low"


def main():
    print("Starting CLIP visual photo match review...")

    model, preprocess, device = load_model()
    known_vectors, known_metadata = get_known_embeddings(model, preprocess, device)

    unknown_files = list_images(UNKNOWN_DIR)[:MAX_UNKNOWN_PHOTOS]
    print(f"Unknown photos for CLIP review: {len(unknown_files)}")

    output_rows = []

    for unknown_path in tqdm(unknown_files, desc="Matching unknown photos"):
        unknown_vec = embed_image(unknown_path, model, preprocess, device)

        if unknown_vec is None:
            output_rows.append({
                "unknown_file": str(unknown_path),
                "unknown_file_name": unknown_path.name,
                "best_score": "",
                "best_confidence": "unreadable",
                "review_action": "",
                "notes": "Could not process image",
            })
            continue

        scores = known_vectors @ unknown_vec
        top_indexes = np.argsort(scores)[::-1][:TOP_MATCHES]

        row = {
            "unknown_file": str(unknown_path),
            "unknown_file_name": unknown_path.name,
        }

        best_score = float(scores[top_indexes[0]]) if len(top_indexes) else 0
        row["best_score"] = round(best_score, 4)
        row["best_confidence"] = confidence_label(best_score)

        for match_num, idx in enumerate(top_indexes, start=1):
            meta = known_metadata[idx]
            score = float(scores[idx])

            row[f"match_{match_num}_score"] = round(score, 4)
            row[f"match_{match_num}_file_name"] = meta["known_file_name"]
            row[f"match_{match_num}_track_slug"] = meta["track_slug"]
            row[f"match_{match_num}_year"] = meta["year"]
            row[f"match_{match_num}_driver_slug"] = meta["driver_slug"]
            row[f"match_{match_num}_photographer_slug"] = meta["photographer_slug"]

        best = known_metadata[top_indexes[0]]
        row["suggested_track_slug"] = best["track_slug"]
        row["suggested_year"] = best["year"]
        row["suggested_driver_slug"] = best["driver_slug"]
        row["suggested_photographer_slug"] = best["photographer_slug"]

        row["review_action"] = ""
        row["final_track_slug"] = ""
        row["final_year"] = ""
        row["final_driver_slug"] = ""
        row["final_photographer_slug"] = ""
        row["final_file_name"] = ""
        row["notes"] = ""

        output_rows.append(row)

    fieldnames = [
        "unknown_file",
        "unknown_file_name",
        "best_score",
        "best_confidence",
    ]

    for match_num in range(1, TOP_MATCHES + 1):
        fieldnames.extend([
            f"match_{match_num}_score",
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

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print("")
    print("Done.")
    print(f"Wrote CLIP review file:")
    print(OUTPUT_CSV)
    print("")
    print("No files were renamed.")


if __name__ == "__main__":
    main()