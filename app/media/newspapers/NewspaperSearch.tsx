"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"

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

const NEWSPAPER_EXAMPLES = ["Dick Trickle", "Miles Melius", "point standings", "Slinger"]
const PRINT_EXAMPLES = ["Dick Trickle", "champion", "point standings", "Slinger"]

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

    setQuery(q)
    setSearchedQuery(q)
    setSource(nextSource)
    setYear(nextYear)
    setSort(nextSort)
    setPage(nextPage)
    setPageSize(nextPageSize)
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({
        q,
        collection,
        page: String(nextPage),
        pageSize: String(nextPageSize),
        sort: nextSort,
      })
      if (nextSource !== "all") params.set("source", nextSource)
      if (nextYear !== "all") params.set("year", nextYear)

      const response = await fetch(`/api/newspaper-search?${params.toString()}`, { cache: "no-store" })
      const payload = (await response.json()) as SearchResponse
      if (!response.ok) throw new Error(payload.error || "Search failed.")

      setResults(payload.results || [])
      setSources(payload.sources || [])
      setYears(payload.years || [])
      setTotal(payload.total || 0)
      setPage(payload.page || 1)
      setTotalPages(payload.totalPages || 1)
    } catch (searchError) {
      setResults([])
      setSources([])
      setYears([])
      setTotal(0)
      setTotalPages(1)
      setError(searchError instanceof Error ? searchError.message : "Search failed.")
    } finally {
      setLoading(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void runSearch(query, { page: 1 })
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

  return (
    <div className="ma-ocr-search">
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
          />
          <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search Archive"}</button>
        </div>
        <div className="ma-ocr-examples">
          <span>Try:</span>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => void runSearch(example, { page: 1 })}>{example}</button>
          ))}
        </div>
      </form>

      {error ? <div className="ma-ocr-message error">{error}</div> : null}

      {!loading && searchedQuery && !error ? (
        <>
          <div className="ma-ocr-result-head">
            <div>
              <strong>{total.toLocaleString()} matching page{total === 1 ? "" : "s"}</strong>
              <span> for “{searchedQuery}”</span>
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
        <div className="ma-ocr-message">No OCR-indexed pages matched those filters. OCR can miss historical type, so try a shorter name, alternate spelling, another year, or All {isPrint ? "Printed Archive" : "Publications"}.</div>
      ) : null}

      {results.length ? (
        <div className="ma-ocr-results">
          {results.map((result) => {
            const date = displayDate(result.issueDate)
            return (
              <Link className="ma-ocr-result" href={result.href} key={result.id}>
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
                  <p>{result.snippet}</p>
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
