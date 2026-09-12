"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

type SearchMatchRow = {
  document_slug: string
  issue_date: string | null
  page_number: number | null
}

type CachedSearchResult = {
  href?: string
  image?: string
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlightedSearchText(text: string, query: string): ReactNode[] {
  const terms = Array.from(
    new Set(
      [query.trim(), ...query.trim().split(/\s+/)]
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function cachedSearchResult(query: string, targetIndex: number): CachedSearchResult | null {
  if (typeof window === "undefined") return null
  const current = new URLSearchParams(window.location.search)
  const currentSort = current.get("sort") || "relevance"
  const currentSource = current.get("source") || "all"
  const currentYear = current.get("year") || ""

  try {
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (!key?.startsWith("umarm-ocr:")) continue
      const raw = window.sessionStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as {
        payload?: { query?: string; results?: CachedSearchResult[] }
      }
      if (parsed.payload?.query !== query || !Array.isArray(parsed.payload.results)) continue

      for (const result of parsed.payload.results) {
        if (!result?.href) continue
        const url = new URL(result.href, window.location.origin)
        if (Number(url.searchParams.get("searchIndex")) !== targetIndex) continue
        if ((url.searchParams.get("sort") || "relevance") !== currentSort) continue
        if ((url.searchParams.get("source") || "all") !== currentSource) continue
        if ((url.searchParams.get("year") || "") !== currentYear) continue
        return result
      }
    }
  } catch {
    return null
  }

  return null
}

export default function NewspaperPageViewer({
  pages,
  initialPageIndex = null,
  searchQuery = null,
  searchSnippet = null,
  highlightLines = [],
  previousMatchHref = null,
  nextMatchHref = null,
  matchPosition = null,
  matchTotal = null,
}: NewspaperPageViewerProps) {
  const router = useRouter()
  const [openPageIndex, setOpenPageIndex] = useState<number | null>(initialPageIndex)
  const [zoom, setZoom] = useState(1)
  const [matchNavBusy, setMatchNavBusy] = useState(false)
  const [matchNavError, setMatchNavError] = useState("")

  const hasSearchContext = Boolean(searchQuery && matchPosition && matchTotal)
  const canPreviousMatch = Boolean(hasSearchContext && matchPosition && matchPosition > 1)
  const canNextMatch = Boolean(hasSearchContext && matchPosition && matchTotal && matchPosition < matchTotal)

  const resetZoom = () => setZoom(1)
  const closeViewer = () => {
    setOpenPageIndex(null)
    resetZoom()
  }
  const zoomIn = () => setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))))
  const zoomOut = () => setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))))

  const buildMatchHref = (row: SearchMatchRow, targetIndex: number) => {
    if (!row.issue_date || !row.document_slug || !searchQuery) return null
    const current = new URLSearchParams(window.location.search)
    const sort = current.get("sort") || "relevance"
    const source = current.get("source") || "all"
    const year = current.get("year")
    const pageSizeValue = Number(current.get("pageSize"))
    const pageSize = [25, 50, 100].includes(pageSizeValue) ? pageSizeValue : 50
    const params = new URLSearchParams()
    if (row.page_number) params.set("sourcePage", String(row.page_number))
    params.set("q", searchQuery)
    params.set("sort", sort)
    params.set("source", source)
    if (year) params.set("year", year)
    params.set("searchIndex", String(targetIndex))
    if (matchTotal) params.set("searchTotal", String(matchTotal))
    params.set("pageSize", String(pageSize))
    return `/media/newspapers/${row.document_slug}/${row.issue_date}?${params.toString()}`
  }

  const resolveMatchHref = async (targetIndex: number) => {
    if (!searchQuery) return null
    const current = new URLSearchParams(window.location.search)
    const requestedSort = (current.get("sort") || "relevance").toLowerCase()
    const sort = ["relevance", "oldest", "newest"].includes(requestedSort) ? requestedSort : "relevance"
    const sourceParam = (current.get("source") || "all").trim().toLowerCase()
    const source = sourceParam === "all" ? null : sourceParam
    const yearValue = Number(current.get("year"))
    const year = Number.isInteger(yearValue) && yearValue >= 1800 && yearValue <= 2200 ? yearValue : null
    const pageSizeValue = Number(current.get("pageSize"))
    const pageSize = [25, 50, 100].includes(pageSizeValue) ? pageSizeValue : 50

    // Prefer a direct one-row RPC so Next Match still works even when the
    // server-rendered adjacent-match lookup had a temporary connection miss.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase.rpc("search_museum_ocr", {
        p_query: searchQuery,
        p_collection: "newspaper",
        p_source: source,
        p_year: year,
        p_sort: sort,
        p_limit: 1,
        p_offset: targetIndex,
      })
      const row = (data?.[0] || null) as SearchMatchRow | null
      if (!error && row) return buildMatchHref(row, targetIndex)
      if (attempt < 2) await wait(180 * (attempt + 1))
    }

    // Final fallback: ask the normal search API for the page containing the
    // desired global match and take the corresponding result from that page.
    try {
      const targetPage = Math.floor(targetIndex / pageSize) + 1
      const resultOffset = targetIndex % pageSize
      const params = new URLSearchParams({
        q: searchQuery,
        collection: "newspaper",
        page: String(targetPage),
        pageSize: String(pageSize),
        sort,
      })
      if (source) params.set("source", source)
      if (year) params.set("year", String(year))

      const response = await fetch(`/api/newspaper-search?${params.toString()}`, { cache: "no-store" })
      if (!response.ok) return null
      const payload = await response.json() as { results?: Array<{ href?: string }> }
      return payload.results?.[resultOffset]?.href || null
    } catch {
      return null
    }
  }

  const navigateMatch = async (direction: -1 | 1) => {
    if (!hasSearchContext || !matchPosition || matchNavBusy || !searchQuery) return
    const targetIndex = matchPosition - 1 + direction
    if (targetIndex < 0 || (matchTotal && targetIndex >= matchTotal)) return

    setMatchNavError("")

    // Search results are cached in sessionStorage. Reuse the exact matching
    // result first so the viewer can navigate immediately without another
    // database lookup. The route and scan are also prefetched below.
    const cached = cachedSearchResult(searchQuery, targetIndex)
    const precomputedHref = cached?.href || (direction < 0 ? previousMatchHref : nextMatchHref)
    if (precomputedHref) {
      setMatchNavBusy(true)
      router.push(precomputedHref, { scroll: false })
      return
    }

    setMatchNavBusy(true)
    const resolvedHref = await resolveMatchHref(targetIndex)
    if (resolvedHref) {
      router.push(resolvedHref, { scroll: false })
      return
    }
    setMatchNavBusy(false)
    setMatchNavError("Could not load that OCR match. Try again.")
  }

  const goPrev = () => {
    // In OCR-search mode, arrows mean previous/next SEARCH MATCH. They must
    // never silently advance to an adjacent page in the current newspaper.
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

  // As soon as an OCR match opens, warm both adjacent Next.js routes and,
  // when the original results page is still in this browser session, preload
  // the exact adjacent scan image. This hides the server/database and image
  // latency while the researcher is reading the current clipping.
  useEffect(() => {
    if (!hasSearchContext || !matchPosition || !searchQuery) return

    const warm = (targetIndex: number, fallbackHref: string | null) => {
      if (targetIndex < 0 || (matchTotal && targetIndex >= matchTotal)) return
      const cached = cachedSearchResult(searchQuery, targetIndex)
      const href = cached?.href || fallbackHref
      if (href) router.prefetch(href)
      if (cached?.image) {
        const preload = document.createElement("img")
        preload.src = cached.image
      }
    }

    if (canPreviousMatch) warm(matchPosition - 2, previousMatchHref)
    if (canNextMatch) warm(matchPosition, nextMatchHref)
  }, [router, hasSearchContext, searchQuery, matchPosition, matchTotal, canPreviousMatch, canNextMatch, previousMatchHref, nextMatchHref])

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
  }, [openPageIndex, hasSearchContext, canPreviousMatch, canNextMatch, previousMatchHref, nextMatchHref, matchPosition, matchTotal, matchNavBusy])

  const isMatchedPage = openPageIndex !== null && initialPageIndex !== null && openPageIndex === initialPageIndex
  const activeHighlightLines = isMatchedPage ? highlightLines : []
  const showSearchPanel = Boolean(isMatchedPage && searchQuery && searchSnippet)

  return <>
    <div className="ma-scan-grid">
      {pages.map((page,index)=><button key={`${page.label}-${page.image}`} type="button" className="ma-scan-frame" style={buttonReset} onClick={()=>{setOpenPageIndex(index);resetZoom()}} aria-label={`Open ${page.label}`}>
        <Image src={page.image} alt={page.label} width={320} height={440} unoptimized style={thumbImage}/>
        <figcaption style={caption}>{page.label}</figcaption>
      </button>)}
    </div>

    {openPageIndex !== null && pages[openPageIndex] ? <div style={overlay} onClick={closeViewer}>
      <button type="button" style={close} onClick={(e)=>{e.stopPropagation();closeViewer()}} aria-label="Close page viewer">×</button>

      <div style={zoomControls} onClick={(e)=>e.stopPropagation()}>
        <button type="button" style={zoomButton} onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
        <span style={zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button type="button" style={zoomButton} onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
        <button type="button" style={fitButton} onClick={resetZoom}>Fit to screen</button>
      </div>

      {(hasSearchContext ? canPreviousMatch : pages.length > 1) ? <button type="button" style={{...arrow,left:18}} onClick={(e)=>{e.stopPropagation();goPrev()}} aria-label={hasSearchContext ? "Previous OCR search match" : "Previous page"}>‹</button> : null}
      <div style={shell} onClick={(e)=>e.stopPropagation()}>
        <div style={label}>{pages[openPageIndex].label} <span style={{color:'#788087'}}>• {openPageIndex+1} of {pages.length}</span></div>
        {showSearchPanel && searchQuery && searchSnippet ? <div style={searchMatchPanel}>
          <div style={searchMatchTitle}>
            OCR MATCH • “{searchQuery}”{activeHighlightLines.length ? ` • ${activeHighlightLines.length} ON-PAGE HIGHLIGHT${activeHighlightLines.length === 1 ? '' : 'S'}` : ''}
          </div>
          <div style={searchMatchText}>{highlightedSearchText(searchSnippet, searchQuery)}</div>
        </div> : null}
        <div style={{...viewport,height:showSearchPanel ? 'calc(92vh - 128px)' : 'calc(92vh - 34px)'}}>
          <div style={zoom === 1 ? imageStageFit : {...imageStageZoomed,width:`${Math.round(1200 * zoom)}px`}}>
            <img
              src={pages[openPageIndex].image}
              alt={pages[openPageIndex].label}
              style={zoom === 1 ? fullImageFit : fullImageZoomed}
            />
            {activeHighlightLines.map((line, index) => (
              <span
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
              />
            ))}
          </div>
        </div>
      </div>
      {(hasSearchContext ? canNextMatch : pages.length > 1) ? <button type="button" style={{...arrow,right:18}} onClick={(e)=>{e.stopPropagation();goNext()}} aria-label={hasSearchContext ? "Next OCR search match" : "Next page"}>›</button> : null}

      {hasSearchContext ? <div style={matchNav} onClick={(e)=>e.stopPropagation()}>
        {canPreviousMatch ? <button type="button" style={matchNavButton} onClick={()=>void navigateMatch(-1)} disabled={matchNavBusy}>← Previous Match</button> : <span style={matchNavDisabled}>← Previous Match</span>}
        <span style={matchNavCount}>{matchNavError || (matchNavBusy ? 'Loading next OCR match…' : matchPosition && matchTotal ? `Match ${matchPosition.toLocaleString()} of ${matchTotal.toLocaleString()}` : 'OCR Search Match')}</span>
        {canNextMatch ? <button type="button" style={matchNavButton} onClick={()=>void navigateMatch(1)} disabled={matchNavBusy}>Next Match →</button> : <span style={matchNavDisabled}>Next Match →</span>}
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
