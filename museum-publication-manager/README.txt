Museum Publication Manager v1.1

Purpose
- Upload program/yearbook folders to Supabase Storage.
- Validate JPG/JPEG page folders.
- Validate existing JSON if present.
- Automatically generate program.json when no JSON exists.

Storage target
- Bucket: from SUPABASE_STORAGE_BUCKET, usually media
- Root folder: from PUBLICATIONS_ROOT_FOLDER, usually programs
- Final path: media/programs/<folder-name>/...

Folder workflow
1. Copy one or more complete publication folders into publication-upload-batch.

Example:
publication-upload-batch/
  1978-lacrosse-interstate-speedway-wi-yearbook/
    page001.jpg
    page002.jpg
    page003.jpg

2. Run dry run:
   npm run publications-dry-run

3. If no JSON exists, the tool generates a program.json for upload and saves a backup here:
   generated-json/<folder-name>/program.json

4. Run upload:
   npm run publications-upload

.env settings
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=media
PUBLICATIONS_ROOT_FOLDER=programs
MAX_PUBLICATION_FOLDERS=5

Notes
- MAX_PUBLICATION_FOLDERS means complete program/yearbook folders, not pages.
- Existing JSON files are validated and uploaded as-is.
- Missing JSON files are generated automatically and uploaded as program.json.
- JPG/JPEG pages are sorted naturally for the generated pages list.
