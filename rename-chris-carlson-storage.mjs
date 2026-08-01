import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "media";
const START_FOLDER = "photos/master";

const OLD_TEXT = "chris-carlson";
const NEW_TEXT = "chris-carlson-wi";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
  );
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Recursively list all files under a Storage folder.
 */
async function listFilesRecursively(folder) {
  const files = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, {
        limit,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      throw new Error(`Could not list ${folder}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const fullPath = folder
        ? `${folder}/${item.name}`
        : item.name;

      /*
       * Actual files normally have metadata.
       * Folder entries normally do not.
       */
      if (item.metadata) {
        files.push(fullPath);
      } else {
        const nestedFiles = await listFilesRecursively(fullPath);
        files.push(...nestedFiles);
      }
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return files;
}

async function main() {
  console.log(`Scanning bucket "${BUCKET}/${START_FOLDER}"...`);

  const allFiles = await listFilesRecursively(START_FOLDER);

  /*
   * Prevent chris-carlson-wi from being matched again because it
   * also contains the text chris-carlson.
   */
  const matches = allFiles.filter((path) => {
    return (
      path.includes(OLD_TEXT) &&
      !path.includes(NEW_TEXT)
    );
  });

  console.log(`Found ${matches.length} matching Storage objects.`);

  if (matches.length === 0) {
    console.log("Nothing needs to be renamed.");
    return;
  }

  console.log("\nObjects to rename:");

  for (const oldPath of matches) {
    const newPath = oldPath.replaceAll(OLD_TEXT, NEW_TEXT);
    console.log(`${oldPath}`);
    console.log(`  -> ${newPath}`);
  }

  /*
   * Change this to true only after reviewing the paths printed above.
   */
  const PERFORM_MOVES = false;

  if (!PERFORM_MOVES) {
    console.log(
      "\nPreview only. Change PERFORM_MOVES to true to perform the moves."
    );
    return;
  }

  let moved = 0;
  let failed = 0;

  for (const oldPath of matches) {
    const newPath = oldPath.replaceAll(OLD_TEXT, NEW_TEXT);

    /*
     * Check whether the destination filename already exists.
     */
    const slashPosition = newPath.lastIndexOf("/");
    const destinationFolder = newPath.substring(0, slashPosition);
    const destinationName = newPath.substring(slashPosition + 1);

    const { data: existing, error: checkError } = await supabase.storage
      .from(BUCKET)
      .list(destinationFolder, {
        limit: 10,
        search: destinationName,
      });

    if (checkError) {
      console.error(
        `CHECK FAILED: ${newPath}: ${checkError.message}`
      );
      failed++;
      continue;
    }

    const destinationExists = existing?.some(
      (item) => item.name === destinationName && item.metadata
    );

    if (destinationExists) {
      console.error(`SKIPPED: Destination already exists: ${newPath}`);
      failed++;
      continue;
    }

    const { error: moveError } = await supabase.storage
      .from(BUCKET)
      .move(oldPath, newPath);

    if (moveError) {
      console.error(
        `FAILED: ${oldPath}: ${moveError.message}`
      );
      failed++;
    } else {
      console.log(`MOVED: ${oldPath} -> ${newPath}`);
      moved++;
    }
  }

  console.log("\nFinished.");
  console.log(`Successfully moved: ${moved}`);
  console.log(`Skipped or failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});