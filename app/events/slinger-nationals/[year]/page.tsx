import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSlingerNationalsMrnStandings } from '@/lib/special-events/slingerNationals'
import styles from '../../special-event.module.css'

export const revalidate = 300
const SERIES_ID=38, MIN_YEAR=1980, MAX_YEAR=2026
const mrnYears=new Set([1981,1982,1983,1987,1999])

type ResultRow={id:number;finishing_position:number|null;starting_position:number|null;car_number:string|null;driver_name:string;sponsor:string|null;make:string|null;laps:number|null;led:number|null;status:string|null;result_section:string|null}
type RaceEventRow={id:number;race_number:number|null;race_date:string|null;winner_name:string|null;source_url:string|null;SeriesEventResults:ResultRow[]}

function photoUrl(fileName?:string|null,year?:string|null){const base=process.env.NEXT_PUBLIC_SUPABASE_URL;return fileName&&base?`${base}/storage/v1/object/public/media/photos/master/slinger-speedway-wi/${year||'unknown-year'}/${fileName}`:''}
function formatDate(value:string|null){if(!value)return'Date not listed';const [y,m,d]=value.split('-');return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}

export default async function SlingerNationalsYearPage({params}:{params:Promise<{year:string}>}){
 const {year}=await params;const seasonYear=Number(year);if(!Number.isInteger(seasonYear)||seasonYear<MIN_YEAR||seasonYear>MAX_YEAR)notFound()
 const [{data:raceEventsRaw,error:raceError},{data:heroPhotos}]=await Promise.all([
  supabase.from('SeriesEvents').select(`id,race_number,race_date,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,sponsor,make,laps,led,status,result_section)`).eq('series_id',SERIES_ID).gte('race_date',`${seasonYear}-01-01`).lte('race_date',`${seasonYear}-12-31`).order('race_date',{ascending:true}).order('race_number',{ascending:true}),
  supabase.from('photos').select('file_name,year').eq('track_slug','slinger-speedway-wi').neq('credit_type','unknown').or(`year.eq.${seasonYear},year.is.null`).limit(6)
 ])
 const raceEvents=(raceEventsRaw??[]) as RaceEventRow[];const seriesEra=seasonYear<2000
 const expectedRaceCount=seasonYear===1980?3:seasonYear===1981||seasonYear===1982?4:seasonYear>=1983&&seasonYear<=1998?3:seasonYear===1999?2:1
 const liveRaceCount=raceEvents.length||expectedRaceCount;const resultCount=raceEvents.reduce((s,r)=>s+r.SeriesEventResults.length,0);const dnqCount=raceEvents.reduce((s,r)=>s+r.SeriesEventResults.filter(x=>x.result_section==='DNQ').length,0)
 const mrnStandings=getSlingerNationalsMrnStandings(seasonYear);const champion=mrnStandings?.rows.find(r=>r.position===1)??null
 const previousYear=seasonYear>MIN_YEAR?seasonYear-1:null,nextYear=seasonYear<MAX_YEAR?seasonYear+1:null
 const heroSrc=photoUrl(heroPhotos?.[0]?.file_name,heroPhotos?.[0]?.year)
 return <main className={styles.page}>
  <section className={styles.hero}>{heroSrc?<img src={heroSrc} alt={`Slinger Speedway ${seasonYear}`} className={styles.heroImage}/>:null}<div className={styles.heroShade}/><div className={styles.heroInner}>
   <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><Link href="/events/slinger-nationals">Slinger Nationals</Link><span>›</span><span>{seasonYear}</span></div>
   <div className={styles.eyebrow}>Slinger Nationals Season Archive</div><h1 className={styles.title}>{seasonYear} Slinger Nationals</h1><p className={styles.tagline}>{seriesEra?`${liveRaceCount}-Race Nationals Series Season`:'Annual Slinger Nationals Classic'}</p>
   <div className={styles.stats}><Stat label="Archive Era" value={seriesEra?'Series':'Annual'}/><Stat label="Race Events" value={String(liveRaceCount)}/><Stat label="Result Rows" value={String(resultCount)}/><Stat label="DNQs" value={String(dnqCount)}/></div>
  </div></section>
  <div className={styles.content}>
   <div className={styles.yearNav}><div>{previousYear?<Link className={styles.yearNavLink} href={`/events/slinger-nationals/${previousYear}`}>← {previousYear}</Link>:null}</div><Link className={styles.yearNavCenter} href="/events/slinger-nationals">All Years</Link><div className={styles.yearNavLinkRight}>{nextYear?<Link className={styles.yearNavLink} href={`/events/slinger-nationals/${nextYear}`}>{nextYear} →</Link>:null}</div></div>
   <section className={styles.section}><div className={styles.kicker}>Race-by-Race Record</div><div className={styles.sectionHead}><h2>Feature Results</h2><div className={styles.sectionNote}>{champion?`Published champion: ${champion.driver}`:mrnYears.has(seasonYear)?'MRN standings supplement available':'Race results preserved from archival sources'}</div></div>
   {raceError?<div className={styles.empty}>Unable to load the live race archive.</div>:raceEvents.length?<div className={styles.eventStack}>{raceEvents.map(race=>{const feature=race.SeriesEventResults.filter(x=>x.result_section!=='DNQ').sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999));const dnq=race.SeriesEventResults.filter(x=>x.result_section==='DNQ').sort((a,b)=>a.driver_name.localeCompare(b.driver_name));return <article key={race.id} className={styles.panel}><div className={styles.panelHeader}><h3 className={styles.panelTitle}>Race {race.race_number??'—'} · {formatDate(race.race_date)}</h3></div><div className={styles.panelBody}><div className={styles.winnerBar}><span>Feature Winner</span><strong>{race.winner_name??'Not listed'}</strong></div><div className={styles.resultsScroller}><div className={styles.resultsHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Laps</span><span>Status</span></div>{feature.map(row=><div key={row.id} className={styles.resultsRow}><strong>{row.finishing_position??'—'}</strong><span>{row.car_number??'—'}</span><strong>{row.driver_name}</strong><span>{row.starting_position??'—'}</span><span>{row.laps??'—'}</span><span>{row.status??'—'}</span></div>)}</div>{dnq.length?<div className={styles.dnqWrap}><div className={styles.dnqTitle}>Did Not Qualify</div>{dnq.map(row=><span key={row.id} className={styles.dnqChip}>{row.driver_name}{row.car_number?` #${row.car_number}`:''}</span>)}</div>:null}</div></article>})}</div>:<div className={styles.empty}>No race archive is currently available for this year.</div>}</section>
   <section className={styles.section}><div className={styles.kicker}>Championship History</div><div className={styles.sectionHead}><h2>Point Standings</h2></div>{mrnStandings?<div className={styles.panel}><div className={styles.panelHeader}><h3 className={styles.panelTitle}>{mrnStandings.source}</h3><div className={styles.panelMeta}>{mrnStandings.coverage}</div></div><div className={styles.panelBody}><div className={styles.resultsScroller}><div className={styles.compactHeader}><span>Pos.</span><span></span><span>Driver</span><span></span><span>Points</span></div>{mrnStandings.rows.map(row=><div key={`${row.position}-${row.driver}`} className={styles.compactRow}><strong>{row.position}</strong><span></span><strong>{row.driver}</strong><span></span><strong>{row.points.toLocaleString('en-US')}</strong></div>)}</div><p className={styles.note}>Only clearly confirmed published positions are shown. Missing positions or totals are not reconstructed.</p></div></div>:<div className={styles.sourceCard}>Available point standings are shown exactly as preserved by the historical source. Missing totals remain blank rather than estimated.</div>}</section>
   <div className={styles.footerLinks}><Link href="/events/slinger-nationals" className={styles.footerLink}>Slinger Nationals<span>Return to event archive →</span></Link><Link href="/tracks/slinger-speedway-wi" className={styles.footerLink}>Slinger Speedway<span>Open track archive →</span></Link><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link></div>
  </div>
 </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
