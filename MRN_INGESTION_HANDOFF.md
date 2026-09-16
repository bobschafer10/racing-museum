# Midwest Racing News ingestion handoff

Updated September 15, 2026. **1981 and 1982 ingestion is complete and verified in production. 1983 has not been started.** Preserve original scans and all 1959–1982 material. No storage, manifest, OCR/search, or deployment architecture was changed.

| Year | Local issues | Public pages | Populated OCR/search records | Raceway Park all-words matches | Literal phrase pages | Manifest commit |
|---|---:|---:|---:|---:|---:|---|
| 1981 | 26 | 492 | 492 | 296 | 180 | `9eabe4ee9d345caf5b22d7ff5114c92e22ef5567` |
| 1982 | 26 | 468 | 468 | 241 | 93 | `105143df1aef2a4926c9abf5ead17a385f04872b` |

Both years: zero missing source issues, duplicate dates, missing public pages, blank OCR pages, or failed OCR pages. PostgreSQL phrase-search counts were 177 (1981) and 96 (1982); these differ from literal contiguous-text counts because search tokenization treats punctuation/whitespace differently. 1982 has 34 retained source scan-quality warnings, separate from OCR failures.

## Locations and authoritative systems

- Project: `C:\Users\schaf\racing-museum`.
- Originals: `C:\Users\schaf\Desktop\MRN\1981` and `C:\Users\schaf\Desktop\MRN\1982`. Actual collections contain already split numbered JPEGs in `M-D-YY-issueNumber` folders, not PDFs. Originals were never modified.
- Working directory: `C:\Users\schaf\Desktop\PHOTOS II`.
- Prepared copies/audits: `mrn-prepared-1981` and `mrn-prepared-1982` below that working directory. Page copies were SHA-256 checked against originals; dates came from folder names. First 1982 cover visually confirms April 8, 1982, Vol. XXIV No. 1. No uncertain dates remain.
- Isolated deployment checkout: `C:\Users\schaf\Desktop\PHOTOS II\mrn-site-1981` (also used for 1982). Main project checkout has unrelated preexisting changes, including a stale locally edited manifest; **do not commit those indiscriminately**.
- GitHub: `https://github.com/bobschafer10/racing-museum.git`, production branch `main`.
- Production: `https://racing-museum.vercel.app`. Authoritative deployment status context: `Vercel – racing-museum`. The separate `racing-museum-r786` project is not the production target used for acceptance.
- Live Supabase project: `szvkleurojiwqkkztxtr`; bucket `media`.
- Objects: `newspapers/midwest-racing-news/YYYY-MM-DD/1.jpg`, `2.jpg`, etc. Numeric page names are unpadded. Each issue also has `front-cover.jpg`, `back-cover.jpg`, `thumbnail.jpg`, `newspaper.json`, and `ocr.txt`.
- Public object URL base: `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/`.
- Existing archive manifest: `public/data/newspapers-manifest.json`, an array of issue metadata objects. Public copy: `/data/newspapers-manifest.json`.
- Existing database: `public.newspaper_ocr_pages`; unique conflict key `storage_path`, publication code `midwest-racing-news`, ISO `issue_date`, page label `N.jpg`, `status`, `ocr_text`, engine/model fields and `ocr_json` source hash/quality warning. Existing generated `search_vector` supplies full-text indexing. No new tables, columns, RPCs, or search system were created.
- Existing public search: `/api/newspaper-search` and existing RPCs `search_museum_ocr` / `search_museum_ocr_facets`; existing newspaper-table full-text fallback uses `websearch` with `simple` configuration.
- Credentials were read from existing project `.env.local`; reusable tool loads existing Next.js `.env*` configuration. Required variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. No secret values are checked in.

## Ingestion and commands actually used

The ad hoc scripts are preserved under `scripts/newspapers/mrn/history/` for reference. Their original working paths are below. **Do not rerun these completed-year commands**: preparation refuses an existing output directory, and finalization includes writes scoped to its fixed year.

