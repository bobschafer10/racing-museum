import Link from "next/link"
import { notFound } from "next/navigation"
import { getRaceProgramBySlug } from "@/lib/race-programs"
import { supabase } from "@/lib/supabase"
import "../../archive-dark.css"

function scanPageNumber(image: string) {
  const match = image.match(/\/(\d+)\.(jpg|jpeg|png|webp)$/i)
  return match ? Number(match[1]) : null
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function queryTerms(query: string) {
  return Array.from(
    new Set(
      [query.trim(), ...query.trim().replace(/["'()]/g, " ").split(/\s+/)]
        .map((value) => value.trim())
        .filter((value) => value.length >= 2),
    ),
  ).sort((a, b) => b.length - a.length)
}

function highlightedSearchText(text: string, query: string) {
  const terms = queryTerms(query)
  if (!terms.length) return text

  const matcher = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi")
  const normalized = new Set(terms.map((term) => term.toLowerCase()))
  return text.split(matcher).map((part, index) =>
    normalized.has(part.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        style={{ background: '#f3d35b', color: '#111', fontWeight: 900, padding: '1px 3px', borderRadius: 2 }}
      >
        {part}
      </mark>
    ) : part,
  )
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
    for (const term of phrase.replace(/["'()]/g, " ").split(/\s+/).filter((value) => value.length >= 2)) {
      const found = lower.indexOf(term)
      if (found >= 0 && (hit < 0 || found < hit)) hit = found
    }
  }

  const radius = 230
  const start = hit > radius ? hit - radius : 0
  const end = Math.min(clean.length, (hit >= 0 ? hit : 0) + radius + 300)
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`
}

type OcrLayoutLine = {
  text: string
  x: number
  y: number
  w: number
  h: number
  score: number | null
}

function parseOcrLayoutLines(value: unknown): OcrLayoutLine[] {
  if (!value || typeof value !== 'object') return []
  const rawLines = (value as { lines?: unknown }).lines
  if (!Array.isArray(rawLines)) return []

  return rawLines.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>
    const text = typeof item.t === 'string' ? item.t.trim() : ''
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

function matchingOcrLayoutLines(lines: OcrLayoutLine[], query: string) {
  const phrase = query.trim().toLowerCase()
  const tokens = Array.from(new Set(
    phrase
      .replace(/["'()]/g, ' ')
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

  return lines.filter((line) => {
    const text = line.text.toLowerCase()
    return tokens.some((token) => text.includes(token))
  })
}

type SearchMatchRow = {
  document_slug: string
  page_number: number | null
}

type RaceProgramDetailProps = {
  params: Promise<{ slug: string }>
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

export default async function RaceProgramDetailPage({ params, searchParams }: RaceProgramDetailProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const program = await getRaceProgramBySlug(slug)
  if (!program) notFound()

  const rawSourcePage = firstParam(resolvedSearchParams.sourcePage)
  const requestedSourcePage = rawSourcePage && /^\d+$/.test(rawSourcePage) ? Number(rawSourcePage) : null
  const searchQuery = firstParam(resolvedSearchParams.q)?.trim() || ""
  const requestedSort = (firstParam(resolvedSearchParams.sort) || "relevance").toLowerCase()
  const searchSort = ["relevance", "oldest", "newest"].includes(requestedSort) ? requestedSort : "relevance"
  const sourceParam = (firstParam(resolvedSearchParams.source) || "all").trim().toLowerCase()
  const searchSource = sourceParam === "all" ? null : sourceParam
  const searchYearValue = Number(firstParam(resolvedSearchParams.year))
  const searchYear = Number.isInteger(searchYearValue) && searchYearValue >= 1800 && searchYearValue <= 2200 ? searchYearValue : null
  const searchIndexValue = Number(firstParam(resolvedSearchParams.searchIndex))
  const searchIndex = Number.isInteger(searchIndexValue) && searchIndexValue >= 0 ? searchIndexValue : null
  const searchTotalValue = Number(firstParam(resolvedSearchParams.searchTotal))
  const searchTotal = Number.isInteger(searchTotalValue) && searchTotalValue > 0 ? searchTotalValue : null
  const pageSizeValue = Number(firstParam(resolvedSearchParams.pageSize))
  const searchPageSize = [25, 50, 100].includes(pageSizeValue) ? pageSizeValue : 50

  const matchedImage = requestedSourcePage
    ? program.images.find((image) => scanPageNumber(image) === requestedSourcePage) || null
    : null
  const focusedSearchMatch = Boolean(requestedSourcePage && matchedImage && searchQuery)

  const heroImage = program.coverImage || program.images[0] || null
  const pageCount = program.images.length

  let searchSnippet = ""
  let searchLayoutLines: OcrLayoutLine[] = []
  if (focusedSearchMatch && requestedSourcePage) {
    const { data: ocrPage } = await supabase
      .from("archive_ocr_pages")
      .select("ocr_text,ocr_json")
      .eq("document_slug", program.slug)
      .eq("page_number", requestedSourcePage)
      .eq("status", "complete")
      .in("document_type", ["program", "yearbook"])
      .limit(1)
      .maybeSingle()
    searchSnippet = matchSnippet(ocrPage?.ocr_text || "", searchQuery)
    searchLayoutLines = matchingOcrLayoutLines(parseOcrLayoutLines(ocrPage?.ocr_json), searchQuery)
  }

  let previousMatchHref: string | null = null
  let nextMatchHref: string | null = null

  if (focusedSearchMatch && searchIndex !== null) {
    const baseArgs = {
      p_query: searchQuery,
      p_collection: "print",
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
      if (!row?.document_slug || !row.page_number) return null
      const resultParams = new URLSearchParams({
        sourcePage: String(row.page_number),
        q: searchQuery,
        sort: searchSort,
        source: searchSource || "all",
        searchIndex: String(index),
        pageSize: String(searchPageSize),
      })
      if (searchYear) resultParams.set("year", String(searchYear))
      if (searchTotal) resultParams.set("searchTotal", String(searchTotal))
      return `/media/race-programs/${row.document_slug}?${resultParams.toString()}`
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
  const resultPage = searchIndex !== null ? Math.floor(searchIndex / searchPageSize) + 1 : 1
  const returnParams = new URLSearchParams()
  if (searchQuery) returnParams.set("ocrq", searchQuery)
  returnParams.set("ocrsource", searchSource || "all")
  returnParams.set("ocryear", searchYear ? String(searchYear) : "all")
  returnParams.set("ocrsort", searchSort)
  returnParams.set("ocrpage", String(resultPage))
  returnParams.set("ocrsize", String(searchPageSize))
  const searchResultsHref = `/media/race-programs?${returnParams.toString()}#printed-archive-search`

  return (
    <main className="ma-page">
      <section
        className="ma-hero"
        style={heroImage ? { backgroundImage: `linear-gradient(90deg,rgba(5,8,10,.96),rgba(5,8,10,.82) 48%,rgba(5,8,10,.52)),url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center 30%' } : undefined}
      >
        <div className="ma-hero-inner">
          <div className="ma-breadcrumbs">
            <Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/media/race-programs">Race Programs</Link><span>›</span><span>{program.year ?? 'Archive'}</span>
          </div>

          <div className="ma-hero-grid">
            <div>
              <div className="ma-eyebrow">Printed Racing Archive</div>
              <h1 className="ma-title">{program.title}</h1>
              <div className="ma-subtitle">
                {[program.year, program.track, program.type].filter(Boolean).join(' • ')}
              </div>
              <p className="ma-lede">
                {focusedSearchMatch
                  ? `OCR search match for “${searchQuery}”. The exact scanned page containing this finding is shown below.`
                  : program.description || program.subtitle || 'A digitized race program preserved by the Upper Midwest Auto Racing Museum. Browse the complete surviving publication below.'}
              </p>
              <div className="ma-actions">
                {focusedSearchMatch ? <Link href={searchResultsHref} className="ma-button">Back to Search Results</Link> : <Link href="/media/race-programs" className="ma-button">Back to Program Archive</Link>}
                {focusedSearchMatch ? <Link href={`/media/race-programs/${program.slug}`} className="ma-button-ghost">View Complete Publication</Link> : null}
                {program.track_slug ? <Link href={`/tracks/${program.track_slug}`} className="ma-button-ghost">Open Track Archive</Link> : null}
                {program.series_slug ? <Link href={`/series/${program.series_slug}`} className="ma-button-ghost">Open Series Archive</Link> : null}
              </div>
            </div>
            <div className="ma-hero-media">
              {program.coverImage ? <img src={program.coverImage} alt={program.title} className="ma-cover" /> : null}
            </div>
          </div>

          <div className="ma-stats">
            <div className="ma-stat"><strong>{program.year ?? '—'}</strong><span>Publication Year</span></div>
            <div className="ma-stat"><strong>{pageCount}</strong><span>Scanned Pages</span></div>
            <div className="ma-stat"><strong>{program.track ? '1' : '—'}</strong><span>Connected Track</span></div>
            <div className="ma-stat"><strong>{program.series ? '1' : '—'}</strong><span>Connected Series</span></div>
            <div className="ma-stat"><strong>Digital</strong><span>Museum Preservation</span></div>
          </div>
        </div>
      </section>

      {focusedSearchMatch && matchedImage && requestedSourcePage ? (
        <section className="ma-section">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(150px,1fr) auto minmax(150px,1fr)',
              gap: 12,
              alignItems: 'center',
              marginBottom: 18,
              padding: '12px 14px',
              border: '1px solid #4b5359',
              background: '#11171b',
            }}
          >
            <div style={{ justifySelf: 'start' }}>
              {previousMatchHref ? (
                <Link href={previousMatchHref} className="ma-button-ghost">← Previous Match</Link>
              ) : (
                <span className="ma-button-ghost" style={{ opacity: .35, pointerEvents: 'none' }}>← Previous Match</span>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="ma-kicker">OCR Search Sequence</div>
              <strong style={{ display: 'block', color: '#fff', fontSize: 20, marginTop: 3 }}>
                {matchPosition && searchTotal ? `Match ${matchPosition.toLocaleString()} of ${searchTotal.toLocaleString()}` : 'OCR Search Match'}
              </strong>
            </div>
            <div style={{ justifySelf: 'end' }}>
              {nextMatchHref ? (
                <Link href={nextMatchHref} className="ma-button">Next Match →</Link>
              ) : (
                <span className="ma-button" style={{ opacity: .35, pointerEvents: 'none' }}>Next Match →</span>
              )}
            </div>
          </div>

          <div className="ma-section-head">
            <div>
              <div className="ma-kicker">OCR Search Match</div>
              <h2 className="ma-h2">Scanned Page {requestedSourcePage}</h2>
            </div>
            <div className="ma-note">
              {searchLayoutLines.length
                ? `Yellow boxes mark the OCR line${searchLayoutLines.length === 1 ? '' : 's'} containing “${searchQuery}”.`
                : `Match for “${searchQuery}”. Verify the highlighted OCR excerpt against the original scan.`}
            </div>
          </div>

          {searchSnippet ? (
            <div
              style={{
                maxWidth: 1100,
                margin: '0 auto 16px',
                padding: '14px 16px',
                background: '#1f1d14',
                border: '1px solid #8d742f',
                boxShadow: '0 8px 28px rgba(0,0,0,.25)',
              }}
            >
              <div style={{ color: '#d8b85c', fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 7 }}>
                OCR Text Around This Finding
              </div>
              <div style={{ color: '#f2f2ee', fontSize: 14, lineHeight: 1.6 }}>
                {highlightedSearchText(searchSnippet, searchQuery)}
              </div>
              <div style={{ color: '#8e969b', fontSize: 10, lineHeight: 1.5, marginTop: 8 }}>
                OCR text can contain transcription errors. The scanned page remains the archival source of record.
              </div>
            </div>
          ) : null}

          <div className="ma-scan-grid" style={{ gridTemplateColumns: 'minmax(0, 1100px)', justifyContent: 'center' }}>
            <figure className="ma-scan-frame">
              <a href={matchedImage} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                <div style={{ position: 'relative', lineHeight: 0 }}>
                  <img src={matchedImage} alt={`${program.title} scanned page ${requestedSourcePage}`} loading="eager" style={{ display: 'block', width: '100%', height: 'auto' }} />
                  {searchLayoutLines.map((line, index) => (
                    <span
                      key={`${line.text}-${index}`}
                      title={line.text}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: `${line.x * 100}%`,
                        top: `${line.y * 100}%`,
                        width: `${line.w * 100}%`,
                        height: `${Math.max(line.h * 100, .8)}%`,
                        background: 'rgba(255, 220, 55, .36)',
                        border: '2px solid rgba(255, 214, 31, .95)',
                        boxShadow: '0 0 0 2px rgba(0,0,0,.22), 0 0 12px rgba(255,214,31,.35)',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    />
                  ))}
                </div>
              </a>
              <figcaption>
                Page {requestedSourcePage} • {matchPosition && searchTotal ? `Match ${matchPosition} of ${searchTotal}` : 'Exact OCR Search Match'}
                {searchLayoutLines.length ? ` • ${searchLayoutLines.length} highlighted OCR line${searchLayoutLines.length === 1 ? '' : 's'}` : ''}
              </figcaption>
            </figure>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 12,
              alignItems: 'center',
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid #293136',
            }}
          >
            <div>
              {previousMatchHref ? <Link href={previousMatchHref} className="ma-button-ghost">← Previous Match</Link> : null}
            </div>
            <Link href={searchResultsHref} className="ma-button-ghost">Back to Search Results</Link>
            <div style={{ justifySelf: 'end' }}>
              {nextMatchHref ? <Link href={nextMatchHref} className="ma-button">Next Match →</Link> : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="ma-section">
          <div className="ma-section-head">
            <div><div className="ma-kicker">Complete Publication</div><h2 className="ma-h2">Scanned Pages</h2></div>
            <div className="ma-note">Select any page to open the full-resolution scan in a new tab.</div>
          </div>

          {pageCount === 0 ? (
            <div className="ma-source">No scanned pages are currently attached to this publication.</div>
          ) : (
            <div className="ma-scan-grid">
              {program.images.map((image, index) => {
                const sourcePage = scanPageNumber(image)
                return (
                  <figure
                    className="ma-scan-frame"
                    key={image}
                    id={sourcePage ? `scan-page-${sourcePage}` : undefined}
                    style={{ scrollMarginTop: 90 }}
                  >
                    <a href={image} target="_blank" rel="noreferrer">
                      <img src={image} alt={`${program.title} page ${index + 1}`} loading={index < 4 ? 'eager' : 'lazy'} />
                    </a>
                    <figcaption>{index === 0 ? 'Front Cover' : index === pageCount - 1 && program.backCoverImage ? 'Back Cover' : `Page ${index + 1} of ${pageCount}`}</figcaption>
                  </figure>
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="ma-section">
        <div className="ma-footer-links">
          <Link href="/media/race-programs" className="ma-footer-link">Race Programs<span>Browse printed archive →</span></Link>
          <Link href="/media/newspapers" className="ma-footer-link">Racing Newspapers<span>Browse newspaper archive →</span></Link>
          <Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link>
        </div>
      </section>
    </main>
  )
}
