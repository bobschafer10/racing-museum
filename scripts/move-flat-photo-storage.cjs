require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "media";
const INPUT = "photo-storage-repair-dry-run.csv";

function parseCsvLine(line) {
  return line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
    ?.map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
}

const lines = fs.readFileSync(INPUT, "utf8").split(/\r?\n/).filter(Boolean);
const rows = lines.slice(1).map(parseCsvLine);

(async () => {
  let moved = 0;
  let skipped = 0;
  let failed = 0;
  let deletedDuplicates = 0;

  for (const row of rows) {
    const [oldPath, newPath, action] = row;

    if (!oldPath || !newPath || action === "REVIEW") {
      console.log(`SKIP: ${oldPath}`);
      skipped++;
      continue;
    }

    console.log(`COPY: ${oldPath} -> ${newPath}`);

    const { error: copyError } = await supabase.storage
      .from(BUCKET)
      .copy(oldPath, newPath);

    if (copyError) {
      if (copyError.message && copyError.message.includes("already exists")) {
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