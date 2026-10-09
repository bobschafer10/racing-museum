import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 43200

type SeasonRow = { id:number; year:number }
type ResultRow = {
  id:number
  finishing_position:number|null
  starting_position:string|null
  car_number:string|null
  driver_name:string
  driver_slug:string|null
  laps:string|null
}
type EventRow = {
  id:number
  season_id:number|null
  race_date:string|null
  track_name:string|null
  track_slug:string|null
  winner_name:string|null
  source_url:string|null
  SeriesEventResults:ResultRow[]
}

function formatNumber(value:number){
  return value.toLocaleString('en-US')
}

function formatDate(value:string|null){
  if(!value)return''
  const [y,m,d]=value.split('-')
  return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
}

function sourceLabel(url:string|null,year:number|undefined){
  if(!url)return year&&year<=2012?'Stan Kalwasinski / Chicagoland Auto Racing':'Museum research source'
  if(url.includes('nwitimes.com'))return'Northwest Indiana Times'
  if(url.includes('chicagotribune.com'))return'Chicago Tribune'
  if(url.includes('thethirdturn.com'))return'The Third Turn'
  if(url.includes('speedsport.com'))return'SPEED SPORT'
  return year&&year<=2012?'Stan Kalwasinski / Chicagoland Auto Racing':'Source report'
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
      .select('id,season_id,race_date,track_name,track_slug,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug,laps)')
      .eq('series_id',series.id)
      .order('race_number',{ascending:true}),
    supabase.from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .in('slug',['illiana-speedway-in','grundy-county-speedway-il'])
      .eq('photo_rank',1),
  ])

  const seasons=(seasonData||[]) as SeasonRow[]
  const events=(eventData||[]) as EventRow[]
  const yearBySeason=new Map(seasons.map(row=>[row.id,row.year]))
  const ordered=[...events].sort((a,b)=>(yearBySeason.get(b.season_id||0)||0)-(yearBySeason.get(a.season_id||0)||0))
  const resultCount=events.reduce((sum,event)=>sum+event.SeriesEventResults.length,0)
  const photoByTrack=new Map((heroRows||[]).map((row:any)=>[row.slug,row.image_url]))
  const heroSrc=photoByTrack.get('illiana-speedway-in')||photoByTrack.get('grundy-county-speedway-il')||''

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
      {heroSrc?<img src={heroSrc} alt="Tony Bettenhausen Memorial racing" className={styles.heroImage}/>:null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Tony Bettenhausen Memorial 100</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Tony Bettenhausen Memorial 100</h1>
        <p className={styles.tagline}>From Illiana to Grundy — 65 Editions of Chicagoland Late Model History</p>
        <p className={styles.intro}>Founded at Illiana Motor Speedway in 1962 to honor Tinley Park racing great Tony Bettenhausen, the annual classic continued at Grundy County Speedway in 2016 after Illiana closed. The Museum now preserves every edition through the 65th running in 2026.</p>
        <div className={styles.heroActions}><Link href="/tracks/illiana-speedway-in" className={styles.button}>Open Illiana Archive</Link><Link href="/tracks/grundy-county-speedway-il" className={styles.buttonGhost}>Open Grundy Archive</Link><Link href="#history" className={styles.buttonGhost}>View 65 Editions</Link></div>
        <div className={styles.stats}><Stat label="Editions Preserved" value={String(events.length)}/><Stat label="Years" value="1962–2026"/><Stat label="Different Winners" value={String(winnerCounts.size)}/><Stat label="Result Positions" value={formatNumber(resultCount)}/></div>
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
            <div className={styles.sourceLabel}>Archive Sources</div>
            <strong>Stan Kalwasinski's work remains the backbone of the collection.</strong>
            <p>Kalwasinski's Chicagoland Auto Racing capsule preserves the Illiana history through 2012. The 2013–2026 continuation is built from Northwest Indiana Times, Chicago Tribune, The Third Turn and SPEED SPORT race reports, including Kalwasinski's later SPEED SPORT coverage.</p>
            <a href="http://www.kalracing.com/autoracing/tony%20bett%20race%20summary.htm" target="_blank" rel="noreferrer" style={{color:'#d0ad63'}}>Original Kalwasinski history →</a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>How the Classic Evolved</div>
          <strong>USAC beginnings, Illiana tradition, then a new home at Grundy.</strong>
          <p>The first three editions, 1962–1964, were USAC-sanctioned 100-lap stock car races. The 1965 running became the first open-competition Bettenhausen event and was shortened to 50 laps; the race returned to 100 laps in 1966. ARTGO sanctioned the 20th annual event in 1981. Illiana hosted the race through 2015. After the Schererville speedway closed, Grundy County Speedway in Morris, Illinois, inherited the tradition in 2016 and has carried it forward through 2026.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Multiple-Time Winners</div>
        <div className={styles.sectionHead}><h2>Drivers Who Won More Than Once</h2><div className={styles.sectionNote}>Ed Hoffman and Eddie Hoffman are preserved as separate drivers, matching the historical source chronology.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} {wins===1?'win':'wins'}</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>Tony Bettenhausen Memorial victories through 2026</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="history">
        <div className={styles.kicker}>Complete 65-Edition Chronology</div>
        <div className={styles.sectionHead}><h2>1962–2026 Year-by-Year Results</h2><div className={styles.sectionNote}>1962–2012 preserves Kalwasinski's documented top five. Full published fields are preserved for 2013–2015, 2017 and 2019–2026. For 2016 and 2018, the currently recovered reports publish the top six; missing positions are not reconstructed.</div></div>
        {eventError?<div className={styles.empty}>Unable to load the live Tony Bettenhausen Memorial result archive.</div>:
        <div className={styles.eventStack}>{ordered.map(event=>{
          const year=yearBySeason.get(event.season_id||0)
          const rows=[...event.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
          const isPartialLater=Boolean(year&&[2016,2018].includes(year))
          const depthLabel=year&&year<=2012?'Top Five Preserved':isPartialLater?'Published Top Six':`Published Finish • ${rows.length} cars`
          const venue=event.track_name||'Venue not listed'
          const dateText=formatDate(event.race_date)
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year||'Year unknown'}</div><div className={styles.eventDate}>{venue}{dateText?' • '+dateText:''}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Race Winner</span><strong className={styles.winnerName}>{event.winner_name||'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>{depthLabel}</span>{event.source_url?<a href={event.source_url} target="_blank" rel="noreferrer" style={{color:'inherit',textDecoration:'none'}}><strong>{sourceLabel(event.source_url,year)} →</strong></a>:<strong>{sourceLabel(null,year)}</strong>}</div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Laps</span></div>
                {rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span>{row.starting_position??'—'}</span><strong>{row.driver_slug?<Link href={'/drivers/'+row.driver_slug} style={{color:'inherit'}}>{row.driver_name}</Link>:row.driver_name}</strong><span>{row.car_number??'—'}</span><span>{row.laps??'—'}</span></div>)}
              </div>
            </div>
          </article>
        })}</div>}
      </section>

      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/illiana-speedway-in" className={styles.footerLink}>Illiana Motor Speedway<span>Open original home →</span></Link><Link href="/tracks/grundy-county-speedway-il" className={styles.footerLink}>Grundy County Speedway<span>Open current home →</span></Link></div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
