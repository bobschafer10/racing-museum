import Link from "next/link"
import { getRacePrograms, type RaceProgram } from "@/lib/race-programs"
import { supabase } from "@/lib/supabase"
import ArchiveSearch from "../newspapers/NewspaperSearch"
import "../archive-dark.css"
import "../newspapers/ocr-search.css"

type SearchParams = Promise<{ decade?: string; type?: string }>
type RaceProgramWithCover = RaceProgram & { coverImage: string }
type OcrCoverageRow = { publication_year: number | null }

export default async function RaceProgramsPage({ searchParams }: { searchParams?: SearchParams }) {
  const programs = await getRacePrograms()
  const params = searchParams ? await searchParams : {}
  const activeDecade = params?.decade ?? 'all'
  const activeType = params?.type ?? 'all'
  const getYear=(v:number|string|null)=>typeof v==='number'?v:typeof v==='string'?(Number((v.match(/\d{4}/)||[])[0])||null):null
  const getDecade=(v:number|string|null)=>{const y=getYear(v);return y?`${Math.floor(y/10)*10}s`:null}
  const types=Array.from(new Set(programs.map(p=>p.type).filter(Boolean))) as string[]
  const decades=Array.from(new Set(programs.map(p=>getDecade(p.year)).filter(Boolean))) as string[]
  decades.sort()
  const filtered=programs.filter(p=>(activeDecade==='all'||getDecade(p.year)===activeDecade)&&(activeType==='all'||p.type?.toLowerCase()===activeType.toLowerCase()))
  const covers=programs.filter((p):p is RaceProgramWithCover=>Boolean(p.coverImage))
  const years=programs.map(p=>getYear(p.year)).filter((y):y is number=>y!==null)
  const earliest=years.length?Math.min(...years):null
  const latest=years.length?Math.max(...years):null
  const pageCount=programs.reduce((sum,p)=>sum+(p.images?.length||0),0)
  const hero=covers[covers.length-1]?.coverImage || covers[0]?.coverImage

  const [{ count: searchablePages, data: oldestRows }, { data: newestRows }] = await Promise.all([
    supabase
      .from("archive_ocr_pages")
      .select("publication_year", { count: "exact" })
      .eq("status", "complete")
      .in("document_type", ["program", "yearbook"])
      .not("ocr_text", "is", null)
      .order("publication_year", { ascending: true })
      .limit(1),
    supabase
      .from("archive_ocr_pages")
      .select("publication_year")
      .eq("status", "complete")
      .in("document_type", ["program", "yearbook"])
      .not("ocr_text", "is", null)
      .order("publication_year", { ascending: false })
      .limit(1),
  ])
  const firstSearchableYear = ((oldestRows || []) as OcrCoverageRow[])[0]?.publication_year ?? null
  const lastSearchableYear = ((newestRows || []) as OcrCoverageRow[])[0]?.publication_year ?? null
  const searchableYears = firstSearchableYear && lastSearchableYear
    ? firstSearchableYear === lastSearchableYear ? [firstSearchableYear] : [firstSearchableYear, lastSearchableYear]
    : []
  const searchablePageCount = searchablePages || 0

  return <main className="ma-page">
    <section className="ma-hero" style={hero?{backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.97),rgba(5,8,10,.82) 50%,rgba(5,8,10,.45)),url(${hero})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
      <div className="ma-hero-inner"><div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><span>Race Programs</span></div><div className="ma-hero-grid"><div><div className="ma-eyebrow">Printed Racing Archive</div><h1 className="ma-title">Race Programs & Yearbooks</h1><div className="ma-subtitle">Race Night Preserved on Paper</div><p className="ma-lede">Explore digitized race-night programs, souvenir books, yearbooks, and special-event publications from tracks and series across the Upper Midwest.</p><div className="ma-actions"><Link href="/media" className="ma-button">Back to Media Archive</Link><Link href="/media/newspapers" className="ma-button-ghost">Racing Newspapers</Link></div></div><div className="ma-hero-media">{covers.slice(-2).map(p=><img key={p.slug} src={p.coverImage} alt={p.title} className="ma-cover" />)}</div></div><div className="ma-stats"><div className="ma-stat"><strong>{programs.length}</strong><span>Publications</span></div><div className="ma-stat"><strong>{pageCount.toLocaleString()}</strong><span>Scanned Pages</span></div><div className="ma-stat"><strong>{earliest??'—'}</strong><span>Earliest Year</span></div><div className="ma-stat"><strong>{latest??'—'}</strong><span>Latest Year</span></div><div className="ma-stat"><strong>{types.length}</strong><span>Archive Types</span></div></div></div>
    </section>

    {searchablePageCount > 0 ? <section className="ma-section" id="printed-archive-search"><ArchiveSearch collection="print" searchablePages={searchablePageCount} searchableYears={searchableYears} /></section> : null}

    <section className="ma-section"><form action="/media/race-programs" className="ma-filter" style={{gridTemplateColumns:'1fr 1fr auto'}}><select name="decade" defaultValue={activeDecade}><option value="all">All Decades</option>{decades.map(d=><option key={d} value={d}>{d}</option>)}</select><select name="type" defaultValue={activeType}><option value="all">All Publication Types</option>{types.map(t=><option key={t} value={t}>{t}</option>)}</select><button type="submit">Apply Filters</button></form></section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Museum Highlights</div><h2 className="ma-h2">Featured Publications</h2></div><div className="ma-note">A rotating selection of preserved covers from the printed archive.</div></div><div className="ma-grid-4">{covers.slice(-8).reverse().map(p=><Link key={p.slug} href={`/media/race-programs/${p.slug}`} className="ma-card"><div className="ma-card-media contain"><img src={p.coverImage} alt={p.title}/></div><div className="ma-card-body"><div className="ma-card-label">{p.year||'Unknown year'} • {p.type||'Publication'}</div><div className="ma-card-title">{p.title}</div><div className="ma-card-meta">{p.track||p.series||'Museum printed archive'}</div><span className="ma-card-link">Open publication →</span></div></Link>)}</div></section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Complete Printed Archive</div><h2 className="ma-h2">All Publications</h2></div><div className="ma-note">{filtered.length} of {programs.length} publications shown.</div></div><div className="ma-grid-4">{filtered.map(p=><Link key={p.slug} href={`/media/race-programs/${p.slug}`} className="ma-card"><div className="ma-card-media contain">{p.coverImage?<img src={p.coverImage} alt={p.title}/>:<div className="ma-muted">Cover not available</div>}</div><div className="ma-card-body"><div className="ma-card-label">{p.year||'Unknown year'} • {p.type||'Publication'}</div><div className="ma-card-title">{p.title}</div><div className="ma-card-meta">{p.track||p.series||'Upper Midwest racing archive'} • {p.images.length} scanned pages</div><span className="ma-card-link">Open publication →</span></div></Link>)}</div></section>

    <section className="ma-section"><div className="ma-footer-links"><Link href="/media/newspapers" className="ma-footer-link">Racing Newspapers<span>Browse newspaper archive →</span></Link><Link href="/photographers" className="ma-footer-link">Photographers<span>Explore image-makers →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}
