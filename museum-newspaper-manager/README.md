# Museum Newspaper Manager v1.2

Adds OCR-based museum summaries for newspaper issues.

## Folder names supported

Standard:

```text
checkered-flag-racing-news_1970-04-30
midwest-racing-news_1959-04-15
national-speed-sport-news_1961-07-01
```

Shortcuts:

```text
CFRN 4.30.70
MRN 4.15.59
NSSN 7.1.61
```

## Page names supported

```text
Page 1.jpg
Page 2-3.jpg
Page 4-5.jpg
Page 20.jpg
```

or numbered files like:

```text
1.jpg
2.jpg
3.jpg
```

## Commands

```cmd
npm install
npm run newspapers-dry-run
npm run newspapers-upload
```

## What it creates

For each issue it uploads:

```text
001.jpg
002-003.jpg
004-005.jpg
front-cover.jpg
back-cover.jpg
thumbnail.jpg
newspaper.json
ocr.txt
```

It also updates:

```text
public/data/newspapers-manifest.json
```

## OCR summary

V1.2 OCRs up to three representative files:

1. front cover / first page
2. first inside spread
3. final page

Then it writes:

```json
summary
highlights
ocrTextPath
ocrConfidence
```

into `newspaper.json` and the manifest.
