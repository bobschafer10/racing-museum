import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const dynamic='force-dynamic'
export const revalidate=300
const SERIES_IDS=[95,96,98,99,100,101,102,103],FIRST_YEAR=1986,LAST_YEAR=2025
const divisionNames:Record<number,string>={95:'Late Model',96:'Modified',98:'Super Stock',99:'Street Stock',100:'Midwest Modified',101:'Mod Four',102:'Pure Stock',103:'Hornet'}
type EventRow={series_id:number|null;race_date:string|null;track_slug:string|null}
function photoUrl(trackSlug:string,fileName?:string|null,year?:string|null){const base=process.env.NEXT_PUBLIC_SUPABASE_URL;return fileName&&base?`${base}/storage/v1/object/public/media/photos/master/${trackSlug}/${year||'unknown-year'}/${fileName}`:''}

export default async function Wissota100Page(){
 const {data:eventRows}=await supabase.from('SeriesEvents').select('series_id,race_date,track_slug').in('series_id',SERIES_IDS).order('race_date',{ascending:false})
 const events=(eventRows??[]) as EventRow[];const yearMap=new Map<number,Set<number>>()
 for(const event of events){if(!event.race_date||!event.series_id)continue;const year=Number(event.race_date.slice(0,4));if(!yearMap.has(year))yearMap.set(year,new Set());yearMap.get(year)!.add(event.series_id)}
 const heroTrackSlug=events.find(e=>e.track_slug)?.track_slug||'cedar-lake-speedway-wi'
 const {data:photos}=await supabase.from('photos').select('file_name,year').eq('track_slug',heroTrackSlug).neq('credit_type','unknown').order('year',{ascending:false}).limit(8)
 const heroSrc=photoUrl(heroTrackSlug,photos?.[0]?.file_name,photos?.[0]?.year);const years=Array.from({length:LAST_YEAR-FIRST_YEAR+1},(_,i)=>LAST_YEAR-i)
 return <main className={styles.page}>
  <section className={styles.hero}>{heroSrc?<img src={heroSrc} alt="WISSOTA 100 racing" className={styles.heroImage}/>:null}<div className={styles.heroShade}/><div className={styles.heroInner}>
   <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>WISSOTA 100</span></div>
   <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div><h1 className={styles.title}>WISSOTA 100</h1><p className={styles.tagline}>Championship Night, Preserved by Division</p>
   <p className={styles.intro}>The Museum links each documented WISSOTA 100 championship division together by year. Late Models and Modifieds form the earliest archive, with Super Stocks, Street Stocks, Midwest Modifieds, Mod Fours, Pure Stocks and Hornets added where documented. Race of Champions and qualifying-night features remain separate.</p>
   <div className={styles.heroActions}><Link href="#years" className={styles.button}>Browse Years</Link><Link href="/events" className={styles.buttonGhost}>All Special Events</Link></div>
   <div className={styles.stats}><Stat label="Years" value="1986–2025"/><Stat label="Division Events" value={String(events.length)}/><Stat label="Divisions" value="8"/><Stat label="Cancelled Editions" value="2"/></div>
  </div></section>
  <div className={styles.content}>
   <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Archive Standard</div><strong>Preserve what survives; never reconstruct missing finishing orders.</strong><p>A full field is used when available. Otherwise top-10, top-four, or winner-only records remain exactly as preserved. The 1987 edition was rained out and the 2020 edition was cancelled during COVID.</p></div></section>
   <section className={styles.section} id="years"><div className={styles.kicker}>Complete Championship History</div><div className={styles.sectionHead}><h2>Year-by-Year Archive</h2><div className={styles.sectionNote}>Open an edition to view every documented championship division for that year.</div></div><div className={styles.yearGrid}>{years.map(year=>{const divisions=yearMap.get(year);const cancelled=year===1987||year===2020;const labels=divisions?Array.from(divisions).map(id=>divisionNames[id]).filter(Boolean):[];return <Link key={year} href={`/events/wissota-100/${year}`} className={styles.yearCard}><div className={styles.yearNumber}>{year}</div><div className={styles.yearStatus}>{cancelled?(year===2020?'COVID — No Event':'Rained Out'):labels.length?`${labels.length} Division${labels.length===1?'':'s'}`:'No Record'}</div></Link>})}</div></section>
   <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks" className={styles.footerLink}>Track Archive<span>Explore host venues →</span></Link><Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link></div>
  </div>
 </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
