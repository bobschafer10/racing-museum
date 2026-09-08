import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import './results-archive.css'

export const revalidate = 300

function formatDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
function fmt(value:number|null|undefined){return value==null?'—':value.toLocaleString()}

export default async function ResultsPage(){
  const [recentRes,resultsCount,eventsCount,tracksCount,driversCount,yearsRes]=await Promise.all([
    supabase.from('global_results_view').select('*').order('race_date',{ascending:false}).order('track_name',{ascending:true}).limit(140),
    supabase.from('Results').select('*',{count:'exact',head:true}),
    supabase.from('Events').select('*',{count:'exact',head:true}),
    supabase.from('Tracks').select('*',{count:'exact',head:true}),
    supabase.from('Drivers').select('*',{count:'exact',head:true}),
    supabase.from('results_years').select('year'),
  ])

  const grouped=new Map<string,any[]>()
  for(const row of recentRes.data||[]){if(!grouped.has(row.race_date))grouped.set(row.race_date,[]);grouped.get(row.race_date)!.push(row)}
  const recentDates=Array.from(grouped.entries()).slice(0,4)
  const years=(yearsRes.data||[]).map((r:any)=>Number(r.year)).filter(Number.isFinite).sort((a:number,b:number)=>a-b)
  const firstYear=years[0]||1903
  const latestYear=years[years.length-1]||2026
  const latestDate=recentDates[0]?.[0]

  return <main className="ra-page">
    <section className="ra-hero"><div className="ra-hero-inner">
      <div className="ra-breadcrumbs"><Link href="/">Home</Link><span>›</span><span>Results</span></div>
      <div className="ra-eyebrow" style={{marginTop:24}}>Upper Midwest Results Archive</div>
      <h1 className="ra-title">RESULTS</h1>
      <div className="ra-subtitle">Every Race Leaves a Record</div>
      <p className="ra-lede">Explore more than a century of race nights, feature winners, finishing orders, tracks, and drivers preserved throughout the museum. Start with the latest results or move deep into the historical record.</p>
      <div className="ra-actions"><Link href="/results/year" className="ra-button">Browse by Year</Link><Link href="/tracks" className="ra-button-ghost">Browse by Track</Link></div>
      <div className="ra-stats">
        <div className="ra-stat"><strong>{fmt(resultsCount.count)}</strong><span>Recorded Results</span></div>
        <div className="ra-stat"><strong>{fmt(eventsCount.count)}</strong><span>Race Events</span></div>
        <div className="ra-stat"><strong>{fmt(tracksCount.count)}</strong><span>Tracks Archived</span></div>
        <div className="ra-stat"><strong>{fmt(driversCount.count)}</strong><span>Drivers Indexed</span></div>
        <div className="ra-stat"><strong>{firstYear}–{latestYear}</strong><span>Years of Racing</span></div>
      </div>
    </div></section>

    <section className="ra-section">
      <div className="ra-section-head"><div><div className="ra-kicker">Explore the Archive</div><h2 className="ra-h2">Find the Race Night</h2></div><div className="ra-note">Use the museum's track and year archives to move from a single race result into the broader history around it.</div></div>
      <div className="ra-path-grid">
        <Link href="/tracks" className="ra-path-card"><div className="num">01 • TRACK ARCHIVE</div><h3>Browse by Track</h3><p>Open a track profile and explore its complete recorded results history, champions, feature winners, and photos.</p><span className="ra-link">Explore tracks →</span></Link>
        <Link href="/results/year" className="ra-path-card"><div className="num">02 • SEASON ARCHIVE</div><h3>Browse by Year</h3><p>Move season by season through the archive, from the earliest surviving records through the current racing year.</p><span className="ra-link">Explore years →</span></Link>
        <a href="#recent-results" className="ra-path-card"><div className="num">03 • LATEST ACTIVITY</div><h3>Recent Race Nights</h3><p>Jump directly into the newest feature winners currently recorded across the museum.</p><span className="ra-link">View latest results →</span></a>
      </div>
    </section>

    <section className="ra-section">
      <div className="ra-section-head"><div><div className="ra-kicker">Archive Snapshot</div><h2 className="ra-h2">Results History at a Glance</h2></div></div>
      <div className="ra-highlight-grid">
        <div className="ra-highlight-card"><strong>{years.length}</strong><span>Seasons currently represented in the year-by-year archive.</span></div>
        <div className="ra-highlight-card"><strong>{latestDate?formatDate(latestDate):'—'}</strong><span>Latest race date currently surfaced in the feature-winner archive.</span></div>
        <div className="ra-highlight-card"><strong>{firstYear}</strong><span>Earliest season currently represented in the museum results archive.</span></div>
      </div>
    </section>

    <section className="ra-section" id="recent-results">
      <div className="ra-section-head"><div><div className="ra-kicker">Latest Archive Activity</div><h2 className="ra-h2">Recent Results Across All Tracks</h2></div><div className="ra-note">A compact view of the newest race dates. Open any date for the complete list of recorded feature winners.</div></div>
      {recentDates.length?<div className="ra-recent-grid">{recentDates.map(([date,rows])=><article className="ra-date-card" key={date}>
        <div className="ra-date-head"><Link href={`/results/${date}`}>{formatDate(date)}</Link><span>{rows.length} feature winners</span></div>
        <div className="ra-winner-list">{rows.slice(0,12).map((r:any,i:number)=><div className="ra-winner-row" key={`${r.track_slug}-${r.class_name}-${i}`}><div className="ra-winner-track">{r.track_slug?<Link href={`/tracks/${r.track_slug}`}>{r.track_name}</Link>:r.track_name}</div><div className="ra-winner-class">{r.class_name}</div><div className="ra-winner-driver">{r.driver_slug?<Link href={`/drivers/${r.driver_slug}`}>{r.driver_name}</Link>:r.driver_name}</div></div>)}</div>
        <div className="ra-card-footer"><Link href={`/results/${date}`}>View complete date →</Link></div>
      </article>)}</div>:<div className="ra-empty">No recent results are available.</div>}
    </section>

    <section className="ra-section"><div className="ra-footer-links"><Link href="/tracks" className="ra-footer-link">Track Archive<span>Browse tracks →</span></Link><Link href="/results/year" className="ra-footer-link">Season Archive<span>Browse years →</span></Link><Link href="/research" className="ra-footer-link">Research Center<span>Open research tools →</span></Link></div></section>
  </main>
}