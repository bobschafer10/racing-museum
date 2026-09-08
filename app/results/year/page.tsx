import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import '../results-archive.css'

export const revalidate=300

const DESCRIPTIONS:Record<string,string>={
'1900s':'The earliest surviving records from Midwestern auto racing.','1910s':'County fairgrounds, dirt tracks, and early organized racing.','1920s':'Expanding competition throughout the Midwest racing circuit.','1930s':'Racing through the Depression-era years.','1940s':'Postwar racing returns across the region.','1950s':'The postwar boom in short-track racing.','1960s':'Weekly racing and regional touring stars accelerate.','1970s':'A defining era of Upper Midwest short-track competition.','1980s':'Touring series, super late models, and growing media coverage.','1990s':'Regional series growth and modern short-track competition.','2000s':'The modern archive era begins to take shape.','2010s':'Contemporary racing preserved season by season.','2020s':'Current-day racing history and ongoing museum documentation.'}

export default async function ResultsYearPage(){
 const {data}=await supabase.from('results_years').select('year')
 const years=(data||[]).map((r:any)=>Number(r.year)).filter(Number.isFinite).sort((a:number,b:number)=>a-b)
 const groups=years.reduce((acc:Record<string,number[]>,year:number)=>{const d=`${Math.floor(year/10)*10}s`;if(!acc[d])acc[d]=[];acc[d].push(year);return acc},{})
 const decades=Object.keys(groups).sort((a,b)=>Number(a.slice(0,4))-Number(b.slice(0,4)))
 const first=years[0]||'—';const latest=years[years.length-1]||'—'
 return <main className="ra-page">
  <section className="ra-hero"><div className="ra-hero-inner">
   <div className="ra-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/results">Results</Link><span>›</span><span>Browse by Year</span></div>
   <div className="ra-eyebrow" style={{marginTop:24}}>Season Archive</div><h1 className="ra-title compact">BROWSE BY YEAR</h1><div className="ra-subtitle">More Than a Century of Race Nights</div>
   <p className="ra-lede">Move season by season through the museum's recorded results history. Each year opens into race dates, tracks, classes, winners, and top-three finishes preserved across the Upper Midwest.</p>
   <div className="ra-actions"><Link href="/results" className="ra-button">Results Home</Link><Link href="/tracks" className="ra-button-ghost">Browse Tracks</Link></div>
   <div className="ra-stats"><div className="ra-stat"><strong>{years.length}</strong><span>Seasons Available</span></div><div className="ra-stat"><strong>{first}</strong><span>Earliest Season</span></div><div className="ra-stat"><strong>{latest}</strong><span>Latest Season</span></div><div className="ra-stat"><strong>{decades.length}</strong><span>Decades Represented</span></div><div className="ra-stat"><strong>{first}–{latest}</strong><span>Archive Span</span></div></div>
  </div></section>

  <section className="ra-section"><div className="ra-section-head"><div><div className="ra-kicker">Historical Timeline</div><h2 className="ra-h2">Choose a Racing Season</h2></div><div className="ra-note">Years are grouped by decade so researchers can move quickly through the historical record.</div></div>
   {decades.length?<div className="ra-decade-grid">{decades.map(decade=><article className="ra-decade-card" data-decade={decade.slice(0,4)} key={decade}><h3>{decade}</h3><p>{DESCRIPTIONS[decade]||'Historic race results from the museum archive.'}</p><div className="ra-year-chips">{groups[decade].map(year=><Link key={year} href={`/results/year/${year}`} className="ra-year-chip">{year}</Link>)}</div></article>)}</div>:<div className="ra-empty">No result years are currently available.</div>}
  </section>

  <section className="ra-section"><div className="ra-footer-links"><Link href="/results" className="ra-footer-link">Results Home<span>Recent race nights →</span></Link><Link href="/tracks" className="ra-footer-link">Track Archive<span>Browse by venue →</span></Link><Link href="/drivers" className="ra-footer-link">Driver Archive<span>Browse careers →</span></Link></div></section>
 </main>
}