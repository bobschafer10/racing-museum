import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewspaperIssue } from "@/lib/newspapers"
import { supabase } from "@/lib/supabase"
import NewspaperPageViewer from "./NewspaperPageViewer"
import "../../../archive-dark.css"

// Keep newspaper issue pages searchable as research pages, but tell Google not
// to index the multi-megabyte scan images themselves. The scans remain available
// to visitors who open a page in the viewer; this only removes the incentive for
// Google Image to crawl every full-resolution Supabase object.
export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
    },
  },
}

function scanPageNumber(image: string) {
  const filename = decodeURIComponent(image).split("/").pop() || ""
  const match = filename.match(/(?:page\s*)?0*(\d+)(?:-\d+)?\.(?:jpg|jpeg|png)$/i)
  return match ? Number(match[1]) : null
}

function scanFilename(image: string) {
  return decodeURIComponent(image).split("/").pop() || ""
}

function queryPhrase(query: string) {
  const trimmed = query.trim()
  const straight = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
  const smart = trimmed.length >= 2 && trimmed.startsWith("“") && trimmed.endsWith("”")
  return straight || smart ? trimmed.slice(1, -1).trim() : trimmed
}

function matchSnippet(text: string, query: string) {
  const clean = text
    .replace(/===\s*COLUMN\s+\d+\s*===/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!clean || !query) return ""

  const lower = clean.toLowerCase()
  const phrase = queryPhrase(query).toLowerCase()
  let hit = lower.indexOf(phrase)
  if (hit < 0) {
    for (const term of phrase.split(/\s+/).filter((value) => value.length >= 2)) {
      const found = lower.indexOf(term)
      if (found >= 0 && (hit < 0 || found < hit)) hit = found
    }
  }

  const radius = 210
  const start = hit > radius ? hit - radius : 0
  const end = Math.min(clean.length, (hit >= 0 ? hit : 0) + radius + 260)
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`
}

type OcrHighlightLine = {
  text: string
  x: number
  y: number
  w: number
  h: number
  score: number | null
}

function parseOcrLayoutLines(value: unknown): OcrHighlightLine[] {
  if (!value || typeof value !== "object") return []
  const record = value as Record<string, unknown>
  const nested = record.line_layout && typeof record.line_layout === "object"
    ? (record.line_layout as Record<string, unknown>).lines
    : undefined
  const rawLines = Array.isArray(record.lines) ? record.lines : nested
  if (!Array.isArray(rawLines)) return []

  return rawLines.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return []
    const item = raw as Record<string, unknown>
    const text = typeof item.t === "string" ? item.t.trim() : ""
    const x = Number(item.x)
    const y = Number(item.y)
    const w = Number(item.w)
    const h = Number(item.h)
    const score = item.s == null ? null : Number(item.s)
    if (!text || ![x, y, w, h].every(Number.isFinite)) return []
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x > 1 || y > 1) return []
    return [{
      text,
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      w: Math.max(0, Math.min(1 - x, w)),
      h: Math.max(0, Math.min(1 - y, h)),
      score: Number.isFinite(score) ? score : null,
    }]
  })
}

function matchingOcrLayoutLines(lines: OcrHighlightLine[], query: string) {
  const phrase = queryPhrase(query).toLowerCase()
  const tokens = Array.from(new Set(
    phrase
      .replace(/["'()]/g, " ")
      .split(/\s+/)
      .map((value) => value.trim())
      .filter((value) => value.length >= 2),
  ))
  if (!phrase || !tokens.length) return []

  const phraseMatches = lines.filter((line) => line.text.toLowerCase().includes(phrase))
  if (phraseMatches.length) return phraseMatches

  const allTokenMatches = lines.filter((line) => {
    const text = line.text.toLowerCase()
    return tokens.every((token) => text.includes(token))
  })
  if (allTokenMatches.length) return allTokenMatches

  const tokenMatches = lines.filter((line) => {
    const text = line.text.toLowerCase()
    return tokens.some((token) => text.includes(token))
  })

  if (tokens.length <= 1 || tokenMatches.length <= 1) return tokenMatches

  // For split names/phrases, prefer nearby OCR lines rather than highlighting
  // unrelated occurrences scattered across a newspaper page.
  const clustered = tokenMatches.filter((line, index, candidates) =>
    candidates.some((other, otherIndex) => {
      if (index === otherIndex) return false
      const verticalDistance = Math.abs(line.y - other.y)
      const horizontalDistance = Math.abs(line.x - other.x)
      return verticalDistance <= 0.06 && horizontalDistance <= 0.35
    }),
  )
  return clustered.length ? clustered : tokenMatches
}

type SearchMatchRow = {
  document_slug: string
  issue_date: string | null
  page_number: number | null
}

type IssuePageProps = {
  params: Promise<{ publication: string; issue: string }>
  searchParams: Promise<{
    sourcePage?: string | string[]
    q?: string | string[]
    sort?: string | string[]
    source?: string | string[]
    year?: string | string[]
    searchIndex?: string | string[]
    searchTotal?: string | string[]
    pageSize?: string | string[]
  }>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function NewspaperIssuePage({ params, searchParams }: IssuePageProps) {
  const { publication, issue: issueSlug } = await params
  const search = await searchParams
  const issue = await getNewspaperIssue(publication, issueSlug)
  if (!issue) notFound()

  const issuePageImages = (issue.pages || []).filter(Boolean) as string[]
  const orderedImages = Array.from(
    new Set(
      (issuePageImages.length
        ? issuePageImages
        : [issue.coverImage, ...(issue.backCoverImage ? [issue.backCoverImage] : [])]
      ).filter(Boolean),
    ),
  ) as string[]
  const pages = orderedImages.map((image, index) => {
    const pageNumber = scanPageNumber(image)
    const isFirst = index === 0
    const isLast = index === orderedImages.length - 1
    return {
      label: pageNumber
        ? isFirst
          ? `Page ${pageNumber} • Front Cover`
          : isLast
            ? `Page ${pageNumber} • Back Cover`
            : `Page ${pageNumber}`
        : isFirst
          ? "Front Cover"
          : isLast
            ? "Back Cover"
            : `Page ${index + 1}`,
      image,
    }
  })

  const sourcePageParam = firstParam(search.sourcePage)
  const requestedPage = sourcePageParam ? Number(sourcePageParam) : null
  const requestedIndex = requestedPage && Number.isFinite(requestedPage)
    ? Math.max(0, pages.findIndex((page) => scanPageNumber(page.image) === requestedPage))
    : null
  const query = firstParam(search.q)?.trim() || ""
  const searchIndexParam = firstParam(search.searchIndex)
  const searchIndex = searchIndexParam && Number.isFinite(Number(searchIndexParam))
    ? Math.max(0, Number(searchIndexParam))
    : null
  const searchTotalParam = firstParam(search.searchTotal)
  const searchTotal = searchTotalParam && Number.isFinite(Number(searchTotalParam))
    ? Math.max(0, Number(searchTotalParam))
    : null

  let initialPageIndex = requestedIndex !== null && requestedIndex >= 0 ? requestedIndex : pages.length ? 0 : null
  let searchSnippet: string | null = null
  let highlightLines: OcrHighlightLine[] = []
  let matchPosition: number | null = searchIndex !== null ? searchIndex + 1 : null
  let matchTotal: number | null = searchTotal

  if (query && searchIndex !== null) {
    const sortParam = firstParam(search.sort)?.toLowerCase()
    const sort = sortParam === "oldest" || sortParam === "newest" ? sortParam : "relevance"
    const sourceParam = firstParam(search.source)?.toLowerCase()
    const source = sourceParam && sourceParam !== "all" ? sourceParam : null
    const yearParam = firstParam(search.year)
    const yearValue = yearParam ? Number(yearParam) : null
    const year = yearValue && Number.isInteger(yearValue) ? yearValue : null

    const { data } = await supabase.rpc("get_newspaper_ocr_match_detail", {
      p_query: query,
      p_source: source,
      p_year: year,
      p_sort: sort,
      p_offset: searchIndex,
    })
    const row = (data?.[0] || null) as SearchMatchRow & {
      storage_path?: string
      ocr_text?: string | null
      ocr_json?: unknown
      page_label?: string | null
    } | null

    if (row?.storage_path) {
      const imageUrl = `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${row.storage_path}`
      let index = pages.findIndex((page) => page.image === imageUrl)
      if (index < 0 && row.page_number) index = pages.findIndex((page) => scanPageNumber(page.image) === row.page_number)
      if (index >= 0) initialPageIndex = index
      searchSnippet = matchSnippet(row.ocr_text || "", query)
      highlightLines = matchingOcrLayoutLines(parseOcrLayoutLines(row.ocr_json), query)
    }
  }

  if (query && requestedPage && initialPageIndex !== null && !searchSnippet) {
    const page = pages[initialPageIndex]
    if (page) {
      const pageLabel = scanFilename(page.image)
      const { data } = await supabase
        .from("newspaper_ocr_pages")
        .select("ocr_text,ocr_json")
        .eq("publication_code", publication)
        .eq("issue_date", issue.issueDate)
        .eq("page_label", pageLabel)
        .maybeSingle()
      const row = data as { ocr_text?: string | null; ocr_json?: unknown } | null
      if (row?.ocr_text) searchSnippet = matchSnippet(row.ocr_text, query)
      highlightLines = matchingOcrLayoutLines(parseOcrLayoutLines(row?.ocr_json), query)
    }
  }

  return <main className="ma-page">
    <section className="ma-hero" style={{background:'linear-gradient(90deg,#05080a,#11171b)'}}>
      <div className="ma-hero-inner">
        <div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/media/newspapers">Newspapers</Link><span>›</span><Link href={`/media/newspapers/${publication}`}>{issue.publication}</Link><span>›</span><span>{issue.title}</span></div>
        <div className="ma-hero-grid">
          <div><div className="ma-eyebrow">Digitized Newspaper Issue</div><h1 className="ma-title">{issue.publication}</h1><div className="ma-subtitle">{issue.title}</div><p className="ma-lede">Read the complete preserved issue page by page. Full-resolution scans open only when selected so the archive stays fast and bandwidth-efficient.</p><div className="ma-actions"><Link href={`/media/newspapers/${publication}/year/${issue.year}`} className="ma-button">Back to {issue.year}</Link><Link href="/media/newspapers#newspaper-search" className="ma-button-ghost">Search Newspapers</Link></div></div>
          <div className="ma-hero-media" aria-hidden="true" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:180,border:"1px solid rgba(255,255,255,.08)",borderRadius:8,color:"#c5a86b",fontWeight:800,letterSpacing:".12em",textAlign:"center",padding:24}}>DIGITIZED NEWSPAPER ARCHIVE</div>
        </div>
        <div className="ma-stats">
          <div className="ma-stat"><strong>{issue.year}</strong><span>Publication Year</span></div>
          <div className="ma-stat"><strong>{pages.length}</strong><span>Preserved Pages</span></div>
          <div className="ma-stat"><strong>{issue.volume || "—"}</strong><span>Volume</span></div>
          <div className="ma-stat"><strong>{issue.number || "—"}</strong><span>Issue Number</span></div>
        </div>
      </div>
    </section>

    <section className="ma-section">
      <div className="ma-section-head"><div><div className="ma-kicker">Page-by-Page Archive</div><h2 className="ma-h2">Full Issue</h2></div><div className="ma-note">Select a page to load the original scan. Full-resolution pages are not preloaded.</div></div>
      <NewspaperPageViewer
        pages={pages}
        initialPageIndex={initialPageIndex}
        searchQuery={query || null}
        searchSnippet={searchSnippet}
        highlightLines={highlightLines}
        matchPosition={matchPosition}
        matchTotal={matchTotal}
      />
    </section>
  </main>
}