```powershell
Set-Location 'C:\Users\schaf\Desktop\PHOTOS II'
$mrnPython = 'C:\Users\schaf\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$mrnNode = 'C:\Users\schaf\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'

# 1981 preparation, upload, live comparison, covers/metadata, OCR, final indexing
& $mrnPython prepare_mrn_1981.py
& $mrnNode upload_mrn_1981.cjs
& $mrnNode inspect_mrn_live.cjs
& $mrnNode finish_mrn_1981.cjs assets
$env:OMP_THREAD_LIMIT = '1'
& $mrnPython ocr_mrn_1981.py
& $mrnNode finish_mrn_1981.cjs sync
& $mrnNode finish_mrn_1981.cjs final
& $mrnNode merge_live_mrn_manifest.cjs
& $mrnNode verify_mrn_deployment.cjs
& $mrnNode recheck_mrn_urls.cjs

# 1982; sync was also used once during OCR, then final synchronized all 468
& $mrnPython prepare_mrn_1982.py
& $mrnNode upload_mrn_1982.cjs
& $mrnNode finish_mrn_1982.cjs assets
$env:OMP_THREAD_LIMIT = '1'
& $mrnPython ocr_mrn_1982.py
& $mrnNode finish_mrn_1982.cjs sync
& $mrnNode verify_mrn_1982_storage.cjs
& $mrnNode finish_mrn_1982.cjs final
& $mrnPython merge_mrn_1982_manifest.py
& $mrnNode verify_mrn_1982_deployment.cjs
```

Preparation validated date uniqueness, consecutive issue/page numbers and JPEG decoding, then copied pages byte-for-byte into the required folder structure with per-issue/page audits. Page upload used insert-only objects (`upsert=false`), four workers and retries. Existing objects were retained.

Metadata followed existing museum issue metadata: the same 25 fields, date/title/publication/year, issue number, volume XXIII/XXIV, page URL array and cover/OCR URLs. Safe summary text and empty highlights were retained. 1981 followed inspected 1980 templates; 1982 inspected 1981-04-02, 1981-07-02 and 1981-12-10. Covers use first/last page JPEG quality 88; thumbnail width 520 without enlargement, JPEG quality 82, through the existing manager's Sharp dependency.

OCR ran native `C:\Program Files\Tesseract-OCR\tesseract.exe SOURCE OUTPUT -l eng --psm 11` on every full-resolution page, four workers, `OMP_THREAD_LIMIT=1`, 180-second page timeout. Per-page `.txt`/`.json` results were retained. Complete nonblank results were upserted to the existing `newspaper_ocr_pages` table on `storage_path`; generated indexing was verified. Per-issue `ocr.txt` combines `--- N.jpg ---` sections; final metadata stores the actual page OCR count.

The 1981 checked-in manifest retains historical `generatedAt` and `ocrSourceCount: 0` fields from its pre-final-OCR staging, while live `newspaper.json` and the OCR table have final populated counts. **Preserve this verified historical representation**; do not rewrite prior entries merely to align those summary fields. The reusable tool recognizes it while independently checking all pages and database records.

## Manifest and deployment

Only the existing manifest was committed in the isolated clean checkout. 1981 preserved 800 earlier entries and added 26; 1982 preserved all 826 and appended 26, yielding 852 total issues across publications. Prepared `newspapers-manifest.updated.json` from the stale main checkout is **not** the deployment source.

```powershell
Set-Location 'C:\Users\schaf\Desktop\PHOTOS II\mrn-site-1981'
git add -- public/data/newspapers-manifest.json
git commit -m 'Add verified 1981 Midwest Racing News archive issues'
git push origin main
# Later, after the separate 1982 manifest append:
git add -- public/data/newspapers-manifest.json
git commit -m 'Add verified 1982 Midwest Racing News archive issues'
git push origin main
```

The existing GitHub integration triggered Vercel automatically. No alternate deployment process was created. Successful production GitHub commit status and the live manifest were both checked. Prior MRN OCR records before 1982 remained 8,894 rows with fingerprint `0bc7c860b9900da8b34ea6a75410fae1`, unchanged after 1982 finalization.

## Verification and evidence

Compare all local issue dates and numeric page names with storage inventory (including extras and sizes), all public manifest page paths with source audits, and all public page URLs with HTTP HEAD. Verify JPEG content type/size, metadata/cover assets, and one complete nonblank OCR row plus populated search vector per storage page. For 1982, a read-only `storage.objects` SQL inventory snapshot was retained because an unfiltered Storage listing timed out; `verify_mrn_1982_storage.cjs` reads that snapshot. Earlier 1981 bulk HEAD checks received rate limits; all failed requests were retried sequentially and ultimately passed. Current tool throttles two workers at 900 ms.

Verify `/media/newspapers/midwest-racing-news/year/1981` (26/492) and `/year/1982` (26/468). Search using `/api/newspaper-search?q=Raceway%20Park&source=midwest-racing-news&year=1981&pageSize=25`, replacing year for 1982; compare total with existing full-text index. Literal count uses `ocr_text ILIKE '%Raceway Park%'`. Browser verification confirmed year-filtered hits and displayed totals.

