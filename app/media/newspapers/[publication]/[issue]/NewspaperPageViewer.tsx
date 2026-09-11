"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { CSSProperties } from "react"

type NewspaperPage = { label: string; image: string }

type NewspaperPageViewerProps = {
  pages: NewspaperPage[]
  initialPageIndex?: number | null
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

export default function NewspaperPageViewer({ pages, initialPageIndex = null }: NewspaperPageViewerProps) {
  const [openPageIndex, setOpenPageIndex] = useState<number | null>(initialPageIndex)
  const [zoom, setZoom] = useState(1)

  const resetZoom = () => setZoom(1)
  const closeViewer = () => {
    setOpenPageIndex(null)
    resetZoom()
  }
  const zoomIn = () => setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))))
  const zoomOut = () => setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))))
  const goPrev = () => {
    if (openPageIndex !== null) {
      setOpenPageIndex(openPageIndex === 0 ? pages.length - 1 : openPageIndex - 1)
      resetZoom()
    }
  }
  const goNext = () => {
    if (openPageIndex !== null) {
      setOpenPageIndex(openPageIndex === pages.length - 1 ? 0 : openPageIndex + 1)
      resetZoom()
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openPageIndex === null) return
      if (event.key === "Escape") closeViewer()
      if (event.key === "ArrowLeft") goPrev()
      if (event.key === "ArrowRight") goNext()
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
  }, [openPageIndex])

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

      {pages.length > 1 ? <button type="button" style={{...arrow,left:18}} onClick={(e)=>{e.stopPropagation();goPrev()}} aria-label="Previous page">‹</button> : null}
      <div style={shell} onClick={(e)=>e.stopPropagation()}>
        <div style={label}>{pages[openPageIndex].label} <span style={{color:'#788087'}}>• {openPageIndex+1} of {pages.length}</span></div>
        <div style={viewport}>
          <Image
            src={pages[openPageIndex].image}
            alt={pages[openPageIndex].label}
            width={1200}
            height={1650}
            priority
            unoptimized
            style={zoom === 1 ? fullImageFit : {...fullImageZoomed,width:`${Math.round(1200 * zoom)}px`}}
          />
        </div>
      </div>
      {pages.length > 1 ? <button type="button" style={{...arrow,right:18}} onClick={(e)=>{e.stopPropagation();goNext()}} aria-label="Next page">›</button> : null}
    </div> : null}
  </>
}

const buttonReset: CSSProperties = {cursor:'pointer',fontFamily:'Arial,Helvetica,sans-serif',color:'inherit',textAlign:'inherit'}
const thumbImage: CSSProperties = {width:'100%',height:'auto',display:'block',background:'#e9dfca'}
const caption: CSSProperties = {fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',textAlign:'center',color:'#aeb4b8',padding:'8px 4px 2px',fontWeight:800}
const overlay: CSSProperties = {position:'fixed',inset:0,zIndex:9999,background:'rgba(3,5,7,.96)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}
const shell: CSSProperties = {width:'90vw',height:'92vh',display:'flex',flexDirection:'column',alignItems:'center'}
const viewport: CSSProperties = {width:'100%',height:'calc(92vh - 34px)',overflow:'auto',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'0 8px 8px'}
const label: CSSProperties = {color:'#f4f4f4',fontSize:13,fontWeight:900,marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em',flex:'0 0 auto'}
const fullImageFit: CSSProperties = {width:'auto',maxWidth:'88vw',height:'auto',maxHeight:'86vh',objectFit:'contain',background:'#eee4cf',border:'1px solid #4a5157',boxShadow:'0 20px 60px rgba(0,0,0,.7)',flex:'0 0 auto'}
const fullImageZoomed: CSSProperties = {maxWidth:'none',height:'auto',objectFit:'contain',background:'#eee4cf',border:'1px solid #4a5157',boxShadow:'0 20px 60px rgba(0,0,0,.7)',flex:'0 0 auto'}
const close: CSSProperties = {position:'fixed',top:16,right:22,width:42,height:42,borderRadius:999,border:'1px solid #555e65',background:'#11171b',color:'#fff',fontSize:28,cursor:'pointer',zIndex:2}
const arrow: CSSProperties = {position:'fixed',top:'50%',transform:'translateY(-50%)',width:48,height:74,border:'1px solid #555e65',background:'rgba(17,23,27,.9)',color:'#fff',fontSize:48,lineHeight:'48px',cursor:'pointer',zIndex:2}
const zoomControls: CSSProperties = {position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:3,display:'flex',alignItems:'center',gap:6,padding:'6px 8px',border:'1px solid #555e65',background:'rgba(17,23,27,.96)',borderRadius:8,boxShadow:'0 8px 28px rgba(0,0,0,.45)'}
const zoomButton: CSSProperties = {width:36,height:34,border:'1px solid #646d74',background:'#20272c',color:'#fff',fontSize:22,fontWeight:800,cursor:'pointer',borderRadius:5}
const zoomLabel: CSSProperties = {minWidth:54,textAlign:'center',color:'#fff',fontSize:12,fontWeight:900,fontFamily:'Arial,Helvetica,sans-serif'}
const fitButton: CSSProperties = {height:34,padding:'0 12px',border:'1px solid #646d74',background:'#20272c',color:'#fff',fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:'.04em',cursor:'pointer',borderRadius:5,fontFamily:'Arial,Helvetica,sans-serif'}
