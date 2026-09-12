import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)

const MEDIA_BASE_URL = "https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/"
const SOURCE_NAMES: Record<string, string> = {
  "midwest-racing-news": "Midwest Racing News",
  "checkered-flag-racing-news": "Checkered Flag Racing News",
  "national-speed-sport-news": "National Speed Sport News",
  "hawkeye-racing-news": "Hawkeye Racing News",
  "all-the-dirt-racing-news": "All The Dirt Racing News",
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

type CachedPayload = { savedAt: number; payload: unknown }

declare global {
  // eslint-disable-next-line no-var
  var __umarmOcrSearchCache: Map<string, CachedPayload> | undefined
}
const cache = globalThis.__umarmOcrSearchCache ?? new Map<string, CachedPayload>()
globalThis.__umarmOcrSearchCache = cache
const MAX_STALE_MS = 60 * 60 * 1000

function normalizeSearchQuery(value: string) {
  return value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim()
}

function pageSizeFrom(value: string | null) {
  const parsed = Number(value)
  return [25, 50, 100].includes(parsed) ? parsed : 50
}

function queryTerms(query: string) {
  return Array.from(
    new Set(
      normalizeSearchQuery(query)
        .toLowerCase()
        .replace(/["'()]/g, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !["and", "or", "not"].includes(term)),
    ),
  )
}

function makeSnippet(text: string, query: string) {
  const clean = text.replace(/===\s*COLUMN\s+\d+\s*===/gi, " ").replace(/\s+/g, " ").trim()
  if (!clean) return ""

  const phrase = normalizeSearchQuery(query).replace(/^"|"$/g, "").toLowerCase()
  const lower = clean.toLowerCase()
  const terms = queryTerms(query)
  let hit = phrase ? lower.indexOf(phrase) : -1
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retryRpc<T>(name: string, args: Record<string, unknown>, attempts = 4) {
  let response = await supabase.rpc(name, args)
  for (let attempt = 1; response.error && attempt < attempts; attempt += 1) {
    await sleep(180 * Math.pow(2, attempt - 1))
    response = await supabase.rpc(name, args)
  }
  return response as { data: T | null; error: unknown | null }
}

export async function GET(request: NextRequest) {
  const query = normalizeSearchQuery(request.nextUrl.searchParams.get("q") || "")
  if (query.length < 2) {
    return NextResponse.json({ query, results: [], error: "Enter at least two characters." }, { status: 400 })
  }
  if (query.length > 120) {
    return NextResponse.json({ query, results: [], error: "Search is too long." }, { status: 400 })
  }

  const collection = request.nextUrl.searchParams.get("collection") === "print" ? "print" : "newspaper"
  const sourceParam = (request.nextUrl.searchParams.get("source") || "all").trim().toLowerCase()
  const source = sourceParam === "all" ? null : sourceParam
  const yearValue = Number(request.nextUrl.searchParams.get("year"))
  const year = Number.isInteger(yearValue) && yearValue >= 1800 && yearValue <= 2200 ? yearValue : null
  const requestedSort = (request.nextUrl.searchParams.get("sort") || "relevance").toLowerCase()
  const sort = ["relevance", "oldest", "newest"].includes(requestedSort) ? requestedSort : "relevance"
  const pageSize = pageSizeFrom(request.nextUrl.searchParams.get("pageSize"))
  const requestedPage = Number(request.nextUrl.searchParams.get("page"))
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const offset = (page - 1) * pageSize

  const cacheKey = JSON.stringify({ query, collection, source, year, sort, pageSize, page })

  const searchArgs = {
    p_query: query,
    p_collection: collection,
    p_source: source,
    p_year: year,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: offset,
  }

  const searchResponse = await retryRpc<SearchRow[]>("search_museum_ocr", searchArgs, 4)

  if (searchResponse.error) {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.savedAt <= MAX_STALE_MS) {
      return NextResponse.json(cached.payload, {
        headers: {
          "Cache-Control": "no-store",
          "X-UMARM-OCR-Source": "stale-cache",
        },
      })
    }

    console.error("STABLE OCR SEARCH ERROR", searchResponse.error)
    return NextResponse.json(
      { query, results: [], error: "Archive search hit a temporary connection problem. Please search again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }

  const rows = (searchResponse.data || []) as SearchRow[]
  const total = Number(rows[0]?.total_count || 0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  let facets: FacetRow[] = []
  const facetResponse = await retryRpc<FacetRow[]>(
    "search_museum_ocr_facets",
    { p_query: query, p_collection: collection, p_source: source, p_year: year },
    2,
  )
  if (!facetResponse.error) facets = (facetResponse.data || []) as FacetRow[]

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

  const results = rows.map((row, rowIndex) => {
    const isNewspaper = row.document_type === "newspaper"
    const sourceName = SOURCE_NAMES[row.source_key] || row.source_key
    const documentTitle = isNewspaper ? sourceName : row.document_title
    const scanUrl = `${MEDIA_BASE_URL}${row.storage_path}`

    const resultParams = new URLSearchParams()
    if (row.page_number) resultParams.set("sourcePage", String(row.page_number))
    resultParams.set("q", query)
    resultParams.set("sort", sort)
    resultParams.set("source", source || "all")
    if (year) resultParams.set("year", String(year))
    resultParams.set("searchIndex", String(offset + rowIndex))
    resultParams.set("searchTotal", String(total))
    resultParams.set("pageSize", String(pageSize))

    const href = isNewspaper
      ? `/media/newspapers/${row.document_slug}/${row.issue_date}?${resultParams.toString()}`
      : row.page_number
        ? `/media/race-programs/${row.document_slug}?${resultParams.toString()}`
        : scanUrl

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
      image: scanUrl,
    }
  })

  const payload = {
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
    searchMode: "ranked",
    queryMode: query.startsWith('"') && query.endsWith('"') ? "exact_phrase" : "all_words",
  }

  cache.set(cacheKey, { savedAt: Date.now(), payload })
  if (cache.size > 100) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "X-UMARM-OCR-Source": "live",
    },
  })
}
