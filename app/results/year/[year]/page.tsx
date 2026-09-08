import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../../results-archive.css'

async function fetchAll(startDate:string,endDate:string){const size=1000;let from=0;const rows:any[]=[];while(true){const {data,error}=await supabase.from('results_year_top3_view').select('*').gte('race_date',startDate).lt('race_date',endDate).in('finishing_position',[1,2,3]).order('race_date',{ascending:true}).order('track_name',{ascending:true}).order('class_name',{ascending:true}).order('finishing_position',{ascending:true}).range(from,from+size-1);if(error||!data?.length)break;rows.push(...data);if(data.length<size)break;from+=size}return rows}
function fmtDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}

export default async function ResultsYearDetailPage({params}:{params:Promise<{year:string}>}){
 const {year}=await params
 if(!/^\d{4}$/.test(year))notFound()
 const start=`${year}-01-01`,end=`${Number(year)+1}-01-01`
 const [results,yearsRes]=await Promise.all([fetchAll(start,end),supabase.from('results_years').select('year')])
 if(!results.length)notFound()
 const dates=new Map<string,Map<string,any>>()
 for(const r of results){if(!dates.has(r.race_date))dates.set(r.race_date,new Map());const races=dates.get(r.race_date)!;const key=r.race_id?String(r.race_id):`${r.track_slug||r.track_name}-${r.class_name}`;if(!races.has(key))races.set(key,{track_name:r.track_name,track_slug:r.track_slug,class_name:r.class_name,finishers:[]});races.get(key).finishers.push(r)}
 const groups=Array.from(dates.entries()).map(([date,races])=>({date,races:Array.from(races.values())})).sort((a,b)=>a.date.localeCompare(b.date))
 const tracks=new Set(results.map((r:any)=>r.track_slug||r.track_name));const drivers=new Set(results.map((r:any)=>r.driver_slug||r.driver_name));const raceCount=groups.reduce((n,g)=>n+g.races.length,0)
 const years=(yearsRes.data||[]).map((r:any)=>Number(r.year)).filter(Number.isFinite).sort((a:number,b:number)=>a-b);const idx=years.indexOf(Number(year));const prev=idx>0?years[idx-1]:null;const next=idx>=0&&idx<years.length-1?years[idx+1]:null
 return <main className="ra-page">
  <section className="ra-hero"><div className="ra-hero-inner">
   <div className="ra-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/results">Results</Link><span>›</span><Link href="/results/year">By Year</Link><span>›</span><span>{year}</span></div>
   <div className="ra-eyebrow" style={{marginTop:24}}>Season Results Archive</div><h1 className="ra-title">{year}</h1><div className="ra-subtitle">Race Dates & Top-Three Results</div>
   <p className="ra-lede">Browse the recorded {year} season race by race. Each event connects back to its track archive and the drivers preserved throughout the museum.</p>
   <div className="ra-actions"><Link href="/results/year" className="ra-button">All Seasons</Link><Link href="/results" className="ra-button-ghost">Results Home</Link></div>
   <div className="ra-year-stats"><div className="ra-stat"><strong>{groups.length}</strong><span>Race Dates</span></div><div className="ra-stat"><strong>{tracks.size}</strong><span>Tracks</span></div><div className="ra-stat"><strong>{raceCount.toLocaleString()}</strong><span>Feature Results</span></div><div className="ra-stat"><strong>{drivers.size.toLocaleString()}</strong><span>Top-Three Drivers</span></div></div>
  </div></section>

  <section className="ra-section"><div className="ra-section-head"><div><div className="ra-kicker">Complete Season Record</div><h2 className="ra-h2">{year} Race Dates</h2></div><div className="ra-note">The table shows the top three recorded finishers for each feature result currently indexed in the archive.</div></div>
   <div className="ra-year-results">{groups.map(group=><article className="ra-race-date" key={group.date}><div className="ra-race-date-head"><Link href={`/results/${group.date}`}>{fmtDate(group.date)}</Link><span>{group.races.length} feature results</span></div><table className="ra-race-table"><thead><tr><th>Track</th><th>Division</th><th>1st</th><th>2nd</th><th>3rd</th></tr></thead><tbody>{group.races.map((race:any,i:number)=>{const finish=[1,2,3].map(pos=>race.finishers.find((f:any)=>Number(f.finishing_position)===pos));return <tr key={`${race.track_slug}-${race.class_name}-${i}`}><td>{race.track_slug?<Link href={`/tracks/${race.track_slug}`}>{race.track_name}</Link>:race.track_name}</td><td>{race.class_name}</td>{finish.map((f:any,j:number)=><td key={j} className={j===0?'ra-pos':undefined}>{f?(f.driver_slug?<Link href={`/drivers/${f.driver_slug}`}>{f.driver_name}</Link>:f.driver_name):'—'}</td>)}</tr>})}</tbody></table></article>)}</div>
   <div className="ra-nav-row"><div>{prev?<Link href={`/results/year/${prev}`}>← {prev}</Link>:<span>← Earlier season</span>}</div><div>{next?<Link href={`/results/year/${next}`}>{next} →</Link>:<span>Later season →</span>}</div></div>
  </section>

  <section className="ra-section"><div className="ra-footer-links"><Link href="/results/year" className="ra-footer-link">Season Archive<span>Browse all years →</span></Link><Link href="/tracks" className="ra-footer-link">Track Archive<span>Explore venues →</span></Link><Link href="/drivers" className="ra-footer-link">Driver Archive<span>Explore careers →</span></Link></div></section>
 </main>
}