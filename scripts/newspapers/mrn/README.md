# Midwest Racing News ingestion (Windows)

This local tool uses the verified 1981–1982 production workflow. It processes one year per command and never advances to the next year automatically.

```powershell
& 'C:\Users\schaf\racing-museum\scripts\newspapers\mrn\Invoke-MrnIngestion.ps1' -Year 1983 -DryRun
& 'C:\Users\schaf\racing-museum\scripts\newspapers\mrn\Invoke-MrnIngestion.ps1' -Year 1983
```

The second command uploads, indexes, commits the manifest, pushes the existing production branch, waits for its existing Vercel deployment, and verifies the live result. Rerun the same command after interruption; live storage and database records are checked again before work resumes. No Vercel CLI deployment, new manifest, table, function, or search architecture is introduced.

## Existing prerequisites and configuration

- Node.js 22+ and Git available on Windows. The launcher also recognizes the bundled local Codex Node runtime if Node is absent from PATH; it does not require a ChatGPT task or service.
- Existing project dependencies installed (`npm ci` in the project, and `npm ci` in `museum-newspaper-manager` for its existing Sharp dependency).
- Native Tesseract with English data at `C:\Program Files\Tesseract-OCR\tesseract.exe`, or set `MRN_TESSERACT` / `-Tesseract`. Exactly the verified full-resolution `eng --psm 11` process, four workers with `OMP_THREAD_LIMIT=1`.
- Existing project `.env*` setup, loaded with Next.js's environment loader: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. No secrets are written into the tool, logs, or reports. The existing Git credential setup must be authorized to push `origin/main`; no GitHub token is required for this public repository's read checks. Existing `GH_TOKEN` / `GITHUB_TOKEN` is used if supplied.
- Nonsecret production settings live in `config.json`, including the existing museum URL and Supabase project check. Bucket and paths remain unchanged.

Source defaults to `%USERPROFILE%\Desktop\MRN\YEAR`. Override the MRN root with `-SourceRoot 'D:\MRN'` or `MRN_SOURCE_ROOT`. The current verified source format is an issue directory named `M-D-YY-N`, `M-D-YYYY-N`, or `YYYY-MM-DD`, containing consecutive numbered JPEGs (`1.jpg`, `2.jpg`, …). Date validity, uniqueness, issue-number continuity when present, image decoding, hashes, and consecutive page counts are checked. Unexpected files, PDFs, subdirectories, duplicate dates, missing numbers, or conflicts stop the run rather than omit source material. Original files are never modified. This tool consumes the same already split JPEG source collection as 1981–1982; unsplit PDFs must first be converted and reviewed into that format.

## Resuming and preservation

Default state: `newspaper_staging\mrn-ingestion\YEAR` in the project (already excluded by the existing `.gitignore`). Override with `-StateRoot` or `MRN_STATE_ROOT`. Each year has an atomic `checkpoint.json`, resumable OCR outputs, a stale-process-aware single-run lock, `latest-report.json`, and separate timestamped `runs\RUN-ID` folders with source audits, JSON-lines event logs, plans, public image checks, search evidence, prior manifest snapshots, and final verification reports.

Live state is authoritative; cached checkpoints do not skip missing storage objects or incomplete database records. Missing objects use insert-only uploads; OCR uses the existing unique `storage_path` upsert. Complete populated searchable OCR rows are preserved. OCR failures and blank text are retried on a later run and block publication. Covers use the verified first/last-page JPEG quality 88 and a width-520 quality-82 thumbnail. Metadata comes from the existing 1981 template, with issue-specific fields updated. Metadata conflicts or empty existing assets stop for review rather than overwrite. A successful year is marked verified and becomes read-only. All 1959–1982 years are protected from changes from the outset.

Manifest changes happen in a fresh isolated Git checkout using the project's existing origin. Only the existing `public/data/newspapers-manifest.json` is staged and committed; unrelated local changes in your main project are not staged. Existing entries are retained byte-for-byte when appending; conflicting or duplicate year entries stop the run. A rejected Git push or deployment failure is recorded and can be resumed. Never delete your checkpoint to work around a source conflict without reviewing the report.

Dry-run performs source/live checks and public verification when complete, and writes only local state/log/report files. It performs no uploads, OCR execution, database writes, manifest changes, Git commits/pushes, or deployments. For an unfinished year it lists missing work in `proposed_changes`; `completed: false` distinguishes that plan from a fully verified year. For a complete year it reports `no_changes_proposed: true` and verifies the production manifest against the checked-in production branch and its successful deployment.

Final verification compares all source dates and pages with storage and the public archive, checks every public JPEG, checks every existing OCR/search record for text/status/vector, verifies metadata/cover assets, and checks the public year-filtered `Raceway Park` search against the existing index. Literal-phrase matches count pages containing the case-insensitive contiguous text `Raceway Park`; all-words search permits the words elsewhere on the page, matching the museum's existing behavior. Source scan quality warnings are preserved separately and do not mean OCR failed.

Tests from the project root: `node --test scripts/newspapers/mrn/logic.test.cjs scripts/newspapers/mrn/integration.test.cjs`. These include interrupted uploads, blank/failed OCR blocking publication, resume of only the failed page, real-mode reruns and dry-run reruns without writes, and preservation of old manifest entries. The integration test uses local fixtures and mocked storage/Git/deployment services; it cannot publish a real year. Confirmed live dry-run evidence for 1981 and 1982 is recorded separately in `dry-run-acceptance.json` after acceptance checks pass.

The verified 1981 manifest retains its historical `generatedAt` and `ocrSourceCount` summary fields from before final OCR metadata. Those fields are preserved in protected manifest entries; source page lists, issue metadata, and live database OCR/search completeness are independently verified. The tool does not rewrite the historical manifest to make those summary fields match.
