from pathlib import Path
import pandas as pd

INPUT_FILE = Path("scripts/third_turn/output/wisconsin_challenge_series_supabase_review.csv")

CONFIG_DIR = Path("scripts/third_turn/config")
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = CONFIG_DIR / "driver_slug_map.csv"

df = pd.read_csv(INPUT_FILE)

driver_map = (
    df[["winner_name", "winner_slug_guess", "winner_url"]]
    .drop_duplicates()
    .sort_values(["winner_name"])
)

driver_map["museum_driver_slug"] = driver_map["winner_slug_guess"]
driver_map["review_notes"] = ""

driver_map = driver_map[
    [
        "winner_name",
        "winner_slug_guess",
        "museum_driver_slug",
        "winner_url",
        "review_notes",
    ]
]

driver_map.to_csv(OUTPUT_FILE, index=False)

print("Driver slug map created.")
print(f"Exported {len(driver_map)} unique winners.")
print(f"Saved to: {OUTPUT_FILE}")