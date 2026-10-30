# Recover MRN original page scans directly to R2 (Supabase 402 workaround)

Supabase Storage currently returns HTTP 402 even on public media downloads. This method **does not contact Supabase**. It reads original JPEG pages from the museum's own Windows computer and uploads them to the existing R2 bucket.

## Before running
- Keep every original scan. This script never deletes or edits local files.
- The museum's September 2026 ingestion handoff documents originals under `C:\Users\schaf\Desktop\MRN\1981` and `...\MRN\1982`; individual issue subfolders use names like `M-D-YY-issueNumber`. Prepared copies are under `C:\Users\schaf\Desktop\PHOTOS II\mrn-prepared-1981` and `mrn-prepared-1982`. **Inspect actual folders before choosing a source**.
- Find one issue folder containing `1.jpg`, `2.jpg`, etc. Determine its ISO issue date from verified issue metadata, not guesses.
- Install Python 3 and `python -m pip install "boto3>=1.35,<2"`.
- In the same local PowerShell session, supply `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` as environment variables. These are the Cloudflare R2 S3 API credentials, **not** a generic Cloudflare API token. Never paste secrets into chat, a GitHub issue, or a repository file. Existing GitHub Actions secrets are not automatically available on your Windows PC.
- The bucket defaults to `umarm-newspapers`.

## Pilot

From the museum checkout, with a verified local issue folder:

```powershell
python scripts/migrate_local_mrn_issue_to_r2.py --source "C:\path\to\one\issue\folder" --issue 1981-04-08
```

This is a local inventory dry run and does not use credentials or the network. After confirming page count, issue date, and source:

```powershell
python scripts/migrate_local_mrn_issue_to_r2.py --source "C:\path\to\one\issue\folder" --issue 1981-04-08 --execute
```

The script checks each existing R2 object byte-for-byte, refuses to overwrite any different file, uploads only missing pages, then downloads and SHA-256 verifies each uploaded page. Reruns are safe.

**Important:** This stages only numbered original page JPGs. Cover images, thumbnails, issue JSON, OCR TXT, full inventory reconciliation, public R2 delivery URLs, and website URL migration are separate steps. Do not change the museum's URLs or remove Supabase files yet. A successful one-issue copy is not proof the full newspaper archive has been recovered. CFRN remains untouched.

If the local original for a requested issue is absent, stop and locate a verified backup rather than fabricating a page or marking it migrated.
