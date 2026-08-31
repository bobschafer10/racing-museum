import { promises as fs } from "fs"
import path from "path"

export type NewspaperIssue = {
  slug: string
  title: string
  publication: string
  publicationSlug: string
  year: number
  issueDate: string
  description?: string | null
  summary?: string | null
  coverImage: string
  backCoverImage?: string | null
  thumbnailImage?: string | null
  thumbnail?: string | null
  pages: string[]
  featured?: boolean
  volume?: string | number | null
  number?: string | number | null
}

const MRN_STORAGE_ROOT =
  "https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/newspapers/midwest-racing-news"

const CFRN_STORAGE_ROOT =
  "https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/newspapers/checkered-flag-racing-news"

// These issues are already present in Supabase Storage. These bridges keep them
// visible if an upload reaches Storage before the checked-in website manifest.
// Entries already present in newspapers-manifest.json always win, so these are
// safe to leave in place after the full manifest is next committed.
const MRN_1978_PAGE_COUNTS: Record<string, number> = {
  "1978-04-06": 12,
  "1978-04-27": 12,
  "1978-05-04": 12,
  "1978-05-11": 16,
  "1978-05-18": 12,
  "1978-05-25": 20,
  "1978-06-01": 16,
  "1978-06-08": 20,
  "1978-06-15": 16,
  "1978-06-22": 16,
  "1978-06-29": 20,
  "1978-07-06": 16,
  "1978-07-13": 20,
  "1978-07-20": 16,
  "1978-07-27": 20,
  "1978-08-03": 16,
  "1978-08-10": 24,
  "1978-08-17": 24,
  "1978-08-24": 24,
  "1978-08-31": 24,
  "1978-09-07": 24,
  "1978-09-14": 16,
  "1978-09-21": 16,
  "1978-09-28": 12,
  "1978-10-05": 12,
  "1978-12-07": 40,
}

const CFRN_1976_PAGE_RANGES: Record<string, [number, number]> = {
  "1976-01-12": [1, 12],
  "1976-04-14": [1, 16],
  "1976-04-21": [1, 12],
  "1976-04-28": [1, 8],
  "1976-05-05": [49, 60],
  "1976-05-12": [1, 16],
  "1976-05-19": [77, 88],
  "1976-05-26": [1, 24],
  "1976-06-02": [1, 16],
  "1976-06-16": [1, 24],
  "1976-06-23": [1, 20],
  "1976-06-30": [1, 20],
  "1976-07-07": [1, 20],
  "1976-07-14": [1, 20],
  "1976-07-21": [1, 20],
  "1976-07-28": [1, 20],
  "1976-08-04": [1, 24],
  "1976-08-11": [1, 20],
  "1976-08-18": [1, 20],
  "1976-08-25": [1, 24],
  "1976-09-01": [217, 241],
  "1976-09-08": [1, 20],
  "1976-09-15": [1, 20],
  "1976-09-22": [1, 16],
  "1976-09-29": [1, 12],
  "1976-10-13": [1, 12],
  "1976-12-08": [1, 16],
}

function titleFromIsoDate(issueDate: string) {
  const [year, month, day] = issueDate.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function mrn1978Pages(issueDate: string, count: number) {
  // The July 20 scan is numbered 001-015 and 020 in Storage.
  const pageNumbers =
    issueDate === "1978-07-20"
      ? [...Array.from({ length: 15 }, (_, i) => i + 1), 20]
      : Array.from({ length: count }, (_, i) => i + 1)

  return pageNumbers.map(
    (page) => `${MRN_STORAGE_ROOT}/${issueDate}/${String(page).padStart(3, "0")}.jpg`
  )
}

function cfrn1976Pages(issueDate: string, start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
    (page) => `${CFRN_STORAGE_ROOT}/${issueDate}/${String(page).padStart(3, "0")}.jpg`
  )
}

function getMrn1978StorageIssues(): NewspaperIssue[] {
  return Object.entries(MRN_1978_PAGE_COUNTS).map(([issueDate, pageCount]) => ({
    slug: issueDate,
    title: titleFromIsoDate(issueDate),
    publication: "Midwest Racing News",
    publicationSlug: "midwest-racing-news",
    year: 1978,
    issueDate,
    description: null,
    coverImage: `${MRN_STORAGE_ROOT}/${issueDate}/front-cover.jpg`,
    backCoverImage: `${MRN_STORAGE_ROOT}/${issueDate}/back-cover.jpg`,
    thumbnail: `${MRN_STORAGE_ROOT}/${issueDate}/thumbnail.jpg`,
    pages: mrn1978Pages(issueDate, pageCount),
    featured: false,
  }))
}

function getCfrn1976StorageIssues(): NewspaperIssue[] {
  return Object.entries(CFRN_1976_PAGE_RANGES).map(
    ([issueDate, [startPage, endPage]]) => ({
      slug: issueDate,
      title: titleFromIsoDate(issueDate),
      publication: "Checkered Flag Racing News",
      publicationSlug: "checkered-flag-racing-news",
      year: 1976,
      issueDate,
      description: null,
      coverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/front-cover.jpg`,
      backCoverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/back-cover.jpg`,
      thumbnail: `${CFRN_STORAGE_ROOT}/${issueDate}/thumbnail.jpg`,
      pages: cfrn1976Pages(issueDate, startPage, endPage),
      featured: false,
    })
  )
}

export async function getNewspaperIssues(): Promise<NewspaperIssue[]> {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "public",
      "data",
      "newspapers-manifest.json"
    )

    const raw = await fs.readFile(manifestPath, "utf-8")
    const manifestIssues = JSON.parse(raw) as NewspaperIssue[]

    const merged = new Map<string, NewspaperIssue>()

    for (const issue of manifestIssues) {
      merged.set(`${issue.publicationSlug}__${issue.slug}`, issue)
    }

    for (const issue of [
      ...getMrn1978StorageIssues(),
      ...getCfrn1976StorageIssues(),
    ]) {
      const key = `${issue.publicationSlug}__${issue.slug}`
      if (!merged.has(key)) merged.set(key, issue)
    }

    return Array.from(merged.values()).sort((a, b) => {
      if (a.publicationSlug !== b.publicationSlug) {
        return a.publicationSlug.localeCompare(b.publicationSlug)
      }

      return a.issueDate.localeCompare(b.issueDate)
    })
  } catch (error) {
    console.error("NEWSPAPER MANIFEST ERROR:", error)
    return []
  }
}

export async function getNewspaperIssuesByPublication(
  publicationSlug: string
): Promise<NewspaperIssue[]> {
  const issues = await getNewspaperIssues()
  return issues.filter((issue) => issue.publicationSlug === publicationSlug)
}

export async function getNewspaperIssue(
  publicationSlug: string,
  issueSlug: string
): Promise<NewspaperIssue | undefined> {
  const issues = await getNewspaperIssues()

  return issues.find(
    (issue) =>
      issue.publicationSlug === publicationSlug &&
      issue.slug === issueSlug
  )
}
