import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type SeasonRow = { id:number; year:number }
type ResultRow = {
  id:number
  finishing_position:number|null
  driver_name:string
  driver_slug:string|null
}
type EventRow = {
  id:number
  season_id:number|null
  winner_name:string|null
  SeriesEventResults:ResultRow[]
}

function formatNumber(value:number){
  return value.toLocaleString('en-US')
}

export default async function TonyBettenhausenMemorialPage(){
  const {data:series,error:seriesError}=await supabase
    .from('Series')
    .select('id')
    .eq('slug','tony-bettenhausen-memorial-100')
    .maybeSingle()

  if(seriesError||!series){
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Tony Bettenhausen Memorial 100 archive.</div></div></main>
  }

  const [{data:seasonData},{data:eventData,error:eventError},{data:heroRows}]=await Promise.all([
    supabase.from('SeriesSeasons').select('id,year').eq('series_id',series.id).order('year',{ascending:true}),
    supabase.from('SeriesEvents')
      .select('id,season_id,winner_name,SeriesEventResults(id,finishing_position,driver_name,driver_slug)')
      .eq('series_id',series.id)
      .order('race_number',{ascending:true}),
    supabase.from('track_hero_photo_variants_view')
      .select('image_url')
      .eq('slug','illiana-speedway-in')
      .eq('photo_rank',1)
      .limit(1),
  ])

  const seasons=(seasonData||[]) as SeasonRow[]
  const events=(eventData||[]) as EventRow[]
  const yearBySeason=new Map(seasons.map(row=>[row.id,row.year]))
  const ordered=[...events].sort((a,b)=>(yearBySeason.get(b.season_id||0)||0)-(yearBySeason.get(a.season_id||0)||0))
  const resultCount=events.reduce((sum,event)=>sum+event.SeriesEventResults.length,0)
  const heroSrc=heroRows?.[0]?.image_url||''

  const winnerCounts=new Map<string,number>()
  for(const event of events){
    if(!event.winner_name)continue
    winnerCounts.set(event.winner_name,(winnerCounts.get(event.winner_name)||0)+1)
  }
  const repeatWinners=[...winnerCounts.entries()]
    .filter(([,wins])=>wins>1)
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc?<img src={heroSrc} alt="Illiana Motor Speedway" className={styles.heroImage}/>:null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Tony Bettenhausen Memorial 100</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Tony Bettenhausen Memorial 100</h1>
        <p className={styles.tagline}>Illiana Motor Speedway's Tribute to a Racing Legend</p>
        <p className={styles.intro}>Beginning in 1962, Illiana Motor Speedway's annual late model classic honored Tinley Park racing great Tony Bettenhausen. Stan Kalwasinski's capsule history preserves the first 51 editions through 2012, including the top five finishers from every running.</p>
        <div className={styles.heroActions}><Link href="/tracks/illiana-speedway-in" className={styles.button}>Open Illiana Archive</Link><Link href="#history" className={styles.buttonGhost}>View 51 Editions</Link></div>
        <div className={styles.stats}><Stat label="Editions Preserved" value={String(events.length)}/><Stat label="Years" value="1962–2012"/><Stat label="Different Winners" value={String(winnerCounts.size)}/><Stat label="Top-Five Results" value={formatNumber(resultCount)}/></div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Honoring Tony Bettenhausen</div>
            <strong>A Chicagoland favorite with a national racing reputation.</strong>
            <p>Bettenhausen's career spanned more than two decades across stock cars, midgets, sprint cars and Indianapolis cars. The Tinley Park, Illinois, racer made 14 Indianapolis 500 starts, earned five top-ten finishes and won two national Indy car championships. He died in a practice crash at Indianapolis Motor Speedway in May 1961 while testing a car for another driver. His sons Gary, Merle and Tony Jr. later followed him to Indianapolis.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Archive Source</div>
            <strong>Stan Kalwasinski / Chicagoland Auto Racing</strong>
            <p>The 1962–2012 winner chronology and every top-five finish shown here are preserved from Kalwasinski's capsule summary of Illiana's Bettenhausen events.</p>
            <a href="https://www.chicagolandautoracing.com" target="_blank" rel="noreferrer" style={{color:'#d0ad63'}}>ChicagolandAutoRacing.com →</a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>How the Classic Evolved</div>
          <strong>USAC beginnings, then one of Illiana's signature open-competition races.</strong>
          <p>The first three editions, 1962–1964, were USAC-sanctioned 100-lap stock car races. The 1965 running became the first open-competition Bettenhausen event and was shortened to 50 laps; the race returned to 100 laps in 1966. ARTGO sanctioned the 20th annual event in 1981. The Museum's current event collection reflects the 51 Illiana editions documented in Kalwasinski's 1962–2012 summary; later editions can be added as separately sourced records.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Multiple-Time Winners</div>
        <div className={styles.sectionHead}><h2>Drivers Who Won More Than Once</h2><div className={styles.sectionNote}>Ed Hoffman and Eddie Hoffman are preserved as separate drivers, matching the source chronology.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} {wins===1?'win':'wins'}</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>Tony Bettenhausen Memorial 100 victories through 2012</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="history">
        <div className={styles.kicker}>Complete Kalwasinski Capsule History</div>
        <div className={styles.sectionHead}><h2>1962–2012 Year-by-Year Top Five</h2><div className={styles.sectionNote}>All 255 positions are retained exactly to the depth documented in the supplied source. Missing car numbers, starts and other statistics are not reconstructed.</div></div>
        {eventError?<div className={styles.empty}>Unable to load the live Tony Bettenhausen Memorial result archive.</div>:
        <div className={styles.eventStack}>{ordered.map(event=>{
          const year=yearBySeason.get(event.season_id||0)
          const rows=[...event.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year||'Year unknown'}</div><div className={styles.eventDate}>Illiana Motor Speedway • Schererville, Indiana</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Race Winner</span><strong className={styles.winnerName}>{event.winner_name||'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>Top Five Preserved</span><strong>Stan Kalwasinski / Chicagoland Auto Racing</strong></div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span></span><span>Driver</span><span></span><span></span></div>
                {rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span></span><strong>{row.driver_slug?<Link href={'/drivers/'+row.driver_slug} style={{color:'inherit'}}>{row.driver_name}</Link>:row.driver_name}</strong><span></span><span></span></div>)}
              </div>
            </div>
          </article>
        })}</div>}
      </section>

      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/illiana-speedway-in" className={styles.footerLink}>Illiana Motor Speedway<span>Open track history →</span></Link><Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link></div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
