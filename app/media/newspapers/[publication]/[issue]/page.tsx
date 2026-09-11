import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewspaperIssue } from "@/lib/newspapers"
import { supabase } from "@/lib/supabase"
import NewspaperPageViewer from "./NewspaperPageViewer"
import "../../../archive-dark.css"

function scanPageNumber(image: string) {
  const filename = decodeURIComponent(image).split("/").pop() || ""
  const match = filename.match(/(?:page\s*)?0*(\d+)\.(?:jpg|jpeg|png)$/i)
  return match ? Number(match[1]) : null
}

function scanFilename(image: string) {
  return decodeURIComponent(image).split("/").pop() || ""
}

function matchSnippet(text: string, query: string) {
  const clean = text
    .replace(/===\s*COLUMN\s+\d+\s*===/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!clean || !query) return ""

  const lower = clean.toLowerCase()
  const phrase = query.toLowerCase().trim()
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

  const orderedImages = Array.from(
    new Set(
      [issue.coverImage, ...(issue.pages || []), ...(issue.backCoverImage ? [issue.backCoverImage] : [])].filter(Boolean),
    ),
  ) as string[]
  const pages = orderedImages.map((image, index) => ({
    label:
      index === 0
        ? "Front Cover"
        : index === orderedImages.length - 1 && issue.backCoverImage === image
          ? "Back Cover"
          : `Page ${index + 1}`,
    image,
  }))
  const summary =
    issue.description ||
    issue.summary ||
    `This issue of ${issue.publication}, published on ${issue.title}, preserves race coverage, photographs, schedules, advertising, results, and period news from the regional racing scene.`

  const sourcePage = Number(firstParam(search.sourcePage))
  const sourceIndex =
    Number.isFinite(sourcePage) && sourcePage > 0
      ? orderedImages.findIndex((image) => scanPageNumber(image) === sourcePage)
      : -1
  const initialPageIndex = sourceIndex >= 0 ? sourceIndex : null
  const searchQuery = firstParam(search.q)?.trim() || ""
  const requestedSort = (firstParam(search.sort) || "relevance").toLowerCase()
  const searchSort = ["relevance", "oldest", "newest"].includes(requestedSort) ? requestedSort : "relevance"
  const sourceParam = (firstParam(search.source) || "all").trim().toLowerCase()
  const searchSource = sourceParam === "all" ? null : sourceParam
  const searchYearValue = Number(firstParam(search.year))
  const searchYear = Number.isInteger(searchYearValue) && searchYearValue >= 1800 && searchYearValue <= 2200 ? searchYearValue : null
  const searchIndexValue = Number(firstParam(search.searchIndex))
  const searchIndex = Number.isInteger(searchIndexValue) && searchIndexValue >= 0 ? searchIndexValue : null
  const searchTotalValue = Number(firstParam(search.searchTotal))
  const searchTotal = Number.isInteger(searchTotalValue) && searchTotalValue > 0 ? searchTotalValue : null
  const pageSizeValue = Number(firstParam(search.pageSize))
  const searchPageSize = [25, 50, 100].includes(pageSizeValue) ? pageSizeValue : 50

  const { count: indexedPages } = await supabase
    .from("newspaper_ocr_pages")
    .select("id", { count: "exact", head: true })
    .eq("publication_code", publication)
    .eq("issue_date", issue.issueDate)
    .eq("status", "complete")
  const isSearchable = (indexedPages || 0) > 0

  let searchSnippet = ""
  if (searchQuery && initialPageIndex !== null) {
    const pageLabel = scanFilename(orderedImages[initialPageIndex])
    const { data: ocrPage } = await supabase
      .from("newspaper_ocr_pages")
      .select("ocr_text")
      .eq("publication_code", publication)
      .eq("issue_date", issue.issueDate)
      .eq("page_label", pageLabel)
      .eq("status", "complete")
      .maybeSingle()
    searchSnippet = matchSnippet(ocrPage?.ocr_text || "", searchQuery)
  }

  let previousMatchHref: string | null = null
  let nextMatchHref: string | null = null

  if (searchQuery && searchIndex !== null) {
    const baseArgs = {
      p_query: searchQuery,
      p_collection: "newspaper",
      p_source: searchSource,
      p_year: searchYear,
      p_sort: searchSort,
      p_limit: 1,
    }

    const [previousResponse, nextResponse] = await Promise.all([
      searchIndex > 0
        ? supabase.rpc("search_museum_ocr", { ...baseArgs, p_offset: searchIndex - 1 })
        : Promise.resolve({ data: null, error: null }),
      searchTotal === null || searchIndex + 1 < searchTotal
        ? supabase.rpc("search_museum_ocr", { ...baseArgs, p_offset: searchIndex + 1 })
        : Promise.resolve({ data: null, error: null }),
    ])

    const buildMatchHref = (row: SearchMatchRow | undefined, index: number) => {
      if (!row?.issue_date || !row.document_slug) return null
      const params = new URLSearchParams()
      if (row.page_number) params.set("sourcePage", String(row.page_number))
      params.set("q", searchQuery)
      params.set("sort", searchSort)
      params.set("source", searchSource || "all")
      if (searchYear) params.set("year", String(searchYear))
      params.set("searchIndex", String(index))
      if (searchTotal) params.set("searchTotal", String(searchTotal))
      params.set("pageSize", String(searchPageSize))
      return `/media/newspapers/${row.document_slug}/${row.issue_date}?${params.toString()}`
    }

    previousMatchHref = buildMatchHref(
      (previousResponse.data?.[0] || undefined) as SearchMatchRow | undefined,
      searchIndex - 1,
    )
    nextMatchHref = buildMatchHref(
      (nextResponse.data?.[0] || undefined) as SearchMatchRow | undefined,
      searchIndex + 1,
    )
  }

  const matchPosition = searchIndex !== null ? searchIndex + 1 : null

  return <main className="ma-page">
    <section className="ma-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.98),rgba(5,8,10,.84) 50%,rgba(5,8,10,.48)),url(${issue.coverImage})`,backgroundSize:'cover',backgroundPosition:'center 15%'}}>
      <div className="ma-hero-inner">
        <div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/media/newspapers">Newspapers</Link><span>›</span><Link href={`/media/newspapers/${publication}`}>{issue.publication}</Link><span>›</span><span>{issue.title}</span></div>
        <div className="ma-hero-grid">
          <div>
            <div className="ma-eyebrow">Digitized Newspaper Issue</div>
            <h1 className="ma-title">{issue.publication}</h1>
            <div className="ma-subtitle">{issue.title}</div>
            <p className="ma-lede">{summary}</p>
            <div className="ma-actions">
              <Link href={`/media/newspapers/${publication}`} className="ma-button">Back to Publication</Link>
              <Link href={`/media/newspapers/${publication}/year/${issue.year}`} className="ma-button-ghost">Browse {issue.year}</Link>
              <Link href="/media/newspapers#newspaper-search" className="ma-button-ghost">Search Newspapers</Link>
            </div>
          </div>
          <div className="ma-hero-media"><img src={issue.coverImage} alt={`${issue.publication} ${issue.title}`} className="ma-cover" />{issue.backCoverImage ? <img src={issue.backCoverImage} alt={`${issue.publication} back cover`} className="ma-cover" /> : null}</div>
        </div>
        <div className="ma-stats">
          <div className="ma-stat"><strong>{issue.year}</strong><span>Publication Year</span></div>
          <div className="ma-stat"><strong>{pages.length}</strong><span>Digitized Pages</span></div>
          <div className="ma-stat"><strong>{issue.volume || '—'}</strong><span>Volume</span></div>
          <div className="ma-stat"><strong>{issue.number || '—'}</strong><span>Issue Number</span></div>
          <div className="ma-stat"><strong>{isSearchable ? 'OCR' : 'SCAN'}</strong><span>{isSearchable ? 'Searchable' : 'Digitized'}</span></div>
        </div>
      </div>
    </section>

    {searchQuery && initialPageIndex !== null ? <section className="ma-section"><div className="ma-source ma-search-source"><strong className="ma-gold">Opened from OCR search:</strong> “{searchQuery}” matched source page {sourcePage}. {matchPosition && searchTotal ? `Match ${matchPosition.toLocaleString()} of ${searchTotal.toLocaleString()}.` : ''} The original scan is opened below for verification.</div></section> : null}

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Complete Issue</div><h2 className="ma-h2">Issue Pages</h2></div><div className="ma-note">Select any page for a full-screen viewer. Use arrow keys to move through the issue.</div></div><NewspaperPageViewer pages={pages} initialPageIndex={initialPageIndex} searchQuery={searchQuery || null} searchSnippet={searchSnippet || null} previousMatchHref={previousMatchHref} nextMatchHref={nextMatchHref} matchPosition={matchPosition} matchTotal={searchTotal} /></section>

    <section className="ma-section"><div className="ma-source"><strong className="ma-gold">Museum research note:</strong> digitized issues are preserved as archival source material. {isSearchable ? 'This issue has searchable OCR text; OCR may contain transcription errors, so use the scanned page as the final source.' : 'This issue is digitized but is not yet part of the full-text OCR search index.'}</div></section>
    <section className="ma-section"><div className="ma-footer-links"><Link href={`/media/newspapers/${publication}/year/${issue.year}`} className="ma-footer-link">{issue.year} Archive<span>All issues from this year →</span></Link><Link href={`/media/newspapers/${publication}`} className="ma-footer-link">{issue.publication}<span>Publication archive →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}
