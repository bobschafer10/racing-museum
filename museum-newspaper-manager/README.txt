Museum Newspaper Manager v1.0

Purpose:
- Upload scanned newspaper issue folders to Supabase Storage.
- Generate ordered page names: 001.jpg, 002.jpg, etc.
- Generate front-cover.jpg, back-cover.jpg, thumbnail.jpg.
- Generate newspaper.json.
- Add/update public/data/newspapers-manifest.json.

Recommended folder format inside newspaper-upload-batch:

  publication-slug_YYYY-MM-DD

Examples:

  midwest-racing-news_1959-04-15
  checkered-flag-racing-news_1969-07-01
  national-speed-sport-news_1978-05-31

Optional custom issue slug:

  midwest-racing-news_1959-04-15_mrn-1959-04-15

Upload destination:

  media/newspapers/<publicationSlug>/<issueSlug>/

Commands:

  npm install
  npm run newspapers-dry-run
  npm run newspapers-upload

After upload, commit the manifest change:

  git add .
  git commit -m "Add newspaper issues"
  git push

Notes:
- Keep your local page filenames however they scan/export.
- The manager uploads ordered copies as 001.jpg, 002.jpg, etc.
- The manager creates front-cover.jpg from the first ordered page and back-cover.jpg from the last ordered page.
- Existing numbered pages are skipped by default; generated files use upsert/replace.
