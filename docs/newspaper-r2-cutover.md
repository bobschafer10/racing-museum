# Newspaper R2 viewer cutover (staged)

This branch **does not change live newspaper image delivery** until deployment environment variables are set.

1. Configure a **public read-only Cloudflare R2 custom domain** for bucket `umarm-newspapers`. Verify an object such as `newspapers/midwest-racing-news/1962-.../1.jpg` is accessible through HTTPS using its actual migrated key. Do not use the R2 S3 API endpoint for browser images.
2. In the hosting provider, set `NEWSPAPER_R2_PUBLIC_BASE_URL=https://your-public-r2-domain.example` (without a trailing path).
3. Set `NEWSPAPER_R2_ROLLOUT=midwest-racing-news:1962` to enable only a verified year. The default (unset) leaves every URL on Supabase.
4. Deploy to a preview first. Check issue grid covers, full-size page navigation, OCR search jumps, and zoom. Confirm no broken images or 403/404 errors. Verify the R2 bucket has all object keys needed by that year, including covers and thumbnails.
5. After a complete inventory reconciliation, use `NEWSPAPER_R2_ROLLOUT=all` to switch both publications, then repeat smoke tests.
6. Revert instantly by removing `NEWSPAPER_R2_ROLLOUT`. This changes image delivery only; OCR database/search stays in Supabase.

**Important:** There is no automatic per-image fallback in this first stage. Never enable `all` until all images and auxiliary assets have been verified on R2. Do not delete Supabase originals until R2 URLs are proven and full archive reconciliation is complete. Cached page data can take up to 12 hours to refresh after a rollout change.
