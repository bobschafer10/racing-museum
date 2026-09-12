import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ocrSupabase = createClient(
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

const MEDIA_BASE_URL = "https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/"

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

type FallbackSearchResult = {
  rows: SearchRow[]
  total: number
  error: unknown | null
}

function normalizeSearchQuery(value: string) {
  return value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim()
}

function exactPhraseFromQuery(query: string) {
  const trimmed = normalizeSearchQuery(query)
  if (trimmed.length < 3 || !trimmed.startsWith('"') || !trimmed.endsWith('"')) return null
  const phrase = trimmed.slice(1, -1).trim()
  return phrase.length >= 2 ? phrase : null
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
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

function exactPhraseHit(text: string, phrase: string) {
  const tokens = phrase
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (!tokens.length) return -1
  const matcher = new RegExp(tokens.map(escapeRegex).join("[\\s\\W_]+"), "i")
  return matcher.exec(text)?.index ?? -1
}

function makeSnippet(text: string, query: string) {
  const clean = text
    .replace(/===\s*COLUMN\s+\d+\s*===/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!clean) return ""

  const lower = clean.toLowerCase()
  const exactPhrase = exactPhraseFromQuery(query)
  const normalizedQuery = normalizeSearchQuery(query).toLowerCase()
  const terms = queryTerms(query)
  let hit = exactPhrase ? exactPhraseHit(clean, exactPhrase) : normalizedQuery ? lower.indexOf(normalizedQuery) : -1

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

function pageNumberFromLabel(value: string | null) {
  const match = String(value || "").match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fallbackFullTextSearch({
  query,
  collection,
  source,
  year,
  sort,
  pageSize,
  offset,
}: {
  query: string
  collection: "newspaper" | "print"
  source: string | null
  year: number | null
  sort: string
  pageSize: number
  offset: number
}): Promise<FallbackSearchResult> {
  try {
    const exactPhrase = exactPhraseFromQuery(query)

    if (collection === "print") {
      let builder: any = ocrSupabase
        .from("archive_ocr_pages")
        .select(
          "id,document_type,document_slug,document_title,publication_year,page_label,page_number,storage_path,avg_confidence,ocr_text",
          { count: "exact" },
        )
        .in("document_type", ["program", "yearbook"])
        .eq("status", "complete")
        .not("ocr_text", "is", null)
        .textSearch("search_vector", query, { config: "simple", type: "websearch" })

      if (source) builder = builder.eq("document_type", source)
      if (year) builder = builder.eq("publication_year", year)

      builder = builder.order("publication_year", { ascending: sort === "oldest", nullsFirst: false })
      builder = builder.order("page_number", { ascending: true, nullsFirst: false })

      const { data, error, count } = await builder.range(offset, offset + pageSize - 1)
      if (error) return { rows: [], total: 0, error }

      const total = Number(count || 0)
      const rows = ((data || []) as any[]).map((row) => ({
        page_id: Number(row.id),
        document_type: String(row.document_type),
        source_key: String(row.document_type),
        document_slug: String(row.document_slug),
        document_title: String(row.document_title || row.document_slug),
        publication_year: row.publication_year == null ? null : Number(row.publication_year),
        issue_date: null,
        page_label: row.page_label || null,
        page_number: row.page_number == null ? null : Number(row.page_number),
        storage_path: String(row.storage_path),
        avg_confidence: row.avg_confidence == null ? null : Number(row.avg_confidence),
        ocr_text: row.ocr_text || null,
        exact_phrase: exactPhrase ? exactPhraseHit(String(row.ocr_text || ""), exactPhrase) >= 0 : false,
        rank_score: 0,
        total_count: total,
      }))

      return { rows, total, error: null }
    }

    let builder: any = ocrSupabase
      .from("newspaper_ocr_pages")
      .select("id,publication_code,issue_date,page_label,storage_path,avg_confidence,ocr_text", { count: "exact" })
      .eq("status", "complete")
      .not("ocr_text", "is", null)
      .textSearch("search_vector", query, { config: "simple", type: "websearch" })

    if (source) builder = builder.eq("publication_code", source)
    if (year) {
      builder = builder.gte("issue_date", `${year}-01-01`).lt("issue_date", `${year + 1}-01-01`)
    }

    builder = builder.order("issue_date", { ascending: sort === "oldest", nullsFirst: false })
    builder = builder.order("page_label", { ascending: true, nullsFirst: false })

    const { data, error, count } = await builder.range(offset, offset + pageSize - 1)
    if (error) return { rows: [], total: 0, error }

    const total = Number(count || 0)
    const rows = ((data || []) as any[]).map((row) => ({
      page_id: Number(row.id),
      document_type: "newspaper",
      source_key: String(row.publication_code),
      document_slug: String(row.publication_code),
      document_title: String(row.publication_code),
      publication_year: row.issue_date ? Number(String(row.issue_date).slice(0, 4)) : null,
      issue_date: row.issue_date || null,
      page_label: row.page_label || null,
      page_number: pageNumberFromLabel(row.page_label || null),
      storage_path: String(row.storage_path),
      avg_confidence: row.avg_confidence == null ? null : Number(row.avg_confidence),
      ocr_text: row.ocr_text || null,
      exact_phrase: exactPhrase ? exactPhraseHit(String(row.ocr_text || ""), exactPhrase) >= 0 : false,
      rank_score: 0,
      total_count: total,
    }))

    return { rows, total, error: null }
  } catch (error) {
    return { rows: [], total: 0, error }
  }
}

export async function GET(request: NextRequest) {
  const query = normalizeSearchQuery(request.nextUrl.searchParams.get("q") || "")

  if (query.length < 2) {
    return NextResponse.json({ query, results: [], error: "Enter at least two characters." }, { status: 400 })
  }
  if (query.length > 120) {
    return NextResponse.json({ query, results: [], error: "Search is too long." }, { status: 400 })
  }
  if (query.startsWith('"') && query.endsWith('"') && !exactPhraseFromQuery(query)) {
    return NextResponse.json({ query, results: [], error: "Enter text inside the quotation marks." }, { status: 400 })
  }

  const collection: "newspaper" | "print" = request.nextUrl.searchParams.get("collection") === "print" ? "print" : "newspaper"
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

  const searchArgs = {
    p_query: query,
    p_collection: collection,
    p_source: source,
    p_year: year,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: offset,
  }
  const facetArgs = {
    p_query: query,
    p_collection: collection,
    p_source: source,
    p_year: year,
  }

  // Run the result search first instead of opening two simultaneous RPC connections.
  // During OCR indexing the API pool can briefly be busy; a short staggered retry is
  // substantially more reliable than firing the result and facet RPCs together.
  let searchResponse = await ocrSupabase.rpc("search_museum_ocr", searchArgs)
  for (let attempt = 1; searchResponse.error && attempt <= 2; attempt += 1) {
    console.warn(`MUSEUM OCR SEARCH RETRY ${attempt}`, searchResponse.error)
    await sleep(200 * attempt)
    searchResponse = await ocrSupabase.rpc("search_museum_ocr", searchArgs)
  }

  let rows: SearchRow[] = []
  let fallbackTotal: number | null = null
  let searchMode: "ranked" | "fallback" = "ranked"

  if (searchResponse.error) {
    console.error("MUSEUM OCR SEARCH RPC ERROR", searchResponse.error)
    const fallback = await fallbackFullTextSearch({
      query,
      collection,
      source,
      year,
      sort,
      pageSize,
      offset,
    })

    if (fallback.error) {
      console.error("MUSEUM OCR FALLBACK ERROR", fallback.error)
      return NextResponse.json(
        { query, results: [], error: "Archive search is temporarily unavailable." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      )
    }

    rows = fallback.rows
    fallbackTotal = fallback.total
    searchMode = "fallback"
  } else {
    rows = (searchResponse.data || []) as SearchRow[]
  }

  // Facets are useful but non-critical. Fetch them only after the result query has
  // completed so a temporary facet failure can never take down the actual search.
  let facetResponse = await ocrSupabase.rpc("search_museum_ocr_facets", facetArgs)
  if (facetResponse.error) {
    console.warn("MUSEUM OCR FACET RETRY", facetResponse.error)
    await sleep(150)
    facetResponse = await ocrSupabase.rpc("search_museum_ocr_facets", facetArgs)
  }
  if (facetResponse.error) {
    console.error("MUSEUM OCR FACET ERROR", facetResponse.error)
  }

  const facets = (facetResponse.error ? [] : facetResponse.data || []) as FacetRow[]
  const total = Number(
    fallbackTotal ?? rows[0]?.total_count ?? facets.find((facet) => facet.facet_kind === "total")?.match_count ?? 0,
  )
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

  const results = rows.map((row, rowIndex) => {
    const isNewspaper = row.document_type === "newspaper"
    const sourceName = SOURCE_NAMES[row.source_key] || row.source_key
    const documentTitle = isNewspaper ? sourceName : row.document_title
    const scanUrl = `${MEDIA_BASE_URL}${row.storage_path}`

    let href: string
    if (isNewspaper) {
      const resultParams = new URLSearchParams()
      if (row.page_number) resultParams.set("sourcePage", String(row.page_number))
      resultParams.set("q", query)
      resultParams.set("sort", sort)
      resultParams.set("source", source || "all")
      if (year) resultParams.set("year", String(year))
      resultParams.set("searchIndex", String(offset + rowIndex))
      resultParams.set("searchTotal", String(total))
      resultParams.set("pageSize", String(pageSize))
      href = `/media/newspapers/${row.document_slug}/${row.issue_date}?${resultParams.toString()}`
    } else if (row.page_number) {
      const resultParams = new URLSearchParams({
        sourcePage: String(row.page_number),
        q: query,
        sort,
        source: source || "all",
        searchIndex: String(offset + rowIndex),
        searchTotal: String(total),
        pageSize: String(pageSize),
      })
      if (year) resultParams.set("year", String(year))
      href = `/media/race-programs/${row.document_slug}?${resultParams.toString()}`
    } else {
      href = scanUrl
    }

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
      searchMode,
      queryMode: exactPhraseFromQuery(query) ? "exact_phrase" : "all_words",
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
