import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../../special-event.module.css'

export const revalidate=300
const LATE_MODEL_SERIES_ID=93,MODIFIED_SERIES_ID=94,MIN_YEAR=1973,MAX_YEAR=2025,MODIFIED_FIRST_YEAR=1988

type ResultRow={id:number;finishing_position:number|null;starting_position:number|null;car_number:string|null;driver_name:string;status:string|null;result_section:string|null}
type RaceRow={id:number;race_date:string|null;winner_name:string|null;source_url:string|null;SeriesEventResults:ResultRow[]}
function formatDate(value:string|null){if(!value)return'Date not listed';const [y,m,d]=value.split('-');return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
function photoUrl(fileName?:string|null,year?:string|null){const base=process.env.NEXT_PUBLIC_SUPABASE_URL;return fileName&&base?`${base}/storage/v1/object/public/media/photos/master/proctor-speedway-mn/${year||'unknown-year'}/${fileName}`:''}

export default async function Silver1000YearPage({params}:{params:Promise<{year:string}>}){
 const {year}=await params;const seasonYear=Number(year);if(!Number.isInteger(seasonYear)||seasonYear<MIN_YEAR||seasonYear>MAX_YEAR)notFound()
 const [{data:season},{data:lateModelsRaw,error:lateError},{data:modifiedsRaw,error:modifiedError},{data:photos}]=await Promise.all([
  supabase.from('SeriesSeasons').select('year,races').eq('series_id',LATE_MODEL_SERIES_ID).eq('year',seasonYear).maybeSingle(),
  supabase.from('SeriesEvents').select(`id,race_date,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,status,result_section)`).eq('series_id',LATE_MODEL_SERIES_ID).gte('race_date',`${seasonYear}-01-01`).lte('race_date',`${seasonYear}-12-31`).order('race_date',{ascending:true}),
  supabase.from('SeriesEvents').select(`id,race_date,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,status,result_section)`).eq('series_id',MODIFIED_SERIES_ID).gte('race_date',`${seasonYear}-01-01`).lte('race_date',`${seasonYear}-12-31`).order('race_date',{ascending:true}),
  supabase.from('photos').select('file_name,year').eq('track_slug','proctor-speedway-mn').neq('credit_type','unknown').or(`year.eq.${seasonYear},year.is.null`).limit(6),
 ])
 const lateModels=(lateModelsRaw??[]) as RaceRow[],modifieds=(modifiedsRaw??[]) as RaceRow[];const cancelled=season?.races===0;const hasModifiedDivision=seasonYear>=MODIFIED_FIRST_YEAR&&seasonYear!==2020
 const previousYear=seasonYear>MIN_YEAR?seasonYear-1:null,nextYear=seasonYear<MAX_YEAR?seasonYear+1:null;const heroSrc=photoUrl(photos?.[0]?.file_name,photos?.[0]?.year)
 return <main className={styles.page}>
  <section className={styles.hero}>{heroSrc?<img src={heroSrc} alt={`${seasonYear} Silver 1000`} className={styles.heroImage}/>:null}<div className={styles.heroShade}/><div className={styles.heroInner}>
   <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><Link href="/events/silver-1000">Silver 1000</Link><span>›</span><span>{seasonYear}</span></div>
   <div className={styles.eyebrow}>Silver 1000 Edition Archive</div><h1 className={styles.title}>{seasonYear} Silver 1000</h1><p className={styles.tagline}>{cancelled?'Event Cancelled':hasModifiedDivision?'Late Models + Modifieds at Proctor Speedway':'Late Models at Proctor Speedway'}</p>
   <div className={styles.stats}><Stat label="Edition" value={String(seasonYear)}/><Stat label="Late Model Races" value={String(lateModels.length)}/><Stat label="Modified Races" value={hasModifiedDivision?String(modifieds.length):'—'}/><Stat label="Archive Status" value={cancelled?'Cancelled':'Preserved'}/></div>
  </div></section>
  <div className={styles.content}><div className={styles.yearNav}><div>{previousYear?<Link className={styles.yearNavLink} href={`/events/silver-1000/${previousYear}`}>← {previousYear}</Link>:null}</div><Link className={styles.yearNavCenter} href="/events/silver-1000">All Years</Link><div className={styles.yearNavLinkRight}>{nextYear?<Link className={styles.yearNavLink} href={`/events/silver-1000/${nextYear}`}>{nextYear} →</Link>:null}</div></div>
   {cancelled?<section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>2020 Edition</div><strong>The Silver 1000 was cancelled in 2020.</strong><p>No race result is fabricated for the missing edition.</p></div></section>:<><DivisionSection title="Late Model Division" races={lateModels} error={Boolean(lateError)}/>{hasModifiedDivision?<DivisionSection title="Modified Division" races={modifieds} error={Boolean(modifiedError)}/>:null}</>}
   <div className={styles.footerLinks}><Link href="/events/silver-1000" className={styles.footerLink}>Silver 1000<span>Return to event archive →</span></Link><Link href="/tracks/proctor-speedway-mn" className={styles.footerLink}>Proctor Speedway<span>Open track archive →</span></Link><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link></div>
  </div>
 </main>
}
function DivisionSection({title,races,error}:{title:string;races:RaceRow[];error:boolean}){return <section className={styles.section}><div className={styles.kicker}>Championship Division</div><div className={styles.sectionHead}><h2>{title}</h2></div>{error?<div className={styles.empty}>Unable to load this division from the Museum database.</div>:races.length?races.map(race=>{const feature=race.SeriesEventResults.filter(r=>!['DNQ','DNS'].includes(r.result_section??'')).sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999));const dnq=race.SeriesEventResults.filter(r=>['DNQ','DNS'].includes(r.result_section??'')).sort((a,b)=>a.driver_name.localeCompare(b.driver_name));return <article key={race.id} className={styles.panel}><div className={styles.panelHeader}><h3 className={styles.panelTitle}>{formatDate(race.race_date)}</h3></div><div className={styles.panelBody}><div className={styles.winnerBar}><span>Winner</span><strong>{race.winner_name??'Not listed'}</strong></div><div className={styles.resultsScroller}><div className={styles.compactHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>{feature.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span>{row.car_number??'—'}</span><strong>{row.driver_name}</strong><span>{row.starting_position??'—'}</span><span>{row.status??'—'}</span></div>)}</div>{dnq.length?<div className={styles.dnqWrap}><div className={styles.dnqTitle}>Did Not Start / Qualify</div>{dnq.map(row=><span key={row.id} className={styles.dnqChip}>{row.driver_name}{row.car_number?` #${row.car_number}`:''}</span>)}</div>:null}<p className={styles.note}>Only positions preserved by historical sources are shown. Missing finishing positions are not reconstructed.</p></div></article>}):<div className={styles.empty}>No race record is currently available for this division.</div>}</section>}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
