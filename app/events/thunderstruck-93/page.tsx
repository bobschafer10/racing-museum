import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type SeasonRow = { id:number; year:number; season_name:string|null; champion_name:string|null }
type ResultRow = { id:number; finishing_position:number|null; starting_position:string|null; car_number:string|null; driver_name:string; driver_slug:string|null; status:string|null }
type EventRow = { id:number; season_id:number|null; race_number:number|null; race_date:string|null; track_name:string|null; winner_name:string|null; source_url:string|null; SeriesEventResults:ResultRow[] }

function formatNumber(value:number) { return value.toLocaleString('en-US') }
function formatDate(value:string|null) {
  if (!value) return 'Date not yet recovered'
  const [y,m,d] = value.split('-')
  return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
}
function sourceLabel(url:string|null) {
  if (!url) return 'Museum research source'
  if (url.includes('big8latemodels.com')) return 'Big 8 Late Model Series'
  if (url.includes('starsnationaltour.com')) return 'ASA / STARS'
  if (url.includes('elkospeedway.com')) return 'Elko Speedway'
  if (url.includes('thethirdturn.com')) return 'The Third Turn'
  if (url.includes('racefansradio')) return 'Speed Talk'
  return 'Race source'
}
function noWinnerLabel(year:number) { return year >= 2020 && year <= 2023 ? 'Not held' : 'No winner recorded' }

