"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"

type SearchResult = {
  id: number
  publicationName: string
  issueDate: string
  page: number | null
  pageLabel: string | null
  snippet: string
  confidence: number | null
  href: string
  image: string
}

type SearchResponse = {
  query: string
  count?: number
  results: SearchResult[]
  error?: string
}

const EXAMPLES = ["Miles Melius", "point standings", "Slinger", "Etchie Biertzer"]

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function NewspaperSearch() {
  const [query, setQuery] = useState("")
  const [searchedQuery, setSearchedQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function runSearch(value: string) {
    const q = value.trim()
    if (q.length < 2) {
      setError("Enter at least two characters.")
      return
    }

    setQuery(q)
    setSearchedQuery(q)
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/newspaper-search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      const payload = (await response.json()) as SearchResponse
      if (!response.ok) throw new Error(payload.error || "Search failed.")
      setResults(payload.results || [])
    } catch (searchError) {
      setResults([])
      setError(searchError instanceof Error ? searchError.message : "Search failed.")
    } finally {
      setLoading(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void runSearch(query)
  }

  return (
    <div className="ma-ocr-search">
      <div className="ma-ocr-search-copy">
        <div className="ma-kicker">Full-Text Newspaper Research</div>
        <h2 className="ma-h2">Search the Newspaper Archive</h2>
        <p>
          Search names, tracks, phrases, results, and point standings inside OCR-indexed newspaper pages. Results open the original scanned source page.
        </p>
        <div className="ma-ocr-status"><strong>Searchable now:</strong> 136 pages of 1959 Midwest Racing News. More years will appear here as OCR indexing continues.</div>
      </div>

      <form className="ma-ocr-form" onSubmit={submit}>
        <label htmlFor="newspaper-ocr-query">Search newspaper text</label>
        <div className="ma-ocr-form-row">
          <input
            id="newspaper-ocr-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try a driver, track, or phrase…"
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search Archive"}</button>
        </div>
        <div className="ma-ocr-examples">
          <span>Try:</span>
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => void runSearch(example)}>{example}</button>
          ))}
        </div>
      </form>

      {error ? <div className="ma-ocr-message error">{error}</div> : null}
      {!loading && searchedQuery && !error ? (
        <div className="ma-ocr-result-head">
          <strong>{results.length.toLocaleString()} page{results.length === 1 ? "" : "s"} shown</strong>
          <span>for “{searchedQuery}”</span>
        </div>
      ) : null}

      {!loading && searchedQuery && !error && results.length === 0 ? (
        <div className="ma-ocr-message">No OCR-indexed pages matched that search. OCR can miss historical type, so try a shorter name or alternate spelling.</div>
      ) : null}

      {results.length ? (
        <div className="ma-ocr-results">
          {results.map((result) => (
            <Link className="ma-ocr-result" href={result.href} key={result.id}>
              <div className="ma-ocr-result-thumb">
                <img src={result.image} alt={`${result.publicationName} ${result.issueDate} ${result.pageLabel || "page"}`} loading="lazy" />
              </div>
              <div className="ma-ocr-result-body">
                <div className="ma-ocr-result-meta">
                  <span>{result.publicationName}</span>
                  <span>{displayDate(result.issueDate)}</span>
                  <span>{result.page ? `Page ${result.page}` : result.pageLabel || "Page"}</span>
                </div>
                <p>{result.snippet}</p>
                <strong>Open scanned source page →</strong>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
