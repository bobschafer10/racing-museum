import type { NewspaperIssue } from "./newspapers"

// No URL changes unless both variables are configured. Use a public R2 custom
// domain, never the private S3 API endpoint or API credentials.
const supabasePrefix = "https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/"
const publicBase = (process.env.NEWSPAPER_R2_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "")
const rollout = (process.env.NEWSPAPER_R2_ROLLOUT || "").trim()

export function newspaperStorageKey(url: string): string | null {
  if (!url.startsWith(supabasePrefix)) return null
  const key = url.slice(supabasePrefix.length).split(/[?#]/, 1)[0]
  return key.startsWith("newspapers/") && !key.includes("..") ? key : null
}

export function newspaperImageUrl(url: string): string {
  const key = newspaperStorageKey(url)
  if (!key || !publicBase || !/^https:\/\/[^/]+$/i.test(publicBase)) return url
  const parts = key.split("/")
  const publication = parts[1]
  const year = parts[2]?.slice(0, 4)
  // Start with a verified publication/year canary; 'all' only after audit.
  if (rollout !== "all" && rollout !== `${publication}:${year}`) return url
  return `${publicBase}/${key}`
}

export function mapNewspaperIssueImages(issue: NewspaperIssue): NewspaperIssue {
  return {
    ...issue,
    coverImage: newspaperImageUrl(issue.coverImage),
    backCoverImage: issue.backCoverImage ? newspaperImageUrl(issue.backCoverImage) : issue.backCoverImage,
    thumbnailImage: issue.thumbnailImage ? newspaperImageUrl(issue.thumbnailImage) : issue.thumbnailImage,
    thumbnail: issue.thumbnail ? newspaperImageUrl(issue.thumbnail) : issue.thumbnail,
    pages: issue.pages.map(newspaperImageUrl),
  }
}

// OCR records continue to use the canonical Supabase storage path. Match by
// the object key, not the image host, so R2 scans still open at the right page.
export function matchesNewspaperStoragePath(imageUrl: string, storagePath: string): boolean {
  try {
    const parsed = new URL(imageUrl)
    return decodeURIComponent(parsed.pathname).endsWith("/" + storagePath)
  } catch {
    return false
  }
}
