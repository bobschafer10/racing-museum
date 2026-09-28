import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const dynamic='force-dynamic'
export const revalidate=300

const SERIES_IDS=[207,208,209,210,211,212]
const FIRST_YEAR=1976,LAST_YEAR=2026
const divisionNames:Record<number,string>={
  207:'Late Model',208:'Modified',209:'Super Stock',
  210:'Late Model Sportsman',211:'Street Stock',212:'Midwest Modified'
}
const cancelledYears:Record<number,string>={
  1977:'Rain — No Races',1997:'Rain — No Features',2009:'Rain — No Races',2020:'COVID / Weather Cancellation'
}

type SeasonRow={id:number;series_id:number|null;year:number}
type ResultRef={id:number}
type EventRow={id:number;series_id:number|null;season_id:number|null;winner_name:string|null;SeriesEventResults:ResultRef[]}

export default async function RedClayClassicPage(){
  const [{data:seasonsRaw},{data:eventsRaw},{data:heroRows}]=await Promise.all([
    supabase.from('SeriesSeasons').select('id,series_id,year').in('series_id',SERIES_IDS),
    supabase.from('SeriesEvents').select('id,series_id,season_id,winner_name,SeriesEventResults(id)').in('series_id',SERIES_IDS),
    supabase.from('track_hero_photo_variants_view').select('image_url,photo_rank').eq('slug','abc-raceway-wi').order('photo_rank',{ascending:true}).limit(3)
  ])
  const seasons=(seasonsRaw??[]) as SeasonRow[]
  const events=(eventsRaw??[]) as EventRow[]
  const seasonById=new Map(seasons.map(s=>[s.id,s]))
  const yearMap=new Map<number,Set<number>>()
  let resultCount=0
  for(const event of events){
    resultCount+=event.SeriesEventResults?.length??0
    const season=event.season_id?seasonById.get(event.season_id):undefined
    if(!season||!event.series_id)continue
    if(!yearMap.has(season.year))yearMap.set(season.year,new Set())
    yearMap.get(season.year)!.add(event.series_id)
  }
  const years=Array.from({length:LAST_YEAR-FIRST_YEAR+1},(_,i)=>LAST_YEAR-i)
  const heroSrc=(heroRows?.[0] as any)?.image_url||''
  const secondarySrc=(heroRows?.[1] as any)?.image_url||heroSrc

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc?<img src={heroSrc} alt="ABC Raceway Red Clay Classic" className={styles.heroImage}/>:null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Red Clay Classic</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Red Clay Classic</h1>
        <p className={styles.tagline}>ABC Raceway · Ashland, Wisconsin</p>
        <p className={styles.intro}>First run in 1976, ABC Raceway&apos;s Red Clay Classic grew into one of the Upper Midwest&apos;s signature fall dirt-track traditions. The Museum links each documented championship division by year, preserving the Late Models, Modifieds, Super Stocks, the early Sportsman and Street Stock eras, and the Midwest Modified division added in 2010.</p>
        <div className={styles.heroActions}><Link href="#years" className={styles.button}>Browse Years</Link><Link href="/tracks/abc-raceway-wi" className={styles.buttonGhost}>Open ABC Raceway</Link></div>
        <div className={styles.stats}>
          <Stat label="History" value="1976–2026"/>
          <Stat label="Division Events" value={String(events.length)}/>
          <Stat label="Result Rows" value={resultCount.toLocaleString('en-US')}/>
          <Stat label="51st Edition" value="Oct. 2–3, 2026"/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Red Clay Classic Tradition</div>
            <strong>The event began in 1976 and reached its 50th running in 2025.</strong>
            <p>ABC Raceway&apos;s official champions archive is the chronology standard. Historical finishing orders are displayed only where they survive in the Museum record, while modern official ABC Raceway race reports preserve complete feature fields from 2019 and 2021–2025.</p>
          </div>
          {secondarySrc?<div className={styles.sourceCard}><img src={secondarySrc} alt="Historic racing at ABC Raceway" style={{width:'100%',height:'auto',display:'block'}}/></div>:null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Division History</div>
        <div className={styles.sectionHead}><h2>Championship Divisions Preserved</h2><div className={styles.sectionNote}>The class lineup evolved across five decades of the Classic.</div></div>
        <div className={styles.eraGrid}>
          {SERIES_IDS.map(id=>{
            const count=events.filter(e=>e.series_id===id).length
            return <div className={styles.eraCard} key={id}><div className={styles.eraYear}>{divisionNames[id]}</div><div className={styles.eraValue}>{count} documented event{count===1?'':'s'}</div></div>
          })}
        </div>
      </section>

      <section className={styles.section} id="years">
        <div className={styles.kicker}>Complete Event History</div>
        <div className={styles.sectionHead}><h2>Year-by-Year Archive</h2><div className={styles.sectionNote}>Open an edition to view every documented Red Clay Classic championship division for that year.</div></div>
        <div className={styles.yearGrid}>
          {years.map(year=>{
            const divisions=yearMap.get(year)
            const cancelLabel=cancelledYears[year]
            const count=divisions?.size??0
            const status=year===2026?'Upcoming · Oct. 2–3':cancelLabel||(count?`${count} Division${count===1?'':'s'}`:'Researching')
            return <Link key={year} href={`/events/red-clay-classic/${year}`} className={styles.yearCard}><div className={styles.yearNumber}>{year}</div><div className={styles.yearStatus}>{status}</div></Link>
          })}
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/abc-raceway-wi" className={styles.footerLink}>ABC Raceway<span>Open track archive →</span></Link>
        <Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
