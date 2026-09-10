import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const PUBLICATION_NAMES: Record<string, string> = {
  "midwest-racing-news": "Midwest Racing News",
  "checkered-flag-racing-news": "Checkered Flag Racing News",
  "national-speed-sport-news": "National Speed Sport News",
  "hawkeye-racing-news": "Hawkeye Racing News",
  "all-the-dirt-racing-news": "All The Dirt Racing News",
}

const SOURCE_NAMES: Record<string, string> = {
  ...PUBLICATION_NAMES,
  yearbook: "Yearbooks",
  program: "Race Programs",
}

const SOURCE_ORDER: Record<string, number> = {
  "midwest-racing-news": 1,
  "checkered-flag-racing-news": 2,
  yearbook: 1,
  program: 2,
}

type SearchRow = {
  page_id: number
  document_type: string
  source_key: string
  document_slug: string
  document_title: string
  publication_year: number | null
  issue_date: string | null
  page_label: string | null
  page_number: number | null
  storage_path: string
  avg_confidence: number | null
  ocr_text: string | null
  exact_phrase: boolean
  rank_score: number
  total_count: number
}

type FacetRow = {
  facet_kind: "total" | "source" | "year"
  facet_value: string
  match_count: number
}

function queryTerms(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/["'()]/g, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !["and", "or", "not"].includes(term)),
    ),
  )
}

function makeSnippet(text: string, query: string) {
  const clean = text
    .replace(/===\s*COLUMN\s+\d+\s*===/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!clean) return ""

  const lower = clean.toLowerCase()
  const normalizedQuery = query.toLowerCase().trim()
  const terms = queryTerms(query)
  let hit = normalizedQuery ? lower.indexOf(normalizedQuery) : -1

  if (hit < 0) {
    for (const term of terms) {
      const found = lower.indexOf(term)
      if (found >= 0 && (hit < 0 || found < hit)) hit = found
    }
  }

  const radius = 180
  const start = hit > radius ? hit - radius : 0
  const end = Math.min(clean.length, (hit >= 0 ? hit : 0) + radius + 220)
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`
}

function pageSizeFrom(value: string | null) {
  const parsed = Number(value)
  return [25, 50, 100].includes(parsed) ? parsed : 50
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim()

  if (query.length < 2) {
    return NextResponse.json({ query, results: [], error: "Enter at least two characters." }, { status: 400 })
  }
  if (query.length > 120) {
    return NextResponse.json({ query, results: [], error: "Search is too long." }, { status: 400 })
  }

  const collection = request.nextUrl.searchParams.get("collection") === "print" ? "print" : "newspaper"
  const sourceParam = (request.nextUrl.searchParams.get("source") || "all").trim().toLowerCase()
  const source = sourceParam === "all" ? null : sourceParam
  const yearParam = Number(request.nextUrl.searchParams.get("year"))
  const year = Number.isInteger(yearParam) && yearParam >= 1800 && yearParam <= 2200 ? yearParam : null
  const requestedSort = (request.nextUrl.searchParams.get("sort") || "relevance").toLowerCase()
  const sort = ["relevance", "oldest", "newest"].includes(requestedSort) ? requestedSort : "relevance"
  const pageSize = pageSizeFrom(request.nextUrl.searchParams.get("pageSize"))
  const requestedPage = Number(request.nextUrl.searchParams.get("page"))
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const offset = (page - 1) * pageSize

  const [{ data, error }, { data: facetData, error: facetError }] = await Promise.all([
    supabase.rpc("search_museum_ocr", {
      p_query: query,
      p_collection: collection,
      p_source: source,
      p_year: year,
      p_sort: sort,
      p_limit: pageSize,
      p_offset: offset,
    }),
    supabase.rpc("search_museum_ocr_facets", {
      p_query: query,
      p_collection: collection,
      p_source: source,
      p_year: year,
    }),
  ])

  if (error || facetError) {
    console.error("MUSEUM OCR SEARCH ERROR", error || facetError)
    return NextResponse.json({ query, results: [], error: "Archive search is temporarily unavailable." }, { status: 500 })
  }

  const rows = (data || []) as SearchRow[]
  const facets = (facetData || []) as FacetRow[]
  const total = Number(facets.find((facet) => facet.facet_kind === "total")?.match_count || rows[0]?.total_count || 0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const sources = facets
    .filter((facet) => facet.facet_kind === "source")
    .map((facet) => ({
      key: facet.facet_value,
      label: SOURCE_NAMES[facet.facet_value] || facet.facet_value,
      count: Number(facet.match_count),
    }))
    .sort((a, b) => (SOURCE_ORDER[a.key] || 99) - (SOURCE_ORDER[b.key] || 99) || a.label.localeCompare(b.label))

  const years = facets
    .filter((facet) => facet.facet_kind === "year")
    .map((facet) => ({ year: Number(facet.facet_value), count: Number(facet.match_count) }))
    .filter((facet) => Number.isFinite(facet.year))
    .sort((a, b) => b.year - a.year)

  const results = rows.map((row) => {
    const isNewspaper = row.document_type === "newspaper"
    const sourceName = SOURCE_NAMES[row.source_key] || row.source_key
    const documentTitle = isNewspaper ? sourceName : row.document_title
    const sourcePage = row.page_number ? `sourcePage=${row.page_number}&` : ""
    const href = isNewspaper
      ? `/media/newspapers/${row.document_slug}/${row.issue_date}?${sourcePage}q=${encodeURIComponent(query)}`
      : `/media/race-programs/${row.document_slug}${row.page_number ? `#scan-page-${row.page_number}` : ""}`

    return {
      id: `${row.document_type}-${row.page_id}`,
      documentType: row.document_type,
      sourceKey: row.source_key,
      sourceName,
      documentTitle,
      publicationYear: row.publication_year,
      issueDate: row.issue_date,
      page: row.page_number,
      pageLabel: row.page_label,
      snippet: makeSnippet(row.ocr_text || "", query),
      confidence: row.avg_confidence,
      href,
      image: `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${row.storage_path}`,
    }
  })

  return NextResponse.json(
    {
      query,
      collection,
      total,
      count: total,
      page,
      pageSize,
      totalPages,
      sort,
      source: source || "all",
      year,
      sources,
      years,
      results,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
