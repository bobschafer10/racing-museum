"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { CSSProperties } from "react"

type NewspaperPage = { label: string; image: string }

export default function NewspaperPageViewer({ pages }: { pages: NewspaperPage[] }) {
  const [openPageIndex, setOpenPageIndex] = useState<number | null>(null)
  const closeViewer = () => setOpenPageIndex(null)
  const goPrev = () => { if (openPageIndex !== null) setOpenPageIndex(openPageIndex === 0 ? pages.length - 1 : openPageIndex - 1) }
  const goNext = () => { if (openPageIndex !== null) setOpenPageIndex(openPageIndex === pages.length - 1 ? 0 : openPageIndex + 1) }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openPageIndex === null) return
      if (event.key === "Escape") closeViewer()
      if (event.key === "ArrowLeft") goPrev()
      if (event.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openPageIndex])

  return <>
    <div className="ma-scan-grid">
      {pages.map((page,index)=><button key={`${page.label}-${page.image}`} type="button" className="ma-scan-frame" style={buttonReset} onClick={()=>setOpenPageIndex(index)} aria-label={`Open ${page.label}`}>
        <Image src={page.image} alt={page.label} width={320} height={440} unoptimized style={thumbImage}/>
        <figcaption style={caption}>{page.label}</figcaption>
      </button>)}
    </div>

    {openPageIndex !== null && <div style={overlay} onClick={closeViewer}>
      <button type="button" style={close} onClick={(e)=>{e.stopPropagation();closeViewer()}} aria-label="Close page viewer">×</button>
      {pages.length > 1 ? <button type="button" style={{...arrow,left:18}} onClick={(e)=>{e.stopPropagation();goPrev()}} aria-label="Previous page">‹</button> : null}
      <div style={shell} onClick={(e)=>e.stopPropagation()}>
        <div style={label}>{pages[openPageIndex].label} <span style={{color:'#788087'}}>• {openPageIndex+1} of {pages.length}</span></div>
        <Image src={pages[openPageIndex].image} alt={pages[openPageIndex].label} width={1200} height={1650} priority unoptimized style={fullImage}/>
      </div>
      {pages.length > 1 ? <button type="button" style={{...arrow,right:18}} onClick={(e)=>{e.stopPropagation();goNext()}} aria-label="Next page">›</button> : null}
    </div>}
  </>
}

const buttonReset: CSSProperties = {cursor:'pointer',fontFamily:'Arial,Helvetica,sans-serif',color:'inherit',textAlign:'inherit'}
const thumbImage: CSSProperties = {width:'100%',height:'auto',display:'block',background:'#e9dfca'}
const caption: CSSProperties = {fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',textAlign:'center',color:'#aeb4b8',padding:'8px 4px 2px',fontWeight:800}
const overlay: CSSProperties = {position:'fixed',inset:0,zIndex:9999,background:'rgba(3,5,7,.96)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}
const shell: CSSProperties = {maxWidth:'88vw',maxHeight:'94vh',display:'flex',flexDirection:'column',alignItems:'center'}
const label: CSSProperties = {color:'#f4f4f4',fontSize:13,fontWeight:900,marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em'}
const fullImage: CSSProperties = {width:'auto',maxWidth:'88vw',height:'auto',maxHeight:'88vh',objectFit:'contain',background:'#eee4cf',border:'1px solid #4a5157',boxShadow:'0 20px 60px rgba(0,0,0,.7)'}
const close: CSSProperties = {position:'fixed',top:16,right:22,width:42,height:42,borderRadius:999,border:'1px solid #555e65',background:'#11171b',color:'#fff',fontSize:28,cursor:'pointer'}
const arrow: CSSProperties = {position:'fixed',top:'50%',transform:'translateY(-50%)',width:48,height:74,border:'1px solid #555e65',background:'rgba(17,23,27,.9)',color:'#fff',fontSize:48,lineHeight:'48px',cursor:'pointer'}