require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "media";
const PREFIX = "photos/master/";
const TRACK = "wisconsin-international-raceway";
const YEAR = "unknown-year";

(async () => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list("photos/master", { limit: 1000 });

  if (error) throw error;

  let moved = 0;
  let deletedDuplicates = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of data) {
    const name = file.name;

    if (!name.startsWith(`${TRACK}_${YEAR}_`)) {
      skipped++;
      continue;
    }

    const oldPath = `${PREFIX}${name}`;
    const newPath = `${PREFIX}${TRACK}/${YEAR}/${name}`;

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
  console.log({ moved, deletedDuplicates, skipped, failed });
})();