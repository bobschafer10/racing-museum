"use client"

import Link from "next/link"
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

type Collection = "newspaper" | "print"

type SearchResult = {
  id: string
  documentType: string
  sourceKey: string
  sourceName: string
  documentTitle: string
  publicationYear: number | null
  issueDate: string | null
  page: number | null
  pageLabel: string | null
  snippet: string
  confidence: number | null
  href: string
  image: string
}

type SourceFacet = { key: string; label: string; count: number }
type YearFacet = { year: number; count: number }

type SearchResponse = {
  query: string
  total: number
  page: number
  pageSize: number
  totalPages: number
  sort: string
  source: string
  year: number | null
  sources: SourceFacet[]
  years: YearFacet[]
  results: SearchResult[]
  error?: string
}

type ArchiveSearchProps = {
  searchablePages: number
  searchableYears: number[]
  collection?: Collection
}

type SearchOptions = {
  source: string
  year: string
  sort: string
  page: number
  pageSize: number
}

type RawSearchRow = {
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
  total_count: number
}

type RawFacetRow = {
  facet_kind: "total" | "source" | "year"
  facet_value: string
  match_count: number
}

const NEWSPAPER_EXAMPLES = ["\"Dick Trickle\"", "\"Miles Melius\"", "\"point standings\"", "Slinger"]
const PRINT_EXAMPLES = ["\"Dick Trickle\"", "champion", "\"point standings\"", "Slinger"]
const SEARCH_PARAM_PREFIX = "ocr"
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

function exactPhraseFromQuery(query: string) {
  const trimmed = query.trim()
  if (trimmed.length < 3) return null
  const straight = trimmed.startsWith('"') && trimmed.endsWith('"')
  const smart = trimmed.startsWith("“") && trimmed.endsWith("”")
  if (!straight && !smart) return null
  const phrase = trimmed.slice(1, -1).trim()
  return phrase.length >= 2 ? phrase : null
}