- Original 1981 final evidence: `C:\Users\schaf\Desktop\PHOTOS II\mrn-prepared-1981\final-deployment-verification.json`.
- Original 1982 final evidence: `C:\Users\schaf\Desktop\PHOTOS II\mrn-prepared-1982\final-ingestion-verification.json`.
- Copies of final evidence are preserved under `scripts/newspapers/mrn/history/verification/`.
- Full exact local artifact inventory, including every copied page and OCR output, is `scripts/newspapers/mrn/history/artifact-inventory.json`. Exact repository additions are listed in `scripts/newspapers/mrn/history/committed-file-inventory.json`. Large JPG/OCR working collections remain local; do not upload them to Git.

## Files created or changed

- Existing production file changed: `public/data/newspapers-manifest.json` in the isolated deployment checkout, committed above. Prior issue data was preserved. No application/search/deployment code was changed for ingestion.
- Historical ad hoc scripts created in `PHOTOS II` and preserved here: `prepare_mrn_1981.py`, `upload_mrn_1981.cjs`, `inspect_mrn_live.cjs`, `finish_mrn_1981.cjs`, `ocr_mrn_1981.py`, `merge_live_mrn_manifest.cjs`, `verify_mrn_deployment.cjs`, `recheck_mrn_urls.cjs`, `prepare_mrn_1982.py`, `upload_mrn_1982.cjs`, `inspect_mrn_1982_live.cjs`, `finish_mrn_1982.cjs`, `ocr_mrn_1982.py`, `merge_mrn_1982_manifest.py`, `verify_mrn_1982_storage.cjs`, `verify_mrn_1982_deployment.cjs`. The 1982 inspection helper was created but not used for final acceptance.
- Generated artifact families under each `mrn-prepared-YEAR`: numeric page JPEGs, preview image(s), `issues.csv`, `pages-upload-manifest.csv`, `audit.json`, README, templates, upload/ingestion JSON-lines logs, per-page OCR TXT/JSON, year manifest entries, staged manifest, baseline/commit files, preservation checks, storage inventories/comparisons, public URL checks, search responses and final reports. Exact filenames/counts are in the inventory.
- Reusable local tool created under `scripts/newspapers/mrn`: `Invoke-MrnIngestion.ps1`, `ingest.cjs`, `logic.cjs`, `config.json`, `logic.test.cjs`, `integration.test.cjs`, `README.md`. Working copies remain at `PHOTOS II\mrn-tool`.
- Tool test state/logs: `PHOTOS II\mrn-tool-verification\1981\checkpoint.json`, `latest-report.json`, timestamped `runs\*` audits/plans/logs/reports and URL/search evidence. Failed early trials remain as historical logs. The final 1981 dry-run **passed**, recognized 26/492 as complete and proposed zero changes. **The generalized tool's 1982 dry-run has not yet been run**; original 1982 production ingestion remains fully verified.
- Handoff and preservation files added now: this `MRN_INGESTION_HANDOFF.md`, historical script copies, final verification copies, `history/artifact-inventory.json`, `history/committed-file-inventory.json` and `scripts/newspapers/mrn/dry-run-acceptance.json`. Local `PHOTOS II\preserve_mrn_handoff.py` assembled those copies and the inventory; it is not an importer.

## Next work, only after authorization

The generalized tool exists and 10 local tests pass, including interrupted upload, blank OCR blocking publication, retry of only failed OCR, no duplicate objects/rows/entries, and no-op real/dry reruns. It is not yet fully accepted: run its **1982 dry-run first**, expecting 26 issues / 468 pages and zero proposed changes. Do not rebuild a new importer or architecture.

```powershell
& 'C:\Users\schaf\racing-museum\scripts\newspapers\mrn\Invoke-MrnIngestion.ps1' -Year 1982 -DryRun
# After that passes and 1983 is authorized:
& 'C:\Users\schaf\racing-museum\scripts\newspapers\mrn\Invoke-MrnIngestion.ps1' -Year 1983 -DryRun
& 'C:\Users\schaf\racing-museum\scripts\newspapers\mrn\Invoke-MrnIngestion.ps1' -Year 1983
```

1983 would require discovering its complete local collection, validating dates/page counts, resolving any source conflicts or scan concerns, then running the resumable upload/OCR/assets/manifest/GitHub-Vercel/verification pipeline. The current tool consumes numbered JPEG issue folders and refuses unsplit PDFs or unexpected files rather than silently omit them. Verify complete source/storage/archive/OCR totals and both Raceway Park counts before marking the year complete. No 1983 command was executed.
