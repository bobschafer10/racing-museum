import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../results-archive.css'

function formatDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}

export default async function ResultsDatePage({params}:{params:Promise<{date:string}>}){
 const {date}=await params
 const [raceRes,prevRes,nextRes]=await Promise.all([
  supabase.from('global_results_view').select('*').eq('race_date',date).order('track_name',{ascending:true}).order('class_name',{ascending:true}),
  supabase.from('global_results_view').select('race_date').lt('race_date',date).order('race_date',{ascending:false}).limit(1),
  supabase.from('global_results_view').select('race_date').gt('race_date',date).order('race_date',{ascending:true}).limit(1),
 ])
 const races=raceRes.data||[]
 if(raceRes.error||!races.length)notFound()
 const tracks=new Map<string,any[]>()
 for(const r of races){const key=r.track_name||'Unknown Track';if(!tracks.has(key))tracks.set(key,[]);tracks.get(key)!.push(r)}
 const trackEntries=Array.from(tracks.entries()).sort((a,b)=>a[0].localeCompare(b[0]))
 const prev=prevRes.data?.[0]?.race_date||null;const next=nextRes.data?.[0]?.race_date||null
 return <main className="ra-page">
  <section className="ra-hero"><div className="ra-hero-inner">
   <div className="ra-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/results">Results</Link><span>›</span><span>{formatDate(date)}</span></div>
   <div className="ra-eyebrow" style={{marginTop:24}}>Race Date Archive</div><h1 className="ra-title compact">{formatDate(date)}</h1><div className="ra-subtitle">Feature Winners Across the Region</div>
   <p className="ra-lede">Every recorded feature winner from this race date, grouped by track and division with direct connections back to the museum's track and driver archives.</p>
   <div className="ra-actions"><Link href="/results" className="ra-button">Results Home</Link><Link href={`/results/year/${date.slice(0,4)}`} className="ra-button-ghost">Open {date.slice(0,4)} Season</Link></div>
   <div className="ra-year-stats"><div className="ra-stat"><strong>{trackEntries.length}</strong><span>Tracks Racing</span></div><div className="ra-stat"><strong>{races.length}</strong><span>Feature Winners</span></div><div className="ra-stat"><strong>{new Set(races.map((r:any)=>r.class_name)).size}</strong><span>Divisions</span></div><div className="ra-stat"><strong>{new Set(races.map((r:any)=>r.driver_slug||r.driver_name)).size}</strong><span>Winning Drivers</span></div></div>
  </div></section>

  <section className="ra-section"><div className="ra-section-head"><div><div className="ra-kicker">Complete Race-Date Record</div><h2 className="ra-h2">Recorded Feature Winners</h2></div><div className="ra-note">Open any track or driver to continue deeper into the museum archive.</div></div>
   <div className="ra-track-grid">{trackEntries.map(([track,rows])=>{const first=rows[0];return <article className="ra-track-card" key={track}><div className="ra-track-card-head">{first.track_slug?<Link href={`/tracks/${first.track_slug}`}>{track}</Link>:track}<span>{rows.length} recorded feature winner{rows.length===1?'':'s'}</span></div><div className="ra-track-winners">{[...rows].sort((a,b)=>String(a.class_name||'').localeCompare(String(b.class_name||''))).map((r:any,i:number)=><div className="ra-track-winner" key={`${r.class_name}-${r.driver_name}-${i}`}><div className="class">{r.class_name||'Unknown Division'}</div><div className="winner">{r.driver_slug?<Link href={`/drivers/${r.driver_slug}`}>{r.driver_name}</Link>:r.driver_name||'Unknown Driver'}</div></div>)}</div></article>})}</div>
   <div className="ra-nav-row"><div>{prev?<Link href={`/results/${prev}`}>← {formatDate(prev)}</Link>:<span>← Earlier date</span>}</div><div>{next?<Link href={`/results/${next}`}>{formatDate(next)} →</Link>:<span>Later date →</span>}</div></div>
  </section>

  <section className="ra-section"><div className="ra-footer-links"><Link href="/results" className="ra-footer-link">Results Archive<span>Recent results →</span></Link><Link href={`/results/year/${date.slice(0,4)}`} className="ra-footer-link">{date.slice(0,4)} Season<span>Full season archive →</span></Link><Link href="/tracks" className="ra-footer-link">Track Archive<span>Browse all tracks →</span></Link></div></section>
 </main>
}