import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 43200

type SeasonRow = {
  id: number
  year: number
  season_name: string | null
  races: number | null
}

type ResultRow = {
  id: number
  finishing_position: number | null
  driver_name: string
  driver_slug: string | null
  result_section: string | null
}

type EventRow = {
  id: number
  season_id: number | null
  race_number: number | null
  race_date: string | null
  track_name: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: ResultRow[]
}

function fmtDate(value: string | null) {
  if (!value) return 'Date not yet recovered'
  const [y,m,d] = value.split('-')
  return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function divisionName(trackName: string | null) {
  if (!trackName) return 'Feature'
  return trackName.replace('North Central Speedway — ', '')
}

function sourceLabel(url: string | null) {
  if (!url) return 'Museum research source'
  if (url.includes('ascsracing.com') || url.includes('motorsport.com')) return 'ASCS'
  if (url.includes('tjslideways.com') || url.includes('hoseheadforums.com')) return 'UMSS race report'
  if (url.includes('thethirdturn.com')) return 'The Third Turn'
  if (url.includes('imca.com')) return 'IMCA'
  if (url.includes('racencs.net')) return 'North Central Speedway'
  if (url.includes('xxxraceco.com')) return 'Sprint-car archive'
  return 'Race source'
}

export default async function MightyAxeNationalsPage() {
  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('id')
    .eq('slug','mighty-axe-nationals')
    .maybeSingle()

  if (seriesError || !series) {
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Mighty Axe Nationals archive.</div></div></main>
  }

  const [{data:seasonData},{data:eventData,error:eventError},{data:heroRows}] = await Promise.all([
    supabase
      .from('SeriesSeasons')
      .select('id,year,season_name,races')
      .eq('series_id',series.id)
      .order('year',{ascending:false}),
    supabase
      .from('SeriesEvents')
      .select('id,season_id,race_number,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,driver_name,driver_slug,result_section)')
      .eq('series_id',series.id)
      .order('race_date',{ascending:false})
      .order('race_number',{ascending:true}),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug','north-central-speedway-mn')
      .eq('photo_rank',1),
  ])

  const seasons=(seasonData||[]) as SeasonRow[]
  const events=(eventData||[]) as EventRow[]
  const hero=(heroRows||[])[0]?.image_url||''
  const eventsBySeason=new Map<number,EventRow[]>()
  for (const event of events) {
    if (!event.season_id) continue
    const list=eventsBySeason.get(event.season_id)||[]
    list.push(event)
    eventsBySeason.set(event.season_id,list)
  }

  const resultCount=events.reduce((n,e)=>n+e.SeriesEventResults.length,0)
  const differentWinners=new Set(events.map(e=>e.winner_name).filter(Boolean)).size
  const coveredYears=seasons.filter(s=>(eventsBySeason.get(s.id)||[]).length>0).length
  const divisions=new Set(events.map(e=>divisionName(e.track_name).replace(/ — Feature \d+$/,'')))

  return <main className={styles.page}>
    <section className={styles.hero}>
      {hero ? <img src={hero} alt="Mighty Axe Nationals at North Central Speedway" className={styles.heroImage}/> : null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Mighty Axe Nationals</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Mighty Axe Nationals</h1>
        <p className={styles.tagline}>North Central Speedway • Brainerd, Minnesota • 2002–present</p>
        <p className={styles.intro}>North Central Speedway's Labor Day weekend tradition began in 2002 and has grown into a two-night, multi-division dirt-track festival where class winners take home one of Upper Midwest racing's most distinctive trophies: the Mighty Axe. Sprint cars, touring Modifieds, WISSOTA and IMCA divisions, and North Central weekly classes have all been part of the event's evolving history.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/north-central-speedway-mn" className={styles.button}>Open North Central Speedway Archive</Link>
          <Link href="#history" className={styles.buttonGhost}>Event History</Link>
          <Link href="#archive" className={styles.buttonGhost}>Year-by-Year Archive</Link>
          <a href="https://www.racencs.net/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>North Central Speedway</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Annual Editions" value={String(seasons.length)}/>
          <Stat label="Feature Records" value={events.length.toLocaleString('en-US')}/>
          <Stat label="Preserved Result Rows" value={resultCount.toLocaleString('en-US')}/>
          <Stat label="Recorded Winners" value={String(differentWinners)}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The Tradition • 2002</div>
            <strong>Twenty-five annual editions now point cleanly back to a 2002 beginning.</strong>
            <p>The 2012 event was advertised as the 11th annual, 2014 as the 13th, 2023 as the 22nd, and 2026 as the 25th. Together those independent annual counts establish the modern Mighty Axe lineage without requiring a guessed start date.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The Axe Trophy</div>
            <strong>This is a multi-division event, so there is no single “Mighty Axe champion” each year.</strong>
            <p>Feature winners across the weekend's participating classes earn Axe trophies. The museum therefore preserves each class and night as its own race record, then groups them under one annual Mighty Axe edition.</p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="history">
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>How the Mighty Axe Evolved</h2><div className={styles.sectionNote}>The common thread is Labor Day weekend at North Central; the class mix has changed substantially over 25 years.</div></div>
        <div className={styles.eraGrid}>
          <Era years="2002–2005" title="The early Axe years" note="The annual lineage is secure, but detailed local-class finishing orders from the first four editions remain the largest research gap in the archive."/>
          <Era years="2006–2008" title="ASCS Northern Plains era" note="The Mighty Axe became a two-night ASCS Northern Plains sprint-car destination. Curt Lund, Dustin Lindquist, Jerry Richert Jr., Lee Grosz, Joseph Kouba and Eric Lutz are among the preserved winners."/>
          <Era years="2009–2014" title="UMSS and touring Modifieds" note="UMSS sprint cars became a major part of the weekend, while the Advantage RV Modified Tour added another traveling-series layer. Brooke Tatnell swept the 2011 sprint weekend; Chris Graf's 2012 opener became official after Scotty Thiel failed post-race weight."/>
          <Era years="2015–2019" title="Transition to the modern format" note="The event shifted toward the IMCA/WISSOTA and North Central weekly-division mix that defines today's Mighty Axe. These years remain a priority for additional class-by-class backfill."/>
          <Era years="2020–2025" title="Modern two-night festival" note="The museum archive now preserves both nights across Modifieds, Sport Mods/Midwest Mods, Super Stocks, Hobby Stocks, Mod Fours, four-cylinder classes and other divisions where results survive."/>
          <Era years="2026" title="25th Mighty Axe Nationals" note="The 25th edition drew more than 150 cars and featured eight classes across the Labor Day weekend, including both WISSOTA and IMCA Modified programs."/>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Sprint-Car Chapter</div>
            <strong>The Axe has a meaningful place in Minnesota sprint-car history.</strong>
            <p>ASCS Northern Plains brought complete programs to Brainerd in 2006–08. UMSS followed in the next era, producing memorable weekends including Brooke Tatnell's 2011 sweep and Ryan Bowers / Jerry Richert Jr. splitting the 2014 sprint features.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>2012 • Tech Decides the Axe</div>
            <strong>Chris Graf is the official opening-night sprint winner.</strong>
            <p>Scotty Thiel crossed the line first but weighed eight pounds light after the 25-lap feature. Graf was elevated to the official win, a ruling preserved in this archive rather than the apparent finish at the checkered flag.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Archive Coverage</div>
        <div className={styles.sectionHead}><h2>What Is Preserved Today</h2><div className={styles.sectionNote}>{coveredYears} of 25 editions currently contain at least one class/night race record; the remaining editions stay visible as research targets.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>{events.length}</div><div className={styles.eraValue}>Feature records</div><div className={styles.eraNote}>Each record represents a specific night and division, not an artificial overall champion.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>{resultCount}</div><div className={styles.eraValue}>Finishing-position rows</div><div className={styles.eraNote}>Modern years inherit surviving North Central Speedway result depth from the museum database.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>{divisions.size}</div><div className={styles.eraValue}>Division labels represented</div><div className={styles.eraNote}>The archive spans sprint cars, touring Modifieds and numerous WISSOTA / IMCA / local divisions.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2002–05</div><div className={styles.eraValue}>Primary enrichment gap</div><div className={styles.eraNote}>The editions are confirmed; local feature winners and deeper fields still need to be recovered.</div></div>
        </div>
      </section>

      <section className={styles.section} id="archive">
        <div className={styles.kicker}>Year-by-Year Archive</div>
        <div className={styles.sectionHead}><h2>All 25 Mighty Axe Editions</h2><div className={styles.sectionNote}>Years without class records remain in the chronology so future research can be added without changing the event structure.</div></div>

        {eventError ? <div className={styles.empty}>Unable to load the live Mighty Axe race archive.</div> :
        <div className={styles.eventStack}>
          {seasons.map(season=>{
            const yearEvents=[...(eventsBySeason.get(season.id)||[])].sort((a,b)=>{
              const ad=a.race_date||''
              const bd=b.race_date||''
              return ad.localeCompare(bd)||(a.race_number||0)-(b.race_number||0)
            })
            return <article key={season.id} className={styles.eventCard}>
              <div className={styles.eventHeader}>
                <div>
                  <div className={styles.eventYear}>{season.year} • {season.season_name}</div>
                  <div className={styles.eventDate}>{yearEvents.length ? yearEvents.length+' preserved feature record'+(yearEvents.length===1?'':'s') : 'Edition confirmed • class results still being researched'}</div>
                </div>
                <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Archive Status</span><strong className={styles.winnerName}>{yearEvents.length ? 'Results preserved' : 'Enrichment needed'}</strong></div>
              </div>

              {yearEvents.length ? <div className={styles.panelBody}>
                <div className={styles.compactHeader}><span>Night</span><span>Date</span><span>Division</span><span>Winner</span><span>Depth</span></div>
                {yearEvents.map((event,index)=>{
                  const rows=[...event.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
                  const winnerRow=rows.find(r=>r.finishing_position===1)
                  return <div key={event.id} className={styles.compactRow}>
                    <strong>{index+1}</strong>
                    <span>{fmtDate(event.race_date).replace(', '+season.year,'')}</span>
                    <span>{divisionName(event.track_name)}</span>
                    <strong>{winnerRow?.driver_slug ? <Link href={'/drivers/'+winnerRow.driver_slug} style={{color:'inherit'}}>{event.winner_name}</Link> : event.winner_name}</strong>
                    <span>{rows.length} {rows.length===1?'row':'rows'}</span>
                  </div>
                })}
                {yearEvents.some(e=>e.source_url) ? <div className={styles.winnerBar}>
                  <span>Source examples</span>
                  <span>{[...new Map(yearEvents.filter(e=>e.source_url).map(e=>[e.source_url,e])).values()].slice(0,3).map((e,i)=><span key={e.id}>{i?' • ':''}<a href={e.source_url!} target="_blank" rel="noreferrer" style={{color:'inherit'}}>{sourceLabel(e.source_url)}</a></span>)}</span>
                </div> : null}
              </div> : null}
            </article>
          })}
        </div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Research Note</div>
          <strong>This archive is intentionally built to grow backward.</strong>
          <p>The 25-edition chronology is established, while class-by-class results are strongest from the sprint/touring era forward and especially deep from 2020 onward. As early North Central programs, local newspaper reports or archived results are recovered, they can be added directly beneath the correct year without changing the page structure.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/north-central-speedway-mn" className={styles.footerLink}>North Central Speedway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue museum research →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}

function Era({years,title,note}:{years:string;title:string;note:string}) {
  return <div className={styles.eraCard}><div className={styles.eraYear}>{years}</div><div className={styles.eraValue}>{title}</div><div className={styles.eraNote}>{note}</div></div>
}
