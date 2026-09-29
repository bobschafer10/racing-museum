import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type SeasonRow = {
  id:number
  year:number
  champion_name:string|null
}

type ResultRow = {
  id:number
  finishing_position:number|null
  starting_position:string|null
  car_number:string|null
  driver_name:string
  driver_slug:string|null
}

type EventRow = {
  id:number
  season_id:number|null
  race_number:number|null
  race_date:string|null
  track_name:string|null
  winner_name:string|null
  source_url:string|null
  SeriesEventResults:ResultRow[]
}

function formatNumber(value:number){return value.toLocaleString('en-US')}

function formatDate(value:string|null){
  if(!value)return''
  const [y,m,d]=value.split('-')
  return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
}

function ordinal(n:number){
  const mod100=n%100
  if(mod100>=11&&mod100<=13)return n+'th'
  const mod10=n%10
  if(mod10===1)return n+'st'
  if(mod10===2)return n+'nd'
  if(mod10===3)return n+'rd'
  return n+'th'
}

function sourceLabel(url:string|null){
  if(!url)return'Museum research source'
  if(url.includes('usmts.com'))return'USMTS'
  if(url.includes('deercreekspeedway.com'))return'Deer Creek Speedway'
  if(url.includes('racinboys.com'))return'RacinBoys'
  if(url.includes('speedsport.com'))return'SPEED SPORT'
  if(url.includes('jacksoncountypilot.com'))return'Jackson County Pilot'\n  if(url.includes('thethirdturn.com'))return'The Third Turn'
  return'Race report'
}