export default async function Thunderstruck93Page() {
  const { data:series, error:seriesError } = await supabase.from('Series').select('id').eq('slug','thunderstruck-93').maybeSingle()
  if (seriesError || !series) return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Thunderstruck 93 archive.</div></div></main>

  const [{data:seasonData},{data:eventData,error:eventError},{data:heroRows}] = await Promise.all([
    supabase.from('SeriesSeasons').select('id,year,season_name,champion_name').eq('series_id',series.id).order('year',{ascending:false}),
    supabase.from('SeriesEvents').select('id,season_id,race_number,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug,status)').eq('series_id',series.id).order('race_date',{ascending:false}),
    supabase.from('track_hero_photo_variants_view').select('slug,image_url').eq('slug','elko-speedway-mn').eq('photo_rank',1),
  ])

  const seasons=(seasonData||[]) as SeasonRow[]
  const events=(eventData||[]) as EventRow[]
  const yearBySeason=new Map(seasons.map(r=>[r.id,r.year]))
  const heroSrc=(heroRows||[])[0]?.image_url||''
  const completed=seasons.filter(r=>r.champion_name)
  const distinctWinners=new Set(completed.map(r=>r.champion_name)).size
  const resultCount=events.reduce((sum,e)=>sum+e.SeriesEventResults.length,0)

  const winnerCounts=new Map<string,number>()
  for (const s of completed) if (s.champion_name) winnerCounts.set(s.champion_name,(winnerCounts.get(s.champion_name)||0)+1)
  const repeats=[...winnerCounts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  const ordered=[...events].sort((a,b)=>(yearBySeason.get(b.season_id||0)||0)-(yearBySeason.get(a.season_id||0)||0))

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc ? <img src={heroSrc} alt="Thunderstruck 93 at Elko Speedway" className={styles.heroImage}/> : null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Thunderstruck 93</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Thunderstruck 93</h1>
        <p className={styles.tagline}>In Memory of Dan Ryan Sr. • Elko Speedway • 2009–2019; 2024–present</p>
        <p className={styles.intro}>Thunderstruck 93 was created at Elko Speedway in 2009 to honor longtime racer and track champion Dan Ryan Sr., who raced the No. 93 and died after battling ALS. The memorial became one of Minnesota asphalt racing's signature late model events, combining elite regional competition with fundraising for A Race Worth Winning and the fight against ALS.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/elko-speedway-mn" className={styles.button}>Open Elko Speedway Archive</Link>
          <Link href="#winners" className={styles.buttonGhost}>Winner Chronology</Link>
          <Link href="#results" className={styles.buttonGhost}>Preserved Results</Link>
          <a href="https://starsnationaltour.com/arcamt-thunderstruck-93-at-elko-speedwaymore-than-just-a-race/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Event History</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Completed Editions" value={String(completed.length)}/>
          <Stat label="Different Winners" value={String(distinctWinners)}/>
          <Stat label="Race Records" value={String(events.length)}/>
          <Stat label="Preserved Result Rows" value={formatNumber(resultCount)}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Why 93?</div>
            <strong>The number belongs to Dan Ryan.</strong>
            <p>Ryan raced the No. 93 at Elko Speedway. The memorial race adopted that number as its identity, even in years when the headline feature ran 125 laps rather than 93.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The Guitar Trophy</div>
            <strong>Thunderstruck's signature trophy is tied to another part of Ryan's racing story.</strong>
            <p>Ryan enjoyed racing in Nashville, and the event adopted an electric-guitar trophy in the same spirit as Nashville's best-known racing prizes. Winning Thunderstruck means taking home one of the most recognizable trophies in Upper Midwest short-track racing.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>The Memorial</div>
        <div className={styles.sectionHead}><h2>A Race Worth Winning</h2><div className={styles.sectionNote}>Thunderstruck was built to preserve Dan Ryan's memory while raising awareness and money in the fight against ALS.</div></div>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Dan Ryan Sr. • 2009</div>
          <strong>The event began the same year Ryan died after his battle with ALS.</strong>
          <p>Contemporary Thunderstruck material describes Ryan through competition, family, faith and hard work, and frames the race as a celebration of the way he approached life. The memorial program has long supported A Race Worth Winning and ALS awareness.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>From the Inaugural 93 to the Modern Revival</h2><div className={styles.sectionNote}>The event changed sanction and race distance over time, while the Dan Ryan memorial identity remained constant.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>2009</div><div className={styles.eraValue}>The inaugural Thunderstruck</div><div className={styles.eraNote}>Jacob Goede won the first running and later returned to win the 11th edition in 2019.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2010–2012</div><div className={styles.eraValue}>Fredrickson three-peat</div><div className={styles.eraNote}>Dan Fredrickson won three consecutive Thunderstruck events, establishing the dominant record in the race's early history.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2013–2017</div><div className={styles.eraValue}>Midwest Tour showcase</div><div className={styles.eraNote}>Andrew Morrissey, Ty Majeski and Dalton Zehr joined Fredrickson among the winners as the event became a major regional Super Late Model date.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2018–2019</div><div className={styles.eraValue}>Big 8 93-lap era</div><div className={styles.eraNote}>Owen Giles won in 2018 and Jacob Goede won a true 93-lap Big 8 feature in 2019.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2020–2023</div><div className={styles.eraValue}>Four-year hiatus</div><div className={styles.eraNote}>Thunderstruck was not held during these four seasons. Elko revived the memorial as its 12th running in 2024.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2024–2025</div><div className={styles.eraValue}>ASA / STARS revival</div><div className={styles.eraNote}>Justin Mondeik won the 125-lap return in 2024; Ty Fredrickson followed in 2025, adding the Fredrickson family name to another generation of Thunderstruck history.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2026</div><div className={styles.eraValue}>Back to 93 laps</div><div className={styles.eraNote}>Randy Sargent won the 14th edition in his first visit to Elko, topping a 33-car NASCAR Late Model field in a true 93-lap feature.</div></div>
        </div>
      </section>

      {repeats.length>0 && <section className={styles.section}>
        <div className={styles.kicker}>Repeat Winners</div>
        <div className={styles.sectionHead}><h2>The Drivers Who Own Thunderstruck History</h2><div className={styles.sectionNote}>Dan Fredrickson's five victories remain the defining performance record.</div></div>
        <div className={styles.eraGrid}>
          {repeats.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{seasons.filter(s=>s.champion_name===name).map(s=>s.year).sort((a,b)=>a-b).join(' • ')}</div></div>)}
        </div>
      </section>}

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Winner Lineage</div>
        <div className={styles.sectionHead}><h2>Thunderstruck 93 Winners by Year</h2><div className={styles.sectionNote}>Official lineage from the 2009 inaugural through the 14th running in 2026, with the 2020–2023 hiatus shown explicitly.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map(s=><div key={s.id} className={styles.eraCard}><div className={styles.eraYear}>{s.year}</div><div className={styles.eraValue}>{s.champion_name||noWinnerLabel(s.year)}</div><div className={styles.eraNote}>{s.season_name||''}</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="results">
        <div className={styles.kicker}>Preserved Race Results</div>
        <div className={styles.sectionHead}><h2>Thunderstruck Finishing Orders</h2><div className={styles.sectionNote}>Verified ASA Midwest Tour and Big 8 fields are inherited directly. The 2019 Big 8 field is complete; the current 2026 Elko recap supplies the top six while deeper results remain open for enrichment.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live Thunderstruck result archive.</div> :
        <div className={styles.eventStack}>{ordered.map(event=>{
          const year=yearBySeason.get(event.season_id||0)
          const rows=[...event.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year||'Year unknown'} • Thunderstruck 93</div><div className={styles.eventDate}>{formatDate(event.race_date)} • {event.track_name||'Elko Speedway'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Winner</span><strong className={styles.winnerName}>{event.winner_name||'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>Preserved result depth • {rows.length} {rows.length===1?'row':'rows'}</span>{event.source_url?<a href={event.source_url} target="_blank" rel="noreferrer" style={{color:'inherit',textDecoration:'none'}}><strong>{sourceLabel(event.source_url)} →</strong></a>:<strong>{sourceLabel(null)}</strong>}</div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Status</span></div>
                {rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span>{row.starting_position??'—'}</span><strong>{row.driver_slug?<Link href={'/drivers/'+row.driver_slug} style={{color:'inherit'}}>{row.driver_name}</Link>:row.driver_name}</strong><span>{row.car_number??'—'}</span><span>{row.status||'—'}</span></div>)}
              </div>
            </div>
          </article>
        })}</div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>Thunderstruck 93 now has its own museum event family rather than being scattered across Midwest Tour, Big 8 and weekly Elko records.</strong>
          <p>The collection preserves all 14 completed editions, the four-year hiatus, 171 finishing-position rows, the complete 2019 Big 8 field, deep inherited Midwest Tour fields from the modern era, and the verified 2026 top six. The unrelated 2009 Elko ASA record was intentionally excluded from this event archive.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/elko-speedway-mn" className={styles.footerLink}>Elko Speedway<span>Open track archive →</span></Link>
        <Link href="/series/asa-midwest-tour" className={styles.footerLink}>ASA Midwest Tour<span>Open series archive →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
