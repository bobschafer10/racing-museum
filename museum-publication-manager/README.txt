Museum Publication Manager v1.2

Purpose
- Upload program/yearbook folders to Supabase Storage.
- Generate ordered program.json automatically.
- Upload pages using zero-padded names so page order is correct: 001.jpg, 002.jpg, 003.jpg.
- Update the website manifest at public/data/race-programs-manifest.json.

Storage target
- Bucket: from SUPABASE_STORAGE_BUCKET, usually media
- Root folder: from PUBLICATIONS_ROOT_FOLDER, usually programs
- Final path: media/programs/<folder-name>/...

Important behavior
- Your original local JPG filenames are not renamed.
- If local files are 1.jpg, 2.jpg, 10.jpg, they upload as 001.jpg, 002.jpg, 010.jpg.
- program.json is generated using the zero-padded filenames.
- If program.json already exists in Storage, v1.2 replaces it so the page list matches the ordered filenames.
- The website manifest is updated locally, so you still need git add / commit / push after upload.

Folder workflow
1. Copy one or more complete publication folders into publication-upload-batch.

Example:
publication-upload-batch/
  1964-eastern-wisconsin-stock-car-yearbook/
    1.jpg
    2.jpg
    3.jpg

2. Run dry run:
   npm run publications-dry-run

3. Review the generated backup JSON:
   generated-json/<folder-name>/program.json

4. Run upload:
   npm run publications-upload

5. Commit and push the updated website manifest:
   cd ..
   git add public/data/race-programs-manifest.json
   git commit -m "Add race program/yearbook"
   git push

.env settings
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=media
PUBLICATIONS_ROOT_FOLDER=programs
MAX_PUBLICATION_FOLDERS=5
WEBSITE_ROOT=..
RACE_PROGRAMS_MANIFEST=public/data/race-programs-manifest.json
PUBLICATION_PAGE_PAD_WIDTH=3

Notes
- MAX_PUBLICATION_FOLDERS means complete program/yearbook folders, not pages.
- Page count is not limited by MAX_PUBLICATION_FOLDERS.
- The manifest path assumes this manager folder is inside C:\Users\schaf\racing-museum\museum-publication-manager.
