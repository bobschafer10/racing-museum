Upper Midwest Auto Racing Museum - Photo Manager v2

IMPORTANT:
Keep your .env file from the working Phase 1 folder. Do not share it.
Your working values should be:

SUPABASE_STORAGE_BUCKET=media
SUPABASE_PHOTOS_TABLE=photos
STORAGE_ROOT_FOLDER=photos/master
MAX_BATCH_SIZE=30

INSTALL / UPDATE
1. Unzip this package.
2. Copy your existing .env file into the new museum-photo-manager folder.
3. Open Command Prompt in the folder.
4. Run:
   npm install

COMMANDS
Menu mode:
   npm run menu

Dry run upload:
   npm run dry-run

Upload:
   npm run upload

Upload and move completed files to uploaded-done:
   npm run upload-move-done

WHAT VERSION 2 ADDS
1. Menu screen
2. Search photos by filename, slug, year, photographer, driver, or photo_id
3. Verify one photo_id against expected Storage path
4. Rename/move one photo_id using a corrected filename
5. Replace the image for one photo_id while keeping the database row unchanged
6. Better summary counts after upload

FILENAME FORMAT
trackslug_year_driverslug_photographerslug_credit_sequence.jpg

Example:
milwaukee-mile_unknown-year_dick-trickle_trickle-memorial_photo_455.jpg

STORAGE RESULT
media/photos/master/milwaukee-mile/unknown-year/milwaukee-mile_unknown-year_dick-trickle_trickle-memorial_photo_455.jpg

SAFETY NOTES
- Always run npm run dry-run before npm run upload.
- Rename/move requires typing YES before changing Storage/database.
- Replace requires exactly one image in the replace-file folder.
- Version 2 does not delete photos. Delete will be added later after we build more safeguards.
