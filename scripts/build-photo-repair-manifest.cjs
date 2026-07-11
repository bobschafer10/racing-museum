const fs = require("fs");
const path = require("path");

const INPUT = "bad-photo-storage-files.txt";
const OUTPUT = "photo-storage-repair-manifest.csv";
const PREFIX = "photos/master/";

if (!fs.existsSync(INPUT)) {
  console.error(`Missing input file: ${INPUT}`);
  console.error("Save your Supabase exported list as bad-photo-storage-files.txt first.");
  process.exit(1);
}

const lines = fs.readFileSync(INPUT, "utf8")
  .split(/\r?\n/)
  .map(x => x.trim())
  .filter(x => x.startsWith(PREFIX));

const rows = [["old_path", "new_path", "action", "status"]];

for (const oldPath of lines) {
  const oldName = oldPath.replace(PREFIX, "");

  let fixedName = oldName
    .replace(/_(\d{4})-/, "_$1_")
    .replace(/_unknown_year_/, "_unknown-year_")
    .replace(/_unknow-year_/, "_unknown-year_")
    .replace(/post-/, "post_")
    .replace(/photo-/, "photo_")
    .trim();

  const match = fixedName.match(/^(.+)_(\d{4}|unknown-year)_(.+)$/);

  if (!match) {
    rows.push([oldPath, "", "REVIEW", "Could not parse track/year"]);
    continue;
  }

  const trackSlug = match[1];
  const year = match[2];

  const newPath = `${PREFIX}${trackSlug}/${year}/${fixedName}`;
  const action = fixedName === oldName ? "MOVE" : "RENAME_AND_MOVE";

  rows.push([oldPath, newPath, action, "READY"]);
}

const csv = rows
  .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(","))
  .join("\n");

fs.writeFileSync(OUTPUT, csv);

console.log(`Read ${lines.length} files`);
console.log(`Created ${OUTPUT}`);