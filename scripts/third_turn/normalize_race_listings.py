from pathlib import Path
import pandas as pd
import re
from urllib.parse import unquote

INPUT_FILE = Path("scripts/third_turn/output/wisconsin_challenge_series_race_listings.csv")
TRACK_MAP_FILE = Path("scripts/third_turn/config/track_slug_map.csv")
DRIVER_MAP_FILE = Path("scripts/third_turn/config/driver_slug_map.csv")

OUTPUT_DIR = Path("scripts/third_turn/output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "wisconsin_challenge_series_supabase_review.csv"

def slugify(value):
    if pd.isna(value):
        return ""

    value = str(value).strip().lower()
    value = value.replace("&", " and ")
    value = value.replace("+", " plus ")

    value = re.sub(r"['’]", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    value = value.strip("-")

    return value

def title_from_third_turn_url(url):
    if pd.isna(url) or not str(url).strip():
        return ""

    text = str(url).split("/wiki/")[-1]
    text = unquote(text)
    text = text.replace("_", " ")
    return text.strip()

def clean_race_title_from_url(url):
    title = title_from_third_turn_url(url)

    # remove leading year if present
    title = re.sub(r"^\d{4}\s+", "", title).strip()

    return title

def force_yyyy_mm_dd(value):
    if pd.isna(value):
        return ""

    text = str(value).strip()

    try:
        dt = pd.to_datetime(text, errors="raise")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return text

df = pd.read_csv(INPUT_FILE)

# Force museum/Supabase date format: YYYY-MM-DD
df["race_date"] = df["race_date"].apply(force_yyyy_mm_dd)

df["track_name_from_url"] = df["track_url"].apply(title_from_third_turn_url)
df["track_slug_guess"] = df["track_name_from_url"].apply(slugify)

df["winner_slug_guess"] = df["winner_name"].apply(slugify)

df["race_title"] = df["race_url"].apply(clean_race_title_from_url)

df["race_slug_guess"] = (
    df["season_year"].astype(str)
    + "-"
    + df["race_title"].apply(slugify)
)

df["museum_event_slug_guess"] = (
    df["series_slug"].astype(str)
    + "-"
    + df["season_year"].astype(str)
    + "-"
    + df["race_number"].astype(str).str.zfill(2)
    + "-"
    + df["race_title"].apply(slugify)
)

# Load track slug map and attach final museum track slug
if TRACK_MAP_FILE.exists():
    track_map = pd.read_csv(TRACK_MAP_FILE)

    track_map = track_map[
        [
            "track_name_from_url",
            "track_display",
            "museum_track_slug",
        ]
    ].drop_duplicates()

    df = df.merge(
        track_map,
        on=["track_name_from_url", "track_display"],
        how="left"
    )
else:
    df["museum_track_slug"] = ""

df["museum_track_slug"] = df["museum_track_slug"].fillna("")

df["track_slug_match_status"] = df["museum_track_slug"].apply(
    lambda value: "mapped" if str(value).strip() else "needs_review"
)

# Load driver slug map and attach final museum winner driver slug
if DRIVER_MAP_FILE.exists():
    driver_map = pd.read_csv(DRIVER_MAP_FILE)

    driver_map = driver_map[
        [
            "winner_name",
            "winner_slug_guess",
            "museum_driver_slug",
        ]
    ].drop_duplicates()

    df = df.merge(
        driver_map,
        on=["winner_name", "winner_slug_guess"],
        how="left"
    )

    df = df.rename(columns={
        "museum_driver_slug": "museum_winner_driver_slug"
    })
else:
    df["museum_winner_driver_slug"] = ""

df["museum_winner_driver_slug"] = df["museum_winner_driver_slug"].fillna("")

df["driver_slug_match_status"] = df["museum_winner_driver_slug"].apply(
    lambda value: "mapped" if str(value).strip() else "needs_review"
)

df["source_name"] = "The Third Turn"
df["source_url"] = df["race_url"]

df["import_status"] = "review"
df["review_notes"] = ""

columns = [
    "series_slug",
    "series_name",
    "season_year",
    "race_number",
    "race_date",
    "race_date_raw",

    "race_title",
    "race_slug_guess",
    "museum_event_slug_guess",
    "race_url",

    "track_display",
    "track_name_from_url",
    "track_slug_guess",
    "museum_track_slug",
    "track_slug_match_status",
    "track_url",

    "winner_name",
    "winner_slug_guess",
    "museum_winner_driver_slug",
    "driver_slug_match_status",
    "winner_url",

    "source_name",
    "source_url",
    "source_file",
    "import_status",
    "review_notes",
]

df = df[columns]

df.to_csv(OUTPUT_FILE, index=False)

print("Normalization complete.")
print(f"Exported {len(df)} review rows.")
print(f"Saved to: {OUTPUT_FILE}")

if (df["track_slug_match_status"] == "needs_review").any():
    print("")
    print("WARNING: Some rows did not match the track slug map.")
    print(df[df["track_slug_match_status"] == "needs_review"][[
        "track_name_from_url",
        "track_display",
        "track_slug_guess"
    ]].drop_duplicates())
else:
    print("All race rows matched to museum_track_slug.")

if (df["driver_slug_match_status"] == "needs_review").any():
    print("")
    print("WARNING: Some rows did not match the driver slug map.")
    print(df[df["driver_slug_match_status"] == "needs_review"][[
        "winner_name",
        "winner_slug_guess"
    ]].drop_duplicates())
else:
    print("All race rows matched to museum_winner_driver_slug.")