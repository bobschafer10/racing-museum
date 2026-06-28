Museum Newspaper Manager v1.1

Purpose:
- Upload scanned newspaper issue folders to Supabase Storage.
- Accept existing shorthand folder names such as CFRN 5.21.70.
- Accept spread page filenames such as Page 2-3.jpg.
- Generate standardized storage names: 001.jpg, 002-003.jpg, etc.
- Generate front-cover.jpg, back-cover.jpg, thumbnail.jpg.
- Generate newspaper.json.
- Add/update public/data/newspapers-manifest.json.

Supported folder formats inside newspaper-upload-batch:

  publication-slug_YYYY-MM-DD
  publication-slug_M.D.YY
  YYYY-MM-DD_publication-slug
  CFRN 5.21.70
  MRN 4.15.59
  NSSN 7.1.61

Publication shortcuts:

  CFRN = checkered-flag-racing-news
  MRN  = midwest-racing-news
  NSSN = national-speed-sport-news

Examples:

  checkered-flag-racing-news_1970-05-21
  CFRN 5.21.70
  midwest-racing-news_1959-04-15
  MRN 4.15.59

Supported page names:

  Page 1.jpg
  Page 2-3.jpg
  Page 4-5.jpg
  Page 20.jpg

These upload as:

  001.jpg
  002-003.jpg
  004-005.jpg
  020.jpg

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
- Keep your local page filenames as scanned/exported.
- The manager uploads standardized copies without renaming your local originals.
- The manager creates front-cover.jpg from the first ordered page and back-cover.jpg from the last ordered page.
- Existing numbered pages are skipped by default; generated files use upsert/replace.
