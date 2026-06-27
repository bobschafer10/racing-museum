Upper Midwest Auto Racing Museum - Photo Manager Phase 1

Purpose
-------
Uploads a small batch of museum photos to Supabase Storage and inserts matching rows into the lowercase public.photos table.

This Phase 1 version is intentionally upload-only. It is built to replace the manual Storage upload + CSV import workflow.

What it does
------------
1. Reads photos from photo-upload-batch
2. Allows a maximum of 30 photos per run
3. Parses the filename into museum fields
4. Uploads each photo to Supabase Storage bucket: photos
5. Inserts each row into database table: photos
6. Skips duplicates if the storage object or database row already exists
7. Creates a CSV report in upload-reports
8. Supports dry-run testing before making changes

Expected filename format
------------------------
trackslug_year_driverslug_photographerslug_credit_sequence.jpg

Example:
141-speedway_1984_dave-sanders_al-fortner_photo_333.jpg

That becomes:
file_name: 141-speedway_1984_dave-sanders_al-fortner_photo_333.jpg
track_slug: 141-speedway
year: 1984
driver_slug: dave-sanders
photographer_slug: al-fortner
credit_type: photo
sequence: 333
needs_review: true

Storage path
------------
Bucket: photos
Path inside bucket:
master/<track_slug>/<year>/<file_name>

Example:
master/141-speedway/1984/141-speedway_1984_dave-sanders_al-fortner_photo_333.jpg

Setup
-----
1. Open this folder in Command Prompt:
   cd "C:\Users\Bob Schafer\racing-museum\museum-photo-manager"

2. Install packages one time:
   npm install

3. Copy .env.example and rename the copy to .env

4. Fill in .env with your Supabase values:
   SUPABASE_URL=your_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

Do not commit or share the .env file.

How to use
----------
1. Put 1 to 30 photos into photo-upload-batch

2. Test first:
   npm run dry-run

3. If dry run looks good, upload:
   npm run upload

4. Check the CSV report in upload-reports

Optional command
----------------
Upload and then move completed files into uploaded-done:
   npm run upload-and-move-done

Important notes
---------------
- Database table is lowercase: photos
- Storage bucket is lowercase: photos
- needs_review is inserted as true
- The script does not delete anything
- The script does not rename or move existing museum photos
- Rename/move/replace/audit tools will be later phases
