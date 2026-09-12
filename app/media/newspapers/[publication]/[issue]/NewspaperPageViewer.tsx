"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import type { CSSProperties, ReactNode } from "react"
import { supabase } from "@/lib/supabase"

type NewspaperPage = { label: string; image: string }
type OcrHighlightLine = {
  text: string
  x: number
  y: number
  w: number
  h: number
  score: number | null
}

type MatchDetailRow = {
  page_id: number
  document_slug: string
  issue_date: string | null
  page_number: number | null
  page_label: string | null
  storage_path: string
  ocr_text: string | null
  ocr_json: unknown
  avg_confidence: number | null
  total_count: number | null
}

type ActiveMatch = {
  index: number
  image: string
  issueDate: string | null
  pageNumber: number | null
  pageLabel: string | null
  snippet: string
  highlights: OcrHighlightLine[]
}

type NewspaperPageViewerProps = {
  pages: NewspaperPage[]
  initialPageIndex?: number | null
  searchQuery?: string | null
  searchSnippet?: string | null
  highlightLines?: OcrHighlightLine[]
  previousMatchHref?: string | null
  nextMatchHref?: string | null
  matchPosition?: number | null
  matchTotal?: number | null
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25
const MEDIA_BASE_URL = "https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/"
const MATCH_CACHE_LIMIT = 7

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function queryPhrase(query: string) {
  const trimmed = query.trim()
  const straight = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
  const smart = trimmed.length >= 2 && trimmed.startsWith("“") && trimmed.endsWith("”")
  return straight || smart ? trimmed.slice(1, -1).trim() : trimmed
}

function highlightedSearchText(text: string, query: string): ReactNode[] {
  const phrase = queryPhrase(query)
  const terms = Array.from(
    new Set(
      [phrase, ...phrase.split(/\s+/)]
        .map((value) => value.trim())
        .filter((value) => value.length >= 2),
    ),
  ).sort((a, b) => b.length - a.length)

  if (!terms.length) return [text]
  const matcher = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi")
  const normalized = new Set(terms.map((term) => term.toLowerCase()))
  return text.split(matcher).map((part, index) =>
    normalized.has(part.toLowerCase()) ? <mark key={`${part}-${index}`} style={highlightMark}>{part}</mark> : part,
  )
}

function snippet(text: string, query: string) {
  const clean = text.replace(/===\s*COLUMN\s+\d+\s*===/gi, " ").replace(/\s+/g, " ").trim()
  if (!clean) return ""
  const phrase = queryPhrase(query).toLowerCase()
  const terms = phrase.split(/\s+/).filter((value) => value.length >= 2)
  const lower = clean.toLowerCase()
  let hit = phrase ? lower.indexOf(phrase) : -1
  if (hit < 0) {
    for (const term of terms) {
      const found = lower.indexOf(term)
      if (found >= 0 && (hit < 0 || found < hit)) hit = found
    }
  }
  const radius = 210
  const start = hit > radius ? hit - radius : 0
  const end = Math.min(clean.length, (hit >= 0 ? hit : 0) + radius + 260)
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`
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
      .replace(/["'“”()]/g, " ")
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

  const clustered = tokenMatches.filter((line, index, candidates) =>
    candidates.some((other, otherIndex) => {
      if (index === otherIndex) return false
      return Math.abs(line.y - other.y) <= 0.065 && Math.abs(line.x - other.x) <= 0.38
    }),
  )
  return clustered.length ? clustered : tokenMatches
}

function searchSettings() {
  const params = new URLSearchParams(window.location.search)
  const requestedSort = (params.get("sort") || "relevance").toLowerCase()
  const sort = ["relevance", "oldest", "newest"].includes(requestedSort) ? requestedSort : "relevance"
  const sourceParam = (params.get("source") || "all").trim().toLowerCase()
  const source = sourceParam === "all" ? null : sourceParam
  const yearValue = Number(params.get("year"))
  const year = Number.isInteger(yearValue) && yearValue >= 1800 && yearValue <= 2200 ? yearValue : null
  return { sort, source, year }
}

export default function NewspaperPageViewer({
  pages,
  initialPageIndex = null,
  searchQuery = null,
  searchSnippet = null,
  highlightLines = [],
  matchPosition = null,
  matchTotal = null,
}: NewspaperPageViewerProps) {
  const initialImage = initialPageIndex !== null ? pages[initialPageIndex]?.image || null : null
  const initialSearchMode = Boolean(searchQuery && matchPosition && matchTotal && initialImage)
  const initialMatchIndex = matchPosition ? matchPosition - 1 : 0

  const [openPageIndex, setOpenPageIndex] = useState<number | null>(initialPageIndex)
  const [searchMode, setSearchMode] = useState(initialSearchMode)
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(
    initialSearchMode && initialImage
      ? {
          index: initialMatchIndex,
          image: initialImage,
          issueDate: null,
          pageNumber: null,
          pageLabel: pages[initialPageIndex || 0]?.label || null,
          snippet: searchSnippet || "",
          highlights: highlightLines,
        }
      : null,
  )
  const [zoom, setZoom] = useState(1)
  const [matchNavBusy, setMatchNavBusy] = useState(false)
  const [matchNavError, setMatchNavError] = useState("")
  const matchCache = useRef<Map<number, ActiveMatch>>(new Map())
  const requestSequence = useRef(0)

  useEffect(() => {
    if (activeMatch) matchCache.current.set(activeMatch.index, activeMatch)
    // Only initialize from server props when the route itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasSearchContext = Boolean(searchMode && searchQuery && activeMatch && matchTotal)
  const activePosition = activeMatch ? activeMatch.index + 1 : matchPosition
  const canPreviousMatch = Boolean(hasSearchContext && activePosition && activePosition > 1)
  const canNextMatch = Boolean(hasSearchContext && activePosition && matchTotal && activePosition < matchTotal)

  const resetZoom = () => setZoom(1)
  const closeViewer = () => {
    setOpenPageIndex(null)
    resetZoom()
  }
  const zoomIn = () => setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))))
  const zoomOut = () => setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))))

  const trimCache = useCallback((centerIndex: number) => {
    for (const key of Array.from(matchCache.current.keys())) {
      if (Math.abs(key - centerIndex) > 3 || matchCache.current.size > MATCH_CACHE_LIMIT) {
        matchCache.current.delete(key)
      }
    }
  }, [])

  const loadMatch = useCallback(async (targetIndex: number, preloadOnly = false): Promise<ActiveMatch | null> => {
    if (!searchQuery || targetIndex < 0 || (matchTotal && targetIndex >= matchTotal)) return null
    const cached = matchCache.current.get(targetIndex)
    if (cached) return cached

    const { sort, source, year } = searchSettings()
    const { data, error } = await supabase.rpc("get_newspaper_ocr_match_detail", {
      p_query: searchQuery,
      p_source: source,
      p_year: year,
      p_sort: sort,
      p_offset: targetIndex,
    })
    if (error || !data?.[0]) return null

    const row = data[0] as MatchDetailRow
    const image = `${MEDIA_BASE_URL}${row.storage_path}`
    const match: ActiveMatch = {
      index: targetIndex,
      image,
      issueDate: row.issue_date,
      pageNumber: row.page_number,
      pageLabel: row.page_label,
      snippet: snippet(row.ocr_text || "", searchQuery),
      highlights: matchingOcrLayoutLines(parseOcrLayoutLines(row.ocr_json), searchQuery),
    }
    matchCache.current.set(targetIndex, match)
    trimCache(targetIndex)

    if (typeof window !== "undefined") {
      const preload = new window.Image()
      preload.decoding = "async"
      preload.src = image
      if (!preloadOnly && "decode" in preload) {
        try { await preload.decode() } catch { /* browser will still render the image */ }
      }
    }
    return match
  }, [searchQuery, matchTotal, trimCache])

  const warmAdjacent = useCallback((centerIndex: number) => {
    if (!searchQuery || !matchTotal) return
    const next = centerIndex + 1
    const previous = centerIndex - 1
    if (next < matchTotal && !matchCache.current.has(next)) void loadMatch(next, true)
    if (previous >= 0 && !matchCache.current.has(previous)) void loadMatch(previous, true)
  }, [loadMatch, matchTotal, searchQuery])

  useEffect(() => {
    if (initialSearchMode && activeMatch) warmAdjacent(activeMatch.index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const navigateMatch = useCallback(async (direction: -1 | 1) => {
    if (!hasSearchContext || !activeMatch || matchNavBusy) return
    const targetIndex = activeMatch.index + direction
    if (targetIndex < 0 || (matchTotal && targetIndex >= matchTotal)) return

    const sequence = ++requestSequence.current
    setMatchNavBusy(true)
    setMatchNavError("")
    const nextMatch = await loadMatch(targetIndex)
    if (sequence !== requestSequence.current) return

    if (!nextMatch) {
      setMatchNavBusy(false)
      setMatchNavError("Could not load that OCR match. Try again.")
      return
    }

    setActiveMatch(nextMatch)
    setSearchMode(true)
    setOpenPageIndex(initialPageIndex ?? 0)
    resetZoom()
    setMatchNavBusy(false)
    warmAdjacent(targetIndex)
  }, [activeMatch, hasSearchContext, initialPageIndex, loadMatch, matchNavBusy, matchTotal, warmAdjacent])

  const goPrev = () => {
    if (hasSearchContext) {
      if (canPreviousMatch) void navigateMatch(-1)
      return
    }
    if (openPageIndex !== null) {
      setOpenPageIndex(openPageIndex === 0 ? pages.length - 1 : openPageIndex - 1)
      resetZoom()
    }
  }

  const goNext = () => {
    if (hasSearchContext) {
      if (canNextMatch) void navigateMatch(1)
      return
    }
    if (openPageIndex !== null) {
      setOpenPageIndex(openPageIndex === pages.length - 1 ? 0 : openPageIndex + 1)
      resetZoom()
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openPageIndex === null) return
      if (event.key === "Escape") closeViewer()
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        goPrev()
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        goNext()
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        zoomIn()
      }
      if (event.key === "-") {
        event.preventDefault()
        zoomOut()
      }
      if (event.key === "0") {
        event.preventDefault()
        resetZoom()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openPageIndex, hasSearchContext, canPreviousMatch, canNextMatch, activeMatch, matchNavBusy])

  const issuePage = openPageIndex !== null ? pages[openPageIndex] : null
  const displayImage = hasSearchContext && activeMatch ? activeMatch.image : issuePage?.image || ""
  const displayLabel = hasSearchContext && activeMatch
    ? `${activeMatch.issueDate || "OCR search"}${activeMatch.pageNumber ? ` • source page ${activeMatch.pageNumber}` : activeMatch.pageLabel ? ` • ${activeMatch.pageLabel}` : ""}`
    : issuePage?.label || ""
  const activeHighlightLines = hasSearchContext && activeMatch ? activeMatch.highlights : []
  const activeSnippet = hasSearchContext && activeMatch ? activeMatch.snippet : ""
  const showSearchPanel = Boolean(hasSearchContext && searchQuery && activeSnippet)
  const displayQuery = searchQuery ? queryPhrase(searchQuery) : ""

  return <>
    <div className="ma-scan-grid">
      {pages.map((page, index) => <button
        key={`${page.label}-${page.image}`}
        type="button"
        className="ma-scan-frame"
        style={buttonReset}
        onClick={() => {
          requestSequence.current += 1
          setSearchMode(false)
          setMatchNavBusy(false)
          setMatchNavError("")
          setOpenPageIndex(index)
          resetZoom()
        }}
        aria-label={`Open ${page.label}`}
      >
        <Image src={page.image} alt={page.label} width={320} height={440} unoptimized style={thumbImage}/>
        <figcaption style={caption}>{page.label}</figcaption>
      </button>)}
    </div>

    {openPageIndex !== null && displayImage ? <div style={overlay} onClick={closeViewer}>
      <button type="button" style={close} onClick={(event) => { event.stopPropagation(); closeViewer() }} aria-label="Close page viewer">×</button>

      <div style={zoomControls} onClick={(event) => event.stopPropagation()}>
        <button type="button" style={zoomButton} onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
        <span style={zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button type="button" style={zoomButton} onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
        <button type="button" style={fitButton} onClick={resetZoom}>Fit to screen</button>
      </div>

      {(hasSearchContext ? canPreviousMatch : pages.length > 1) ? <button type="button" style={{...arrow,left:18}} onClick={(event) => { event.stopPropagation(); goPrev() }} aria-label={hasSearchContext ? "Previous OCR search match" : "Previous page"}>‹</button> : null}

      <div style={shell} onClick={(event) => event.stopPropagation()}>
        <div style={label}>
          {displayLabel}
          {hasSearchContext && activePosition && matchTotal ? <span style={{color:'#788087'}}> • Match {activePosition.toLocaleString()} of {matchTotal.toLocaleString()}</span> : !hasSearchContext && openPageIndex !== null ? <span style={{color:'#788087'}}> • {openPageIndex + 1} of {pages.length}</span> : null}
        </div>

        {showSearchPanel && searchQuery ? <div style={searchMatchPanel}>
          <div style={searchMatchTitle}>
            OCR MATCH • “{displayQuery}”{activeHighlightLines.length ? ` • ${activeHighlightLines.length} ON-PAGE HIGHLIGHT${activeHighlightLines.length === 1 ? '' : 'S'}` : ' • ON-PAGE HIGHLIGHT PENDING'}
          </div>
          <div style={searchMatchText}>{highlightedSearchText(activeSnippet, searchQuery)}</div>
        </div> : null}

        <div style={{...viewport,height:showSearchPanel ? 'calc(92vh - 128px)' : 'calc(92vh - 34px)'}}>
          <div style={zoom === 1 ? imageStageFit : {...imageStageZoomed,width:`${Math.round(1200 * zoom)}px`}}>
            <img src={displayImage} alt={displayLabel} style={zoom === 1 ? fullImageFit : fullImageZoomed}/>
            {activeHighlightLines.map((line, index) => <span
              key={`${line.text}-${index}`}
              title={line.text}
              aria-hidden="true"
              style={{
                position:'absolute',
                left:`${line.x * 100}%`,
                top:`${line.y * 100}%`,
                width:`${line.w * 100}%`,
                height:`${Math.max(line.h * 100, .7)}%`,
                background:'rgba(255,220,55,.34)',
                border:'2px solid rgba(255,214,31,.96)',
                boxShadow:'0 0 0 2px rgba(0,0,0,.22),0 0 12px rgba(255,214,31,.35)',
                pointerEvents:'none',
                zIndex:2,
              }}
            />)}
          </div>
        </div>
      </div>

      {(hasSearchContext ? canNextMatch : pages.length > 1) ? <button type="button" style={{...arrow,right:18}} onClick={(event) => { event.stopPropagation(); goNext() }} aria-label={hasSearchContext ? "Next OCR search match" : "Next page"}>›</button> : null}

      {hasSearchContext ? <div style={matchNav} onClick={(event) => event.stopPropagation()}>
        {canPreviousMatch ? <button type="button" style={matchNavButton} onClick={() => void navigateMatch(-1)} disabled={matchNavBusy}>← Previous Match</button> : <span style={matchNavDisabled}>← Previous Match</span>}
        <span style={matchNavCount}>{matchNavError || (matchNavBusy ? 'Loading OCR match…' : activePosition && matchTotal ? `Match ${activePosition.toLocaleString()} of ${matchTotal.toLocaleString()}` : 'OCR Search Match')}</span>
        {canNextMatch ? <button type="button" style={matchNavButton} onClick={() => void navigateMatch(1)} disabled={matchNavBusy}>Next Match →</button> : <span style={matchNavDisabled}>Next Match →</span>}
      </div> : null}
    </div> : null}
  </>
}

const buttonReset: CSSProperties = {cursor:'pointer',fontFamily:'Arial,Helvetica,sans-serif',color:'inherit',textAlign:'inherit'}
const thumbImage: CSSProperties = {width:'100%',height:'auto',display:'block',background:'#e9dfca'}
const caption: CSSProperties = {fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',textAlign:'center',color:'#aeb4b8',padding:'8px 4px 2px',fontWeight:800}
const overlay: CSSProperties = {position:'fixed',inset:0,zIndex:9999,background:'rgba(3,5,7,.96)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}
const shell: CSSProperties = {width:'90vw',height:'92vh',display:'flex',flexDirection:'column',alignItems:'center'}
const viewport: CSSProperties = {width:'100%',overflow:'auto',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'0 8px 72px'}
const label: CSSProperties = {color:'#f4f4f4',fontSize:13,fontWeight:900,marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em',flex:'0 0 auto'}
const imageStageFit: CSSProperties = {position:'relative',display:'inline-block',lineHeight:0,maxWidth:'88vw',maxHeight:'82vh',flex:'0 0 auto'}
const imageStageZoomed: CSSProperties = {position:'relative',display:'inline-block',lineHeight:0,maxWidth:'none',flex:'0 0 auto'}
const fullImageFit: CSSProperties = {display:'block',width:'auto',maxWidth:'88vw',height:'auto',maxHeight:'82vh',objectFit:'contain',background:'#eee4cf',border:'1px solid #4a5157',boxShadow:'0 20px 60px rgba(0,0,0,.7)'}
const fullImageZoomed: CSSProperties = {display:'block',width:'100%',height:'auto',maxWidth:'none',objectFit:'contain',background:'#eee4cf',border:'1px solid #4a5157',boxShadow:'0 20px 60px rgba(0,0,0,.7)'}
const close: CSSProperties = {position:'fixed',top:16,right:22,width:42,height:42,borderRadius:999,border:'1px solid #555e65',background:'#11171b',color:'#fff',fontSize:28,cursor:'pointer',zIndex:2}
const arrow: CSSProperties = {position:'fixed',top:'50%',transform:'translateY(-50%)',width:48,height:74,border:'1px solid #555e65',background:'rgba(17,23,27,.9)',color:'#fff',fontSize:48,lineHeight:'48px',cursor:'pointer',zIndex:2}
const zoomControls: CSSProperties = {position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:3,display:'flex',alignItems:'center',gap:6,padding:'6px 8px',border:'1px solid #555e65',background:'rgba(17,23,27,.96)',borderRadius:8,boxShadow:'0 8px 28px rgba(0,0,0,.45)'}
const zoomButton: CSSProperties = {width:36,height:34,border:'1px solid #646d74',background:'#20272c',color:'#fff',fontSize:22,fontWeight:800,cursor:'pointer',borderRadius:5}
const zoomLabel: CSSProperties = {minWidth:54,textAlign:'center',color:'#fff',fontSize:12,fontWeight:900,fontFamily:'Arial,Helvetica,sans-serif'}
const fitButton: CSSProperties = {height:34,padding:'0 12px',border:'1px solid #646d74',background:'#20272c',color:'#fff',fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',borderRadius:5,fontFamily:'Arial,Helvetica,sans-serif'}
const searchMatchPanel: CSSProperties = {width:'min(1120px,86vw)',marginBottom:8,padding:'9px 12px',border:'1px solid #8d742f',background:'rgba(31,29,20,.97)',borderRadius:6,boxShadow:'0 8px 24px rgba(0,0,0,.35)',flex:'0 0 auto'}
const searchMatchTitle: CSSProperties = {fontSize:10,fontWeight:900,letterSpacing:'.12em',textTransform:'uppercase',color:'#d8b85c',marginBottom:4,fontFamily:'Arial,Helvetica,sans-serif'}
const searchMatchText: CSSProperties = {fontSize:13,lineHeight:1.45,color:'#f2f2ee',fontFamily:'Arial,Helvetica,sans-serif',maxHeight:54,overflow:'hidden'}
const highlightMark: CSSProperties = {background:'#f3d35b',color:'#111',fontWeight:900,padding:'1px 2px',borderRadius:2}
const matchNav: CSSProperties = {position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',zIndex:4,display:'flex',alignItems:'center',gap:10,padding:'8px 10px',border:'1px solid #555e65',background:'rgba(17,23,27,.97)',borderRadius:8,boxShadow:'0 8px 28px rgba(0,0,0,.55)',fontFamily:'Arial,Helvetica,sans-serif'}
const matchNavButton: CSSProperties = {display:'inline-flex',alignItems:'center',height:34,padding:'0 12px',border:'1px solid #9a813f',background:'#2b2518',color:'#f2d57a',textDecoration:'none',fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:'.04em',borderRadius:5,whiteSpace:'nowrap',cursor:'pointer',fontFamily:'Arial,Helvetica,sans-serif'}
const matchNavDisabled: CSSProperties = {...matchNavButton,opacity:.35,cursor:'default'}
const matchNavCount: CSSProperties = {minWidth:150,textAlign:'center',color:'#fff',fontSize:11,fontWeight:900,whiteSpace:'nowrap'}
