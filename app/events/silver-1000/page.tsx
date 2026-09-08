import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate=300
const LATE_MODEL_SERIES_ID=93, MODIFIED_SERIES_ID=94, FIRST_YEAR=1973, LAST_YEAR=2025, MODIFIED_FIRST_YEAR=1988
function photoUrl(fileName?:string|null,year?:string|null){const base=process.env.NEXT_PUBLIC_SUPABASE_URL;return fileName&&base?`${base}/storage/v1/object/public/media/photos/master/proctor-speedway-mn/${year||'unknown-year'}/${fileName}`:''}

export default async function Silver1000Page(){
 const [{data:seasons},{data:lateModelEvents},{data:modifiedEvents},{data:photos}]=await Promise.all([
  supabase.from('SeriesSeasons').select('year,races').eq('series_id',LATE_MODEL_SERIES_ID).order('year',{ascending:false}),
  supabase.from('SeriesEvents').select('id,race_date,winner_name').eq('series_id',LATE_MODEL_SERIES_ID),
  supabase.from('SeriesEvents').select('id,race_date,winner_name').eq('series_id',MODIFIED_SERIES_ID),
  supabase.from('photos').select('file_name,year').eq('track_slug','proctor-speedway-mn').neq('credit_type','unknown').order('year',{ascending:false}).limit(8),
 ])
 const years=seasons??[];const lateModelCount=lateModelEvents?.length??52;const modifiedCount=modifiedEvents?.length??37;const heroSrc=photoUrl(photos?.[0]?.file_name,photos?.[0]?.year)
 return <main className={styles.page}>
  <section className={styles.hero}>{heroSrc?<img src={heroSrc} alt="Silver 1000 at Proctor Speedway" className={styles.heroImage}/>:null}<div className={styles.heroShade}/><div className={styles.heroInner}>
   <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Silver 1000</span></div>
   <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div><h1 className={styles.title}>Silver 1000</h1><p className={styles.tagline}>A Proctor Speedway Tradition</p>
   <p className={styles.intro}>The Late Model Division has been part of the event since 1973, with Modifieds joining in 1988. Historical references to Halvor Lines Speedway are normalized to Proctor Speedway so every documented edition remains connected in one museum archive.</p>
   <div className={styles.heroActions}><Link href="/tracks/proctor-speedway-mn" className={styles.button}>Open Proctor Speedway</Link><Link href="#years" className={styles.buttonGhost}>Browse Years</Link></div>
   <div className={styles.stats}><Stat label="Years" value={`${FIRST_YEAR}–${LAST_YEAR}`}/><Stat label="Late Model Races" value={String(lateModelCount)}/><Stat label="Modified Races" value={String(modifiedCount)}/><Stat label="2020 Edition" value="Cancelled"/></div>
  </div></section>
  <div className={styles.content}>
   <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Archive Standard</div><strong>One annual event collection, multiple divisions.</strong><p>Late Model and Modified races are displayed together on the same year page whenever both divisions competed. Finishing orders are shown only to the depth preserved by historical sources; missing positions are never reconstructed.</p></div></section>
   <section className={styles.section} id="years"><div className={styles.kicker}>Complete Event History</div><div className={styles.sectionHead}><h2>Year-by-Year Archive</h2><div className={styles.sectionNote}>Open an edition to view Late Model and Modified results together.</div></div><div className={styles.yearGrid}>{(years.length?years:Array.from({length:53},(_,i)=>({year:LAST_YEAR-i,races:LAST_YEAR-i===2020?0:1}))).map((row:any)=><Link key={row.year} href={`/events/silver-1000/${row.year}`} className={styles.yearCard}><div className={styles.yearNumber}>{row.year}</div><div className={styles.yearStatus}>{row.races===0?'Cancelled':row.year>=MODIFIED_FIRST_YEAR?'Late Model + Modified':'Late Model'}</div></Link>)}</div></section>
   <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/proctor-speedway-mn" className={styles.footerLink}>Proctor Speedway<span>Open track archive →</span></Link><Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link></div>
  </div>
 </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
