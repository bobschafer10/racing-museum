Museum Publication Manager v1.3

Adds official cover handling for programs/yearbooks.

What it does:
- Reads publication folders from publication-upload-batch
- Sorts page images numerically
- Uploads numbered pages as 001.jpg, 002.jpg, 003.jpg, etc.
- Generates program.json
- Creates/uploads front-cover.jpg from the first page
- Creates/uploads back-cover.jpg from the last page
- Creates/uploads thumbnail.jpg from the front cover
- Updates public/data/race-programs-manifest.json

Commands:
npm install
npm run publications-dry-run
npm run publications-upload

Expected folder:
publication-upload-batch/1964-eastern-wisconsin-stock-car-association-yearbook/
  1.jpg
  2.jpg
  ...

.env additions:
PUBLICATIONS_ROOT_FOLDER=programs
MAX_PUBLICATION_FOLDERS=5
WEBSITE_ROOT=..
RACE_PROGRAMS_MANIFEST=public/data/race-programs-manifest.json
PUBLICATION_PAGE_PAD_WIDTH=3

After upload, git add/commit/push is still needed because the website reads the local manifest.
