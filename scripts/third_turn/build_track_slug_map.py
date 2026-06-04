from pathlib import Path
import pandas as pd

INPUT_FILE = Path("scripts/third_turn/output/wisconsin_challenge_series_supabase_review.csv")

CONFIG_DIR = Path("scripts/third_turn/config")
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = CONFIG_DIR / "track_slug_map.csv"

df = pd.read_csv(INPUT_FILE)

track_map = (
    df[["track_name_from_url", "track_display", "track_slug_guess", "track_url"]]
    .drop_duplicates()
    .sort_values(["track_name_from_url", "track_display"])
)

track_map["museum_track_slug"] = track_map["track_slug_guess"] + "-wi"
track_map["review_notes"] = ""

# Fix known non-Wisconsin tracks
track_map.loc[
    track_map["track_display"].str.contains("IL", na=False),
    "museum_track_slug"
] = track_map["track_slug_guess"] + "-il"

track_map = track_map[
    [
        "track_name_from_url",
        "track_display",
        "track_slug_guess",
        "museum_track_slug",
        "track_url",
        "review_notes",
    ]
]

track_map.to_csv(OUTPUT_FILE, index=False)

print("Track slug map created.")
print(f"Exported {len(track_map)} unique tracks.")
print(f"Saved to: {OUTPUT_FILE}")