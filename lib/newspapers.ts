import { promises as fs } from "fs"
import path from "path"
import { supabase } from "@/lib/supabase"
import { unstable_cache } from "next/cache"

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

const CFRN_1992_PAGE_COUNTS: Record<string, number> = {
  "1992-01-08": 16,
  "1992-02-05": 20,
  "1992-03-18": 16,
  "1992-04-08": 36,
  "1992-04-15": 16,
  "1992-04-22": 20,
  "1992-04-29": 24,
  "1992-05-06": 28,
  "1992-06-17": 36,
  "1992-07-01": 40,
  "1992-07-15": 28,
  "1992-08-19": 36,
  "1992-08-26": 36,
  "1992-09-09": 32,
  "1992-09-30": 20,
  "1992-10-07": 20,
  "1992-12-09": 19,
}

const CFRN_1995_PAGE_COUNTS: Record<string, number> = {
  "1995-04-05": 24,
  "1995-04-26": 24,
  "1995-05-10": 28,
  "1995-05-17": 24,
  "1995-05-31": 28,
  "1995-06-07": 32,
  "1995-06-14": 28,
  "1995-06-21": 36,
  "1995-06-28": 36,
  "1995-07-05": 40,
  "1995-07-12": 36,
  "1995-07-26": 36,
  "1995-08-02": 36,
  "1995-08-09": 36,
  "1995-08-23": 40,
  "1995-08-30": 36,
  "1995-09-06": 36,
  "1995-09-13": 32,
  "1995-09-27": 20,
  "1995-10-18": 24,
}

const CFRN_1996_PAGE_COUNTS: Record<string, number> = {
  "1996-02-07": 24,
  "1996-03-06": 20,
  "1996-04-03": 28,
  "1996-04-10": 16,
  "1996-04-17": 20,
  "1996-04-24": 24,
  "1996-05-08": 28,
  "1996-05-15": 28,
  "1996-05-22": 32,
  "1996-06-05": 27,
  "1996-06-19": 32,
  "1996-07-17": 31,
  "1996-09-04": 32,
  "1996-10-02": 20,
  "1996-12-11": 32,
}

const CFRN_1997_PAGE_COUNTS: Record<string, number> = {
  "1997-10-01": 24,
  "1997-10-15": 24,
  "1997-12-10": 32,
}

const CFRN_1998_PAGE_COUNTS: Record<string, number> = {
  "1998-04-15": 16,
  "1998-04-22": 24,
  "1998-04-29": 24,
  "1998-06-24": 36,
  "1998-07-15": 36,
  "1998-07-29": 36,
  "1998-09-02": 36,
  "1998-09-23": 28,
  "1998-10-07": 20,
  "1998-10-21": 24,
}

const CFRN_1999_PAGE_COUNTS: Record<string, number> = {
  "1999-01-20": 24,
  "1999-03-03": 20,
  "1999-03-17": 20,
  "1999-04-07": 20,
  "1999-04-21": 20,
  "1999-05-19": 24,
  "1999-05-26": 28,
  "1999-06-02": 28,
  "1999-07-28": 36,
  "1999-09-22": 28,
  "1999-09-29": 28,
  "1999-10-20": 24,
}

const CFRN_2000_PAGE_COUNTS: Record<string, number> = {
  "2000-01-19": 24,
  "2000-02-09": 24,
  "2000-03-01": 20,
  "2000-03-15": 16,
  "2000-04-05": 32,
  "2000-04-12": 16,
  "2000-04-19": 20,
  "2000-04-26": 20,
  "2000-09-27": 19,
  "2000-10-04": 16,
  "2000-12-06": 24,
}

const CFRN_2001_PAGE_COUNTS: Record<string, number> = {
  "2001-01-17": 16,
  "2001-02-07": 16,
  "2001-02-28": 20,
  "2001-03-14": 16,
  "2001-04-04": 28,
  "2001-04-11": 16,
  "2001-04-18": 16,
  "2001-04-25": 16,
  "2001-05-02": 20,
  "2001-05-09": 20,
  "2001-05-16": 20,
  "2001-06-06": 24,
  "2001-07-25": 28,
  "2001-08-15": 28,
}

