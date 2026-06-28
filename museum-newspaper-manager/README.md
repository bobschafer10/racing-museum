# Museum Newspaper Manager v1.2.2.2

Safe OCR patch for the newspaper uploader.

## What changed

- OCR only runs against the original full-size first page.
- OCR does not run during dry run unless you use `npm run newspapers-ocr-only`.
- Tiny images, thumbnails, and generated cover copies are skipped.
- OCR has a timeout and falls back to a generic summary instead of stopping the upload.
- Upload still creates `front-cover.jpg`, `back-cover.jpg`, `thumbnail.jpg`, `newspaper.json`, `ocr.txt`, and updates `public/data/newspapers-manifest.json`.

## Commands

```cmd
npm install
npm run newspapers-dry-run
npm run newspapers-upload
```

Optional OCR dry-run test:

```cmd
npm run newspapers-ocr-only
```

## Optional .env settings

```ini
NEWSPAPER_OCR_ENABLED=true
NEWSPAPER_OCR_MAX_PAGES=1
NEWSPAPER_OCR_TIMEOUT_MS=60000
NEWSPAPER_OCR_MIN_WIDTH=500
NEWSPAPER_OCR_MIN_HEIGHT=500
```


## v1.2.2 update

OCR is saved to `ocr.txt` for future search, but public summaries use a clean museum-style template. Raw OCR highlights are not displayed publicly.
