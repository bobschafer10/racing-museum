import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const dynamic='force-dynamic'
export const revalidate=300

const SERIES_IDS=[194,195,196,197,198,199,200,201,202,203,204,205,206]
const FIRST_YEAR=1980,LAST_YEAR=2026
const divisionNames:Record<number,string>={
  194:'Late Model',195:'Modified',196:'Super Stock',197:'Midwest Modified',
  198:'Street Stock',199:'Pure Stock',200:'Hornet / Four Cylinder',
  201:'Limited Late Model',202:'Winged Sprint Car',203:'Non-Winged Sprint Car',
  204:'USRA Late Model',205:'Hobby Stock',206:'600 Mini Mod'
}
const cancelledYears:Record<number,string>={2020:'COVID — No Event',2023:'Event Cancelled',2025:'Rained Out'}

type SeasonRow={id:number;series_id:number|null;year:number}
type ResultRef={id:number}
type EventRow={id:number;series_id:number|null;season_id:number|null;SeriesEventResults:ResultRef[]}

export default async function PunkyManorPage(){
  const [{data:seasonsRaw},{data:eventsRaw}]=await Promise.all([
    supabase.from('SeriesSeasons').select('id,series_id,year').in('series_id',SERIES_IDS),
    supabase.from('SeriesEvents').select('id,series_id,season_id,SeriesEventResults(id)').in('series_id',SERIES_IDS)
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
  return <main className={styles.page}>
    <section className={styles.hero}>
      <img src="/events/punky-manor/punky-manor-hero-1.webp" alt="Punky Manor number 57 race car" className={styles.heroImage}/>
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Punky Manor Challenge of Champions</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Punky Manor</h1>
        <p className={styles.tagline}>Challenge of Champions · Red Cedar Speedway</p>
        <img src="/events/punky-manor/punky-manor-logo.webp" alt="Punky Manor Challenge of Champions logo" style={{width:'min(430px,78vw)',height:'auto',marginTop:'18px',display:'block'}}/>
        <p className={styles.intro}>The Museum preserves the Punky Manor Challenge of Champions as one multi-division Red Cedar Speedway tradition. The archive begins with the 1980 event and links every documented championship division by year, including the Late Models, Modifieds, Super Stocks, Midwest Modifieds and the support classes that appeared during different eras.</p>
        <div className={styles.heroActions}><Link href="#years" className={styles.button}>Browse Years</Link><Link href="/tracks/red-cedar-speedway-wi" className={styles.buttonGhost}>Open Red Cedar Speedway</Link></div>
        <div className={styles.stats}>
          <Stat label="Years" value="1980–2026"/>
          <Stat label="Division Events" value={String(events.length)}/>
          <Stat label="Result Rows" value={resultCount.toLocaleString('en-US')}/>
          <Stat label="Documented Divisions" value={String(SERIES_IDS.length)}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Archive Standard</div>
            <strong>Championship features only — with the field preserved as deeply as the source allows.</strong>
            <p>The winner chronology is retained even when a complete finishing order has not survived. Modern MyRacePass fields are preserved in full, while older newspaper, Dirt Race Central, Red Cedar Speedway and other verified source records remain partial where that is all the historical evidence supports.</p>
          </div>
          <div className={styles.sourceCard}>
            <img src="/events/punky-manor/punky-manor-hero-2.webp" alt="Punky Manor number 57 race car at the track" style={{width:'100%',height:'auto',display:'block'}}/>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Division History</div>
        <div className={styles.sectionHead}><h2>Championship Divisions Preserved</h2><div className={styles.sectionNote}>The class lineup changed over the event&apos;s history.</div></div>
        <div className={styles.eraGrid}>
          {SERIES_IDS.map(id=><div className={styles.eraCard} key={id}><div className={styles.eraYear}>{divisionNames[id]}</div><div className={styles.eraValue}>{events.filter(e=>e.series_id===id).length} documented event{events.filter(e=>e.series_id===id).length===1?'':'s'}</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="years">
        <div className={styles.kicker}>Complete Event History</div>
        <div className={styles.sectionHead}><h2>Year-by-Year Archive</h2><div className={styles.sectionNote}>Open an edition to view every documented Punky Manor championship division for that year.</div></div>
        <div className={styles.yearGrid}>
          {years.map(year=>{
            const divisions=yearMap.get(year)
            const cancelLabel=cancelledYears[year]
            const count=divisions?.size??0
            return <Link key={year} href={`/events/punky-manor/${year}`} className={styles.yearCard}>
              <div className={styles.yearNumber}>{year}</div>
              <div className={styles.yearStatus}>{cancelLabel|| (count? `${count} Division${count===1?'':'s'}`:'Researching')}</div>
            </Link>
          })}
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/red-cedar-speedway-wi" className={styles.footerLink}>Red Cedar Speedway<span>Open track archive →</span></Link>
        <Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
