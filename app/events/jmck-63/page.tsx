import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate=300
const SERIES_ID=166

type ResultRow={id:number;finishing_position:number|null;driver_name:string;car_number:string|null;starting_position:string|null;laps:string|null;status:string|null;result_section:string|null}
type EventRow={id:number;race_date:string|null;winner_name:string|null;source_url:string|null;SeriesEventResults:ResultRow[]}
function formatDate(value:string|null){if(!value)return'Date not listed';const [y,m,d]=value.split('-');return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
function photoUrl(fileName?:string|null,year?:string|null){const base=process.env.NEXT_PUBLIC_SUPABASE_URL;return fileName&&base?`${base}/storage/v1/object/public/media/photos/master/lacrosse-fairgrounds-wi/${year||'unknown-year'}/${fileName}`:''}

export default async function Jmck63Page(){
 const [{data,error},{data:photos}]=await Promise.all([
  supabase.from('SeriesEvents').select(`id,race_date,winner_name,source_url,SeriesEventResults(id,finishing_position,driver_name,car_number,starting_position,laps,status,result_section)`).eq('series_id',SERIES_ID).order('race_date',{ascending:false}),
  supabase.from('photos').select('file_name,year').eq('track_slug','lacrosse-fairgrounds-wi').neq('credit_type','unknown').order('year',{ascending:false}).limit(8),
 ])
 const events=(data??[]) as EventRow[];const resultCount=events.reduce((sum,event)=>sum+event.SeriesEventResults.length,0);const heroSrc=photoUrl(photos?.[0]?.file_name,photos?.[0]?.year)
 return <main className={styles.page}>
  <section className={styles.hero}>{heroSrc?<img src={heroSrc} alt="JMcK 63 at LaCrosse" className={styles.heroImage}/>:null}<div className={styles.heroShade}/><div className={styles.heroInner}>
   <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>JMcK 63</span></div>
   <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div><h1 className={styles.title}>JMcK 63</h1><p className={styles.tagline}>Three Segments. Sixty-Three Laps. One Memorial.</p>
   <p className={styles.intro}>Contested from 2010 through 2018 during Oktoberfest Race Weekend, the John McKarns memorial invitational used three 21-lap segments with the overall winner determined by cumulative finishing points.</p>
   <div className={styles.heroActions}><Link href="/tracks/lacrosse-fairgrounds-wi" className={styles.button}>Open LaCrosse Archive</Link><Link href="#results" className={styles.buttonGhost}>View Editions</Link></div>
   <div className={styles.stats}><Stat label="Years" value="2010–2018"/><Stat label="Editions" value={String(events.length||9)}/><Stat label="Result Rows" value={resultCount.toLocaleString('en-US')}/><Stat label="Format" value="3 × 21 Laps"/></div>
  </div></section>
  <div className={styles.content}>
   <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Archive Notes</div><strong>Named for John McKarns and his familiar abbreviated signature.</strong><p>The invitational brought together weekly Late Model winners, Big 8 contenders, former Oktoberfest champions and other regional standouts. Winner chronology is verified for all nine editions. Full finishing orders appear only where reliable sources survive.</p></div></section>
   <section className={styles.section} id="results"><div className={styles.kicker}>Complete Event History</div><div className={styles.sectionHead}><h2>Year-by-Year Results</h2><div className={styles.sectionNote}>Missing fields remain blank rather than reconstructed.</div></div>{error?<div className={styles.empty}>Unable to load the live JMcK 63 archive.</div>:<div className={styles.eventStack}>{events.map(event=>{const rows=[...event.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999));const year=event.race_date?.slice(0,4)??'Year unknown';return <article key={event.id} className={styles.eventCard}><div className={styles.eventHeader}><div><div className={styles.eventYear}>{year}</div><div className={styles.eventDate}>{formatDate(event.race_date)}</div></div><div className={styles.winnerBlock}><span className={styles.winnerLabel}>Overall Winner</span><strong className={styles.winnerName}>{event.winner_name??'Not listed'}</strong></div></div><div className={styles.panelBody}>{rows.length?<div className={styles.resultsScroller}><div className={styles.compactHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>{rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span>{row.car_number??'—'}</span><strong>{row.driver_name}</strong><span>{row.starting_position??'—'}</span><span>{row.status??'—'}</span></div>)}</div>:<div className={styles.winnerOnly}>Winner chronology verified; full finishing order not yet preserved in the Museum archive.</div>}</div></article>})}</div>}</section>
   <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/lacrosse-fairgrounds-wi" className={styles.footerLink}>LaCrosse Archive<span>Open track history →</span></Link><Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link></div>
  </div>
 </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