export default async function FallJamboreePage(){
  const {data:series,error:seriesError}=await supabase
    .from('Series')
    .select('id')
    .eq('slug','fall-jamboree')
    .maybeSingle()

  if(seriesError||!series){
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Fall Jamboree archive.</div></div></main>
  }

  const [{data:seasonData},{data:eventData,error:eventError},{data:heroRows}]=await Promise.all([
    supabase.from('SeriesSeasons')
      .select('id,year,champion_name')
      .eq('series_id',series.id)
      .order('year',{ascending:false}),
    supabase.from('SeriesEvents')
      .select('id,season_id,race_number,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug)')
      .eq('series_id',series.id)
      .order('race_date',{ascending:false}),
    supabase.from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug','deer-creek-speedway-mn')
      .eq('photo_rank',1),
  ])

  const seasons=(seasonData||[]) as SeasonRow[]
  const events=(eventData||[]) as EventRow[]
  const yearBySeason=new Map(seasons.map(row=>[row.id,row.year]))
  const heroSrc=(heroRows||[])[0]?.image_url||''
  const completed=seasons.filter(row=>row.champion_name)
  const distinctChampions=new Set(completed.map(row=>row.champion_name)).size
  const resultCount=events.reduce((sum,event)=>sum+event.SeriesEventResults.length,0)

  const champCounts=new Map<string,number>()
  for(const season of completed){
    if(!season.champion_name)continue
    champCounts.set(season.champion_name,(champCounts.get(season.champion_name)||0)+1)
  }
  const repeatChampions=[...champCounts.entries()]
    .filter(([,wins])=>wins>1)
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))

  const orderedEvents=[...events].sort((a,b)=>{
    const ay=yearBySeason.get(a.season_id||0)||0
    const by=yearBySeason.get(b.season_id||0)||0
    return by-ay||(b.race_number||0)-(a.race_number||0)
  })

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc?<img src={heroSrc} alt="Fall Jamboree at Deer Creek Speedway" className={styles.heroImage}/>:null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Fall Jamboree</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Featherlite Fall Jamboree</h1>
        <p className={styles.tagline}>USMTS Modified Crown Jewel • 1999–2026</p>
        <p className={styles.intro}>The Fall Jamboree began at Hamilton County Speedway in Webster City, Iowa, in 1999 and moved to Deer Creek Speedway in Spring Valley, Minnesota, in 2002. It has grown into one of the defining multi-night dirt modified weekends in the Upper Midwest and one of the longest-running traditions in USMTS history.</p>
        <div className={styles.heroActions}><Link href="/tracks/deer-creek-speedway-mn" className={styles.button}>Open Deer Creek Archive</Link><a href="https://www.usmts.com/press/2023/article/140561" target="_blank" rel="noreferrer" className={styles.buttonGhost}>USMTS Event History</a><Link href="#champions" className={styles.buttonGhost}>Champions 1999–2026</Link></div>
        <div className={styles.stats}><Stat label="Annual Editions" value={String(seasons.length)}/><Stat label="Completed Championships" value={String(completed.length)}/><Stat label="Different Champions" value={String(distinctChampions)}/><Stat label="Recovered Result Rows" value={formatNumber(resultCount)}/></div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Why It Belongs in Special Events</div>
            <strong>A true event lineage, not simply another USMTS race date.</strong>
            <p>The Fall Jamboree is an annual championship weekend with its own title history, changing multi-night formats, non-qualifier races and support divisions. The headline championship lineage runs continuously from 1999 through the 28th annual edition in 2026. The first three editions were staged at Hamilton County Speedway; Deer Creek has been the event&apos;s home since 2002.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The 2023 Weather Story</div>
            <strong>The 25th annual Jamboree was started, but never completed.</strong>
            <p>Rodney Sanders won Thursday&apos;s opening feature on September 21, 2023. Weather wiped out the remaining two nights. A planned April 26–27, 2024 &quot;Fall Jamboree-do&quot; makeup was then canceled because of rain and cold and was not rescheduled. The museum therefore preserves 2023 as the 25th annual edition with no championship winner.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Multiple-Time Champions</div>
        <div className={styles.sectionHead}><h2>The Drivers Who Repeated</h2><div className={styles.sectionNote}>Championship/finale winners, not every preliminary-night feature winner.</div></div>
        <div className={styles.eraGrid}>
          {repeatChampions.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} titles</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>Fall Jamboree championships through 2026</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="champions">
        <div className={styles.kicker}>Championship Lineage</div>
        <div className={styles.sectionHead}><h2>1999–2026 Fall Jamboree Champions</h2><div className={styles.sectionNote}>1999–2001 at Hamilton County Speedway; 2002–2026 at Deer Creek Speedway. The 2023 edition remained unfinished.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map(season=>{
            const edition=season.year-1998
            const venue=season.year<=2001?'Hamilton County Speedway':'Deer Creek Speedway'
            return <div key={season.id} className={styles.eraCard}>
              <div className={styles.eraYear}>{season.year} • {ordinal(edition)}</div>
              <div className={styles.eraValue}>{season.champion_name||'No champion — weather'}</div>
              <div className={styles.eraNote}>{venue}</div>
            </div>
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Recovered Full Fields</div>
        <div className={styles.sectionHead}><h2>Recent Jamboree USMTS Features</h2><div className={styles.sectionNote}>Every completed USMTS A-main from the weather-shortened 2023 edition through the 2026 weekend is preserved here. Historical full-field recovery remains an enrichment project.</div></div>
        {eventError?<div className={styles.empty}>Unable to load the live Fall Jamboree result archive.</div>:
        <div className={styles.eventStack}>{orderedEvents.map(event=>{
          const year=yearBySeason.get(event.season_id||0)
          const rows=[...event.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year||'Year unknown'} • {event.race_number===99?'Championship Feature':'Night '+(event.race_number||'—')}</div><div className={styles.eventDate}>{formatDate(event.race_date)} • Deer Creek Speedway</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Winner</span><strong className={styles.winnerName}>{event.winner_name||'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>Complete Published A-Main • {rows.length} cars</span>{event.source_url?<a href={event.source_url} target="_blank" rel="noreferrer" style={{color:'inherit',textDecoration:'none'}}><strong>{sourceLabel(event.source_url)} →</strong></a>:<strong>{sourceLabel(null)}</strong>}</div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Source</span></div>
                {rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span>{row.starting_position??'—'}</span><strong>{row.driver_slug?<Link href={'/drivers/'+row.driver_slug} style={{color:'inherit'}}>{row.driver_name}</Link>:row.driver_name}</strong><span>{row.car_number??'—'}</span><span>{sourceLabel(event.source_url)}</span></div>)}
              </div>
            </div>
          </article>
        })}</div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>Championship history is complete; race-by-race enrichment can go much deeper.</strong>
          <p>The museum now has the authoritative championship winner chronology for all 28 annual editions, the exact 2023 cancellation/makeup history, and 232 full-field USMTS finishing positions covering every completed Jamboree feature from 2023 through 2026. Earlier editions can be expanded next with full finishing orders, preliminary-night winners, Non-Qualifier results and the changing USRA support divisions.</p>
        </div>
      </section>

      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/deer-creek-speedway-mn" className={styles.footerLink}>Deer Creek Speedway<span>Open track archive →</span></Link><Link href="/series/united-states-modified-touring-series" className={styles.footerLink}>USMTS<span>Open series archive →</span></Link></div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
