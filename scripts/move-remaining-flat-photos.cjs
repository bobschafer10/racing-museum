require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "media";

const remaining = [
"photos/master/hales-corners-speedway_unknown-year-russ-scheffler_unknown-photographer_photo_333.jpg",
"photos/master/mississippi-thunder-speedway_unknown-year-joe-provinzino_unknown-photographer_photo_333.jpg",
"photos/master/wisconsin-international-raceway_unknown-year-dick-lucht_dennis-satorius_post_333.jpg",
"photos/master/yellow-river-speedway_unknown-year_dwight-faultersack_kurt-luoma_photo_333.jpg",
"photos/master/yellow-river-speedway_unknown-year_mark-kraus_kurt-luoma_photo_333.jpg",
"photos/master/yellow-river-speedway_unknown-year_marty-schwantes_kurt-luoma_photo_333.jpg",
"photos/master/yellow-river-speedway_unknown-year_marty-schwantes_kurt-luoma_photo_430.jpg"
];

function buildNewPath(oldPath) {
  const prefix = "photos/master/";
  let fileName = oldPath.replace(prefix, "");

  fileName = fileName.replace("_unknown-year-", "_unknown-year_");

  const match = fileName.match(/^(.+)_(\d{4}|unknown-year)_(.+)$/);

  if (!match) {
    throw new Error(`Could not parse: ${oldPath}`);
  }

  const trackSlug = match[1];
  const year = match[2];

  return `${prefix}${trackSlug}/${year}/${fileName}`;
}

(async () => {
  let moved = 0;
  let deletedDuplicates = 0;
  let failed = 0;

  for (const oldPath of remaining) {
    const newPath = buildNewPath(oldPath);

    console.log(`COPY: ${oldPath} -> ${newPath}`);

    const { error: copyError } = await supabase.storage
      .from(BUCKET)
      .copy(oldPath, newPath);

    if (copyError) {
      if (copyError.message.includes("already exists")) {
        console.log(`DESTINATION EXISTS - deleting flat duplicate: ${oldPath}`);

        const { error: deleteError } = await supabase.storage
          .from(BUCKET)
          .remove([oldPath]);

        if (deleteError) {
          console.error(`DELETE FAILED: ${oldPath}`, deleteError.message);
          failed++;
        } else {
          deletedDuplicates++;
        }

        continue;
      }

      console.error(`COPY FAILED: ${oldPath}`, copyError.message);
      failed++;
      continue;
    }

    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove([oldPath]);

    if (deleteError) {
      console.error(`DELETE FAILED: ${oldPath}`, deleteError.message);
      failed++;
      continue;
    }

    moved++;
  }

  console.log("DONE");
  console.log({ moved, deletedDuplicates, failed });
})();