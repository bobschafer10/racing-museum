import { promises as fs } from "fs"
import path from "path"
import { supabase } from "@/lib/supabase"

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

type OcrArchiveRow = {
  issue_date: string
  page_label: string
  storage_path: string
}

async function getOcrBackedMrnIssues(afterIssueDate: string): Promise<NewspaperIssue[]> {
  const rows: OcrArchiveRow[] = []
  const pageSize = 1000

  // The checked-in manifest is the durable historical baseline. Pull newer,
  // fully OCR-complete MRN pages from Supabase so newly processed years appear
  // on the museum without requiring a giant manifest rebuild after every batch.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("newspaper_ocr_pages")
      .select("issue_date,page_label,storage_path")
      .eq("publication_code", "midwest-racing-news")
      .eq("status", "complete")
      .gt("issue_date", afterIssueDate)
      .order("issue_date", { ascending: true })
      .order("page_label", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    const batch = (data || []) as OcrArchiveRow[]
    rows.push(...batch)
    if (batch.length < pageSize) break
  }

  const byIssue = new Map<string, OcrArchiveRow[]>()
  for (const row of rows) {
    const issueRows = byIssue.get(row.issue_date) || []
    issueRows.push(row)
    byIssue.set(row.issue_date, issueRows)
  }

  return Array.from(byIssue.entries()).map(([issueDate, issueRows]) => ({
    slug: issueDate,
    title: titleFromIsoDate(issueDate),
    publication: "Midwest Racing News",
    publicationSlug: "midwest-racing-news",
    year: Number(issueDate.slice(0, 4)),
    issueDate,
    description: null,
    coverImage: `${MRN_STORAGE_ROOT}/${issueDate}/front-cover.jpg`,
    backCoverImage: `${MRN_STORAGE_ROOT}/${issueDate}/back-cover.jpg`,
    thumbnail: `${MRN_STORAGE_ROOT}/${issueDate}/thumbnail.jpg`,
    pages: issueRows.map(
      (row) =>
        `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${row.storage_path}`
    ),
    featured: false,
  }))
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

    const latestMrnManifestDate =
      manifestIssues
        .filter((issue) => issue.publicationSlug === "midwest-racing-news")
        .map((issue) => issue.issueDate)
        .sort()
        .at(-1) || "1900-01-01"

    let ocrBackedMrnIssues: NewspaperIssue[] = []
    try {
      ocrBackedMrnIssues = await getOcrBackedMrnIssues(latestMrnManifestDate)
    } catch (error) {
      // Never let a temporary Supabase problem blank the newspaper archive.
      // The checked-in manifest remains the fallback source of truth.
      console.error("MRN OCR ARCHIVE BRIDGE ERROR:", error)
    }

    for (const issue of [
      ...getMrn1978StorageIssues(),
      ...getCfrn1976StorageIssues(),
      ...ocrBackedMrnIssues,
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