function displayDate(value: string | null) {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function yearSpan(years: number[]) {
  if (!years.length) return null
  const sorted = [...years].sort((a, b) => a - b)
  if (sorted.length === 1) return String(sorted[0])
  return `${sorted[0]}–${sorted[sorted.length - 1]}`
}

function pageChoices(current: number, total: number) {
  if (total <= 1) return [1]
  const values = new Set<number>([1, total])
  for (let value = current - 2; value <= current + 2; value += 1) {
    if (value > 1 && value < total) values.add(value)
  }
  return Array.from(values).sort((a, b) => a - b)
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlightedSearchText(text: string, query: string): ReactNode[] {
  const exactPhrase = exactPhraseFromQuery(query)
  const terms = exactPhrase
    ? [exactPhrase]
    : Array.from(
        new Set(
          [query.trim(), ...query.trim().replace(/["'“”()]/g, " ").split(/\s+/)]
            .map((value) => value.trim())
            .filter((value) => value.length >= 2),
        ),
      ).sort((a, b) => b.length - a.length)

  if (!terms.length) return [text]
  const matcher = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi")
  const normalized = new Set(terms.map((term) => term.toLowerCase()))
  return text.split(matcher).map((part, index) =>
    normalized.has(part.toLowerCase()) ? <mark key={`${part}-${index}`} className="ma-ocr-highlight">{part}</mark> : part,
  )
}

function safePageSize(value: string | null) {
  const parsed = Number(value)
  return [25, 50, 100].includes(parsed) ? parsed : 50
}

function safePage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function snippet(text: string, query: string) {
  const clean = text.replace(/===\s*COLUMN\s+\d+\s*===/gi, " ").replace(/\s+/g, " ").trim()
  if (!clean) return ""
  const phrase = exactPhraseFromQuery(query)?.toLowerCase() || query.trim().toLowerCase()
  const terms = query.trim().replace(/["'“”()]/g, " ").split(/\s+/).filter((value) => value.length >= 2)
  const lower = clean.toLowerCase()
  let hit = phrase ? lower.indexOf(phrase) : -1
  if (hit < 0) {
    for (const term of terms) {
      const found = lower.indexOf(term.toLowerCase())
      if (found >= 0 && (hit < 0 || found < hit)) hit = found
    }
  }
  const radius = 180
  const start = hit > radius ? hit - radius : 0
  const end = Math.min(clean.length, (hit >= 0 ? hit : 0) + radius + 220)
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`
}

function sessionCacheKey(query: string, collection: Collection, options: SearchOptions) {
  return `umarm-ocr:${JSON.stringify({ query, collection, ...options })}`
}

function readSessionCache(key: string): SearchResponse | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt: number; payload: SearchResponse }
    if (!parsed?.payload || Date.now() - parsed.savedAt > 30 * 60 * 1000) return null
    return parsed.payload
  } catch {
    return null
  }
}

function writeSessionCache(key: string, payload: SearchResponse) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), payload }))
  } catch {
    // Search must continue even when browser storage is unavailable.
  }
}

async function directSupabaseSearch(query: string, collection: Collection, options: SearchOptions): Promise<SearchResponse> {
  const source = options.source === "all" ? null : options.source
  const yearNumber = Number(options.year)
  const year = options.year !== "all" && Number.isInteger(yearNumber) ? yearNumber : null
  const offset = (options.page - 1) * options.pageSize

  const { data, error } = await supabase.rpc("search_museum_ocr", {
    p_query: query,
    p_collection: collection,
    p_source: source,
    p_year: year,
    p_sort: options.sort,
    p_limit: options.pageSize,
    p_offset: offset,
  })
  if (error) throw new Error(error.message || "Direct archive search failed.")

  const rows = (data || []) as RawSearchRow[]
  const total = Number(rows[0]?.total_count || 0)
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize))

  const facetResponse = await supabase.rpc("search_museum_ocr_facets", {
    p_query: query,
    p_collection: collection,
    p_source: source,
    p_year: year,
  })
  const facets = (facetResponse.error ? [] : facetResponse.data || []) as RawFacetRow[]

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
    resultParams.set("sort", options.sort)
    resultParams.set("source", source || "all")
    if (year) resultParams.set("year", String(year))
    resultParams.set("searchIndex", String(offset + rowIndex))
    resultParams.set("searchTotal", String(total))
    resultParams.set("pageSize", String(options.pageSize))

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
      snippet: snippet(row.ocr_text || "", query),
      confidence: row.avg_confidence,
      href,
      image: scanUrl,
    }
  })

  return {
    query,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages,
    sort: options.sort,
    source: options.source,
    year,
    sources,
    years,
    results,
  }
}

export default function NewspaperSearch({
  searchablePages,
  searchableYears,
  collection = "newspaper",
}: ArchiveSearchProps) {
  const isPrint = collection === "print"
  const examples = isPrint ? PRINT_EXAMPLES : NEWSPAPER_EXAMPLES
  const searchId = isPrint ? "print-ocr-query" : "newspaper-ocr-query"

  const [query, setQuery] = useState("")
  const [searchedQuery, setSearchedQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [sources, setSources] = useState<SourceFacet[]>([])
  const [years, setYears] = useState<YearFacet[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [source, setSource] = useState("all")
  const [year, setYear] = useState("all")
  const [sort, setSort] = useState("relevance")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const requestController = useRef<AbortController | null>(null)
  const requestSequence = useRef(0)
  const restoredFromUrl = useRef(false)

  function syncSearchUrl(q: string, options: SearchOptions) {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.set(`${SEARCH_PARAM_PREFIX}q`, q)
    url.searchParams.set(`${SEARCH_PARAM_PREFIX}source`, options.source)
    url.searchParams.set(`${SEARCH_PARAM_PREFIX}year`, options.year)
    url.searchParams.set(`${SEARCH_PARAM_PREFIX}sort`, options.sort)
    url.searchParams.set(`${SEARCH_PARAM_PREFIX}page`, String(options.page))
    url.searchParams.set(`${SEARCH_PARAM_PREFIX}size`, String(options.pageSize))
    url.hash = isPrint ? "printed-archive-search" : "newspaper-search"
    window.history.replaceState(window.history.state, "", url.toString())
  }

  function clearSearchUrl() {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    for (const key of ["q", "source", "year", "sort", "page", "size"]) {
      url.searchParams.delete(`${SEARCH_PARAM_PREFIX}${key}`)
    }
    window.history.replaceState(window.history.state, "", url.toString())
  }

  async function runSearch(value: string, overrides: Partial<SearchOptions> = {}) {
    const q = value.trim()
    if (q.length < 2) {
      setError("Enter at least two characters.")
      return
    }

    const nextSource = overrides.source ?? source
    const nextYear = overrides.year ?? year
    const nextSort = overrides.sort ?? sort
    const nextPage = overrides.page ?? page
    const nextPageSize = overrides.pageSize ?? pageSize
    const nextOptions: SearchOptions = {
      source: nextSource,
      year: nextYear,
      sort: nextSort,
      page: nextPage,
      pageSize: nextPageSize,
    }

    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    const sequence = ++requestSequence.current

    setQuery(q)
    setSearchedQuery(q)
    setSource(nextSource)
    setYear(nextYear)
    setSort(nextSort)
    setPage(nextPage)
    setPageSize(nextPageSize)
    setLoading(true)
    setError("")
    setWarning("")

    const params = new URLSearchParams({
      q,
      collection,
      page: String(nextPage),
      pageSize: String(nextPageSize),
      sort: nextSort,
    })
    if (nextSource !== "all") params.set("source", nextSource)
    if (nextYear !== "all") params.set("year", nextYear)
    const cacheKey = sessionCacheKey(q, collection, nextOptions)

    try {
      let payload: SearchResponse | null = null
      let lastError: Error | null = null

      for (let attempt = 0; attempt < 3 && !payload; attempt += 1) {
        try {
          const response = await fetch(`/api/newspaper-search?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
          })
          const candidate = (await response.json()) as SearchResponse
          if (response.ok) {
            payload = candidate
            break
          }
          lastError = new Error(candidate.error || `Archive search returned ${response.status}.`)
          if (response.status < 500) break
        } catch (requestError) {
          if (requestError instanceof DOMException && requestError.name === "AbortError") throw requestError
          lastError = requestError instanceof Error ? requestError : new Error("Archive search failed.")
        }
        if (attempt < 2) await delay(attempt === 0 ? 250 : 650)
      }

      if (!payload) {
        try {
          payload = await directSupabaseSearch(q, collection, nextOptions)
        } catch (directError) {
          const cached = readSessionCache(cacheKey)
          if (cached) {
            payload = cached
            setWarning("Live archive connection was interrupted; showing the last successful results for this exact search.")
          } else {
            throw directError instanceof Error ? directError : lastError || new Error("Archive search failed.")
          }
        }
      }

      if (sequence !== requestSequence.current) return
      writeSessionCache(cacheKey, payload)
      setResults(payload.results || [])
      setSources(payload.sources || [])
      setYears(payload.years || [])
      setTotal(payload.total || 0)
      setPage(payload.page || 1)
      setTotalPages(payload.totalPages || 1)
      syncSearchUrl(q, {
        ...nextOptions,
        page: payload.page || 1,
        pageSize: payload.pageSize || nextPageSize,
      })
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === "AbortError") return
      if (sequence !== requestSequence.current) return
      setResults([])
      setSources([])
      setYears([])
      setTotal(0)
      setTotalPages(1)
      setError(searchError instanceof Error ? searchError.message : "Archive search is temporarily unavailable.")
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (restoredFromUrl.current || typeof window === "undefined") return
    restoredFromUrl.current = true
    const params = new URLSearchParams(window.location.search)
    const restoredQuery = (params.get(`${SEARCH_PARAM_PREFIX}q`) || "").trim()
    if (restoredQuery.length < 2) return

    const restoredSource = params.get(`${SEARCH_PARAM_PREFIX}source`) || "all"
    const restoredYear = params.get(`${SEARCH_PARAM_PREFIX}year`) || "all"
    const restoredSortValue = params.get(`${SEARCH_PARAM_PREFIX}sort`) || "relevance"
    const restoredSort = ["relevance", "oldest", "newest"].includes(restoredSortValue) ? restoredSortValue : "relevance"
    void runSearch(restoredQuery, {
      source: restoredSource,
      year: restoredYear,
      sort: restoredSort,
      page: safePage(params.get(`${SEARCH_PARAM_PREFIX}page`)),
      pageSize: safePageSize(params.get(`${SEARCH_PARAM_PREFIX}size`)),
    })
    // This runs once to restore a bookmarked/back-button search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => requestController.current?.abort(), [])

  function submit(event: FormEvent) {
    event.preventDefault()
    void runSearch(query, { page: 1 })
  }

  function clearSearch() {
    requestController.current?.abort()
    requestSequence.current += 1
    setQuery("")
    setSearchedQuery("")
    setResults([])
    setSources([])
    setYears([])
    setTotal(0)
    setPage(1)
    setTotalPages(1)
    setPageSize(50)
    setSource("all")
    setYear("all")
    setSort("relevance")
    setLoading(false)
    setError("")
    setWarning("")
    clearSearchUrl()
  }

  const allSourceCount = sources.reduce((sum, item) => sum + item.count, 0)
  const visibleYearOptions = useMemo(() => {
    if (year === "all" || years.some((item) => String(item.year) === year)) return years
    const selected = Number(year)
    if (!Number.isFinite(selected)) return years
    return [...years, { year: selected, count: 0 }].sort((a, b) => b.year - a.year)
  }, [year, years])
  const pages = pageChoices(page, totalPages)
  const start = total ? (page - 1) * pageSize + 1 : 0
  const end = total ? Math.min(page * pageSize, total) : 0
  const span = yearSpan(searchableYears)
  const searchedExactPhrase = exactPhraseFromQuery(searchedQuery)

  return (
    <div className="ma-ocr-search" aria-busy={loading}>
      <div className="ma-ocr-search-copy">
        <div>
          <div className="ma-kicker">{isPrint ? "Full-Text Program & Yearbook Research" : "Full-Text Newspaper Research"}</div>
          <h2 className="ma-h2">{isPrint ? "Search Programs & Yearbooks" : "Search the Newspaper Archive"}</h2>
          <p>
            {isPrint
              ? "Search names, tracks, series, results, champions, and point standings inside OCR-indexed programs and yearbooks. Results link back to the original scanned publication."
              : "Search names, tracks, phrases, results, and point standings inside OCR-indexed newspaper pages. Results open the original scanned source page."}
          </p>
        </div>
        <div className="ma-ocr-status">
          <strong>Searchable now:</strong> {searchablePages.toLocaleString()} OCR-indexed pages
          {span ? ` spanning ${span}` : ""} {isPrint ? "across programs and yearbooks." : "across all indexed newspaper publications."}
          {" "}More material appears automatically as indexing completes.
        </div>
      </div>

      <form className="ma-ocr-form" onSubmit={submit}>
        <label htmlFor={searchId}>{isPrint ? "Search program & yearbook text" : "Search newspaper text"}</label>
        <div className="ma-ocr-form-row">
          <input
            id={searchId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try a driver, track, series, or phrase…"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search Archive"}</button>
          {searchedQuery || error ? <button type="button" className="ma-ocr-clear" onClick={clearSearch} disabled={loading}>Clear</button> : null}
        </div>
        <div className="ma-ocr-search-help">
          <strong>Exact phrase:</strong> put the words in quotation marks, for example <code>"Tony Strupp"</code>. Without quotes, all words may appear elsewhere on the same page.
        </div>
        <div className="ma-ocr-examples">
          <span>Try:</span>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => void runSearch(example, { page: 1 })}>{example}</button>
          ))}
        </div>
      </form>

      <div aria-live="polite" aria-atomic="true" className="ma-ocr-live-status">
        {loading ? `Searching for ${query.trim() || "matches"}…` : searchedQuery && !error ? `${total.toLocaleString()} matching page${total === 1 ? "" : "s"} found.` : ""}
      </div>

      {warning ? <div className="ma-ocr-message">{warning}</div> : null}
      {error ? <div className="ma-ocr-message error">{error}</div> : null}

      {!loading && searchedQuery && !error ? (
        <>
          <div className="ma-ocr-result-head">
            <div>
              <strong>{total.toLocaleString()} matching page{total === 1 ? "" : "s"}</strong>
              <span> for “{searchedQuery}”</span>
              <span className={`ma-ocr-search-mode ${searchedExactPhrase ? "exact" : "broad"}`}>
                {searchedExactPhrase ? "Exact phrase" : "All words"}
              </span>
            </div>
            {total > 0 ? <span>Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}</span> : null}
          </div>

          <div className="ma-ocr-source-tabs" aria-label={isPrint ? "Publication type" : "Newspaper publication"}>
            <button
              type="button"
              className={source === "all" ? "active" : ""}
              onClick={() => void runSearch(searchedQuery, { source: "all", page: 1 })}
            >
              {isPrint ? "All Printed Archive" : "All Publications"} <span>{(allSourceCount || total).toLocaleString()}</span>
            </button>
            {sources.map((item) => (
              <button
                type="button"
                key={item.key}
                className={source === item.key ? "active" : ""}
                onClick={() => void runSearch(searchedQuery, { source: item.key, page: 1 })}
              >
                {item.label} <span>{item.count.toLocaleString()}</span>
              </button>
            ))}
          </div>

          <div className="ma-ocr-controls">
            <label>
              <span>Year</span>
              <select value={year} onChange={(event) => void runSearch(searchedQuery, { year: event.target.value, page: 1 })}>
                <option value="all">All Years</option>
                {visibleYearOptions.map((item) => <option key={item.year} value={item.year}>{item.year} ({item.count.toLocaleString()})</option>)}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sort} onChange={(event) => void runSearch(searchedQuery, { sort: event.target.value, page: 1 })}>
                <option value="relevance">Relevance</option>
                <option value="oldest">Oldest First</option>
                <option value="newest">Newest First</option>
              </select>
            </label>
            <label>
              <span>Results per page</span>
              <select value={pageSize} onChange={(event) => void runSearch(searchedQuery, { pageSize: Number(event.target.value), page: 1 })}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </>
      ) : null}

      {!loading && searchedQuery && !error && results.length === 0 ? (
        <div className="ma-ocr-message">
          No OCR-indexed pages matched those filters. {searchedExactPhrase ? "Try removing the quotation marks for a broader all-words search, or " : "Try "}a shorter name, alternate spelling, another year, or All {isPrint ? "Printed Archive" : "Publications"}.
        </div>
      ) : null}

      {results.length ? (
        <div className={`ma-ocr-results${loading ? " loading" : ""}`}>
          {results.map((result) => {
            const date = displayDate(result.issueDate)
            return (
              <Link className="ma-ocr-result" href={result.href} key={result.id} aria-label={`Open ${result.documentTitle}, ${result.page ? `page ${result.page}` : result.pageLabel || "matched page"}`}>
                <div className="ma-ocr-result-thumb">
                  <img src={result.image} alt={`${result.documentTitle} ${result.pageLabel || "page"}`} loading="lazy" />
                </div>
                <div className="ma-ocr-result-body">
                  <div className="ma-ocr-result-meta">
                    <span>{result.sourceName}</span>
                    <span>{date || result.publicationYear || "Unknown year"}</span>
                    <span>{result.page ? `Page ${result.page}` : result.pageLabel || "Page"}</span>
                  </div>
                  {isPrint ? <div className="ma-ocr-result-title">{result.documentTitle}</div> : null}
                  <p>{highlightedSearchText(result.snippet, searchedQuery)}</p>
                  <strong>Open scanned source page →</strong>
                </div>
              </Link>
            )
          })}
        </div>
      ) : null}

      {!loading && results.length > 0 && totalPages > 1 ? (
        <div className="ma-ocr-pagination">
          <button type="button" disabled={page <= 1} onClick={() => void runSearch(searchedQuery, { page: page - 1 })}>← Previous</button>
          <div className="ma-ocr-page-numbers">
            {pages.map((pageNumber, index) => (
              <span key={pageNumber} className="ma-ocr-page-slot">
                {index > 0 && pageNumber - pages[index - 1] > 1 ? <em>…</em> : null}
                <button
                  type="button"
                  className={pageNumber === page ? "active" : ""}
                  aria-current={pageNumber === page ? "page" : undefined}
                  onClick={() => void runSearch(searchedQuery, { page: pageNumber })}
                >{pageNumber}</button>
              </span>
            ))}
          </div>
          <button type="button" disabled={page >= totalPages} onClick={() => void runSearch(searchedQuery, { page: page + 1 })}>Next →</button>
        </div>
      ) : null}
    </div>
  )
}