const CFRN_2003_PAGE_COUNTS: Record<string, number> = {
  "2003-08-20": 28,
  "2003-09-03": 24,
}

const CFRN_2004_PAGE_COUNTS: Record<string, number> = {
  "2004-05-05": 20,
  "2004-07-21": 28,
}

const CFRN_2005_PAGE_COUNTS: Record<string, number> = {
  "2005-01-19": 16,
  "2005-02-09": 20,
  "2005-06-15": 23,
  "2005-06-22": 22,
  "2005-06-29": 22,
  "2005-07-06": 24,
  "2005-07-13": 24,
}

const CFRN_STORAGE_NOTES: Record<string, string> = {
  "2000-09-27": "Partial issue: printed page 19 is absent from the supplied scans; all available scans are retained.",
  "2005-06-15": "Partial issue: printed page 21 is absent from the supplied scans; all available scans are retained.",
  "2005-06-22": "Partial issue: printed pages 10-11 are absent from the supplied scans; all available scans are retained.",
  "2005-06-29": "Partial issue: printed pages 13-14 are absent from the supplied scans; all available scans are retained.",
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

type OcrArchivePublication = {
  publicationCode: string
  publication: string
  publicationSlug: string
  storageRoot: string
}

function ocrPageUrl(row: OcrArchiveRow) {
  return `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${row.storage_path}`
}

async function getOcrBackedIssues(
  afterIssueDate: string,
  config: OcrArchivePublication
): Promise<NewspaperIssue[]> {
  const rows: OcrArchiveRow[] = []
  const pageSize = 1000

  // The checked-in manifest is the durable historical baseline. Pull newer,
  // fully OCR-complete pages from Supabase so newly processed issues appear
  // on the museum without requiring a giant manifest rebuild after every batch.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("newspaper_ocr_pages")
      .select("issue_date,page_label,storage_path")
      .eq("publication_code", config.publicationCode)
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

  return Array.from(byIssue.entries()).map(([issueDate, issueRows]) => {
    const pages = issueRows.map(ocrPageUrl)
    return {
      slug: issueDate,
      title: titleFromIsoDate(issueDate),
      publication: config.publication,
      publicationSlug: config.publicationSlug,
      year: Number(issueDate.slice(0, 4)),
      issueDate,
      description: null,
      // OCR-backed batches do not always include convenience copies such as
      // front-cover.jpg/thumbnail.jpg. The first and last preserved scans are
      // authoritative and always exist when an OCR-backed issue is returned.
      coverImage: pages[0] || "",
      backCoverImage: pages.at(-1) || pages[0] || null,
      thumbnail: pages[0] || null,
      pages,
      featured: false,
    }
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

function getCfrn1992StorageIssues(): NewspaperIssue[] {
  return Object.entries(CFRN_1992_PAGE_COUNTS).map(([issueDate, pageCount]) => ({
    slug: issueDate,
    title: titleFromIsoDate(issueDate),
    publication: "Checkered Flag Racing News",
    publicationSlug: "checkered-flag-racing-news",
    year: 1992,
    issueDate,
    description: null,
    coverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/front-cover.jpg`,
    backCoverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/back-cover.jpg`,
    thumbnail: `${CFRN_STORAGE_ROOT}/${issueDate}/thumbnail.jpg`,
    pages: cfrn1976Pages(issueDate, 1, pageCount),
    featured: false,
  }))
}

function getCfrn1995StorageIssues(): NewspaperIssue[] {
  return Object.entries(CFRN_1995_PAGE_COUNTS).map(([issueDate, pageCount]) => ({
    slug: issueDate,
    title: titleFromIsoDate(issueDate),
    publication: "Checkered Flag Racing News",
    publicationSlug: "checkered-flag-racing-news",
    year: 1995,
    issueDate,
    description: null,
    coverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/front-cover.jpg`,
    backCoverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/back-cover.jpg`,
    thumbnail: `${CFRN_STORAGE_ROOT}/${issueDate}/thumbnail.jpg`,
    pages: cfrn1976Pages(issueDate, 1, pageCount),
    featured: false,
  }))
}

function getCfrnStorageIssues(year: number, pageCounts: Record<string, number>): NewspaperIssue[] {
  return Object.entries(pageCounts).map(([issueDate, pageCount]) => ({
    slug: issueDate,
    title: titleFromIsoDate(issueDate),
    publication: "Checkered Flag Racing News",
    publicationSlug: "checkered-flag-racing-news",
    year,
    issueDate,
    description: CFRN_STORAGE_NOTES[issueDate] ?? null,
    coverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/front-cover.jpg`,
    backCoverImage: `${CFRN_STORAGE_ROOT}/${issueDate}/back-cover.jpg`,
    thumbnail: `${CFRN_STORAGE_ROOT}/${issueDate}/thumbnail.jpg`,
    pages: cfrn1976Pages(issueDate, 1, pageCount),
    featured: false,
  }))
}

function getCfrn1996StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(1996, CFRN_1996_PAGE_COUNTS)
}

function getCfrn1997StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(1997, CFRN_1997_PAGE_COUNTS)
}

function getCfrn1998StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(1998, CFRN_1998_PAGE_COUNTS)
}

function getCfrn1999StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(1999, CFRN_1999_PAGE_COUNTS)
}

function getCfrn2000StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(2000, CFRN_2000_PAGE_COUNTS)
}

function getCfrn2001StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(2001, CFRN_2001_PAGE_COUNTS)
}

function getCfrn2003StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(2003, CFRN_2003_PAGE_COUNTS)
}

function getCfrn2004StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(2004, CFRN_2004_PAGE_COUNTS)
}

function getCfrn2005StorageIssues(): NewspaperIssue[] {
  return getCfrnStorageIssues(2005, CFRN_2005_PAGE_COUNTS)
}

async function loadNewspaperIssues(): Promise<NewspaperIssue[]> {
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

    const latestCfrnManifestDate =
      manifestIssues
        .filter((issue) => issue.publicationSlug === "checkered-flag-racing-news")
        .map((issue) => issue.issueDate)
        .sort()
        .at(-1) || "1900-01-01"

    let ocrBackedMrnIssues: NewspaperIssue[] = []
    try {
      ocrBackedMrnIssues = await getOcrBackedIssues(latestMrnManifestDate, {
        publicationCode: "midwest-racing-news",
        publication: "Midwest Racing News",
        publicationSlug: "midwest-racing-news",
        storageRoot: MRN_STORAGE_ROOT,
      })
    } catch (error) {
      // Never let a temporary Supabase problem blank the newspaper archive.
      // The checked-in manifest remains the fallback source of truth.
      console.error("MRN OCR ARCHIVE BRIDGE ERROR:", error)
    }

    let ocrBackedCfrnIssues: NewspaperIssue[] = []
    try {
      ocrBackedCfrnIssues = await getOcrBackedIssues(latestCfrnManifestDate, {
        publicationCode: "checkered-flag-racing-news",
        publication: "Checkered Flag Racing News",
        publicationSlug: "checkered-flag-racing-news",
        storageRoot: CFRN_STORAGE_ROOT,
      })
    } catch (error) {
      console.error("CFRN OCR ARCHIVE BRIDGE ERROR:", error)
    }

    for (const issue of [
      ...getMrn1978StorageIssues(),
      ...getCfrn1976StorageIssues(),
      ...getCfrn1992StorageIssues(),
      ...getCfrn1995StorageIssues(),
      ...getCfrn1996StorageIssues(),
      ...getCfrn1997StorageIssues(),
      ...getCfrn1998StorageIssues(),
      ...getCfrn1999StorageIssues(),
      ...getCfrn2000StorageIssues(),
      ...getCfrn2001StorageIssues(),
      ...getCfrn2003StorageIssues(),
      ...getCfrn2004StorageIssues(),
      ...getCfrn2005StorageIssues(),
      ...ocrBackedMrnIssues,
      ...ocrBackedCfrnIssues,
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

// Newspaper manifests and OCR-complete issue lists change only during imports.
// Avoid rescanning the OCR tables for every individual issue visit.
// Revalidate at most twice daily, while keeping the checked-in manifest fallback.
const cachedNewspaperIssues = unstable_cache(loadNewspaperIssues, ["museum-newspaper-archive-v1"], {
  revalidate: 43200,
  tags: ["museum-newspapers"],
})

export async function getNewspaperIssues(): Promise<NewspaperIssue[]> {
  return cachedNewspaperIssues()
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
