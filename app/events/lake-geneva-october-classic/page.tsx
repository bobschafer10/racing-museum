import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type SeasonRow = { id:number; year:number; season_name:string|null; champion_name:string|null }
type ResultRow = { id:number; finishing_position:number|null; starting_position:string|null; car_number:string|null; driver_name:string; driver_slug:string|null; status:string|null }
type EventRow = { id:number; season_id:number|null; race_date:string|null; track_name:string|null; winner_name:string|null; source_url:string|null; SeriesEventResults:ResultRow[] }

function fmtDate(v:string|null) {
  if (!v) return 'Date not recovered'
  const [y,m,d]=v.split('-')
  return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
}
function sourceLabel(url:string|null) {
  if (!url) return 'Museum results archive'
  if (url.includes('/newspapers/midwest-racing-news/')) return 'Midwest Racing News'
  return 'Race source'
}

export default async function LakeGenevaOctoberClassicPage() {
  const {data:series,error:seriesError}=await supabase.from('Series').select('id').eq('slug','lake-geneva-october-classic').maybeSingle()
  if (seriesError||!series) return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Lake Geneva October Classic archive.</div></div></main>

  const [{data:seasonData},{data:eventData,error:eventError},{data:heroRows}] = await Promise.all([
    supabase.from('SeriesSeasons').select('id,year,season_name,champion_name').eq('series_id',series.id).order('year',{ascending:false}),
    supabase.from('SeriesEvents').select('id,season_id,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug,status)').eq('series_id',series.id).order('race_date',{ascending:false}),
    supabase.from('track_hero_photo_variants_view').select('slug,image_url').eq('slug','lake-geneva-raceway-wi').eq('photo_rank',1),
  ])

  const seasons=(seasonData||[]) as SeasonRow[]
  const events=(eventData||[]) as EventRow[]
  const yearBySeason=new Map(seasons.map(s=>[s.id,s.year]))
  const hero=(heroRows||[])[0]?.image_url||''
  const completed=seasons.filter(s=>s.champion_name)
  const resultCount=events.reduce((n,e)=>n+e.SeriesEventResults.length,0)
  const distinctWinners=new Set(completed.map(s=>s.champion_name)).size
  const counts=new Map<string,number>()
  completed.forEach(s=>{ if(s.champion_name) counts.set(s.champion_name,(counts.get(s.champion_name)||0)+1) })
  const repeats=[...counts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1])
  const ordered=[...events].sort((a,b)=>(yearBySeason.get(b.season_id||0)||0)-(yearBySeason.get(a.season_id||0)||0))

  return <main className={styles.page}>
    <section className={styles.hero}>
      {hero ? <img src={hero} alt="Lake Geneva Raceway October Classic" className={styles.heroImage}/> : null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Lake Geneva October Classic</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>October Classic / Fall Classic</h1>
        <p className={styles.tagline}>Lake Geneva Raceway • Lake Geneva, Wisconsin • 1992–2006</p>
        <p className={styles.intro}>Lake Geneva Raceway launched the October Classic in 1992 as a sprawling end-of-season stock-car weekend. Over fifteen scheduled editions it grew into a multi-division fall gathering that routinely drew massive fields, before becoming the Fall Classic and finally the Final Fall Classic during the speedway's closing season in 2006.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/lake-geneva-raceway-wi" className={styles.button}>Open Lake Geneva Raceway Archive</Link>
          <Link href="#winners" className={styles.buttonGhost}>Headline Winners</Link>
          <Link href="#results" className={styles.buttonGhost}>Preserved Results</Link>
        </div>
        <div className={styles.stats}>
          <Stat label="Scheduled Editions" value="15"/>
          <Stat label="Completed Headliners" value={String(completed.length)}/>
          <Stat label="Different Winners" value={String(distinctWinners)}/>
          <Stat label="Preserved Result Rows" value={resultCount.toLocaleString('en-US')}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The Beginning • 1992</div>
            <strong>Midwest Racing News explicitly advertised the inaugural weekend as the “1st October Classic.”</strong>
            <p>Jerry Wood led all 50 laps of the Super Late Model feature to headline the first edition. Wayne Dukas won the Late Model feature, while Roy Aitchison, Brian Lambie, Eric Dawson and others added to the multi-division weekend.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>A True Multi-Division Classic</div>
            <strong>The headline Late Model race was only part of the attraction.</strong>
            <p>Across the years the Classic included Super Late Models, local Late Models, Mid-American cars, modifieds, street stocks, sport trucks, small cars, Big 8 Late Models and other divisions. Some editions approached or exceeded 300 entries.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>From October Classic to Final Fall Classic</h2><div className={styles.sectionNote}>The event's name and supporting divisions evolved, but its role as Lake Geneva's major fall gathering remained constant.</div></div>
        <div className={styles.eraGrid}>
          <Era years="1992–1994" title="The new fall tradition" note="Jerry Wood, Conrad Morgan and Terry Baldry won the first three headline 50-lap Super Late Model features."/>
          <Era years="1995–1998" title="O'Doul's October Classic" note="Al Schill Sr., Scott Poritz, Al Schill Jr. and Randy Rodgers headlined the mid-1990s editions."/>
          <Era years="1999" title="Weather wins" note="The ninth scheduled Classic lost its Sunday headline program to rain and snow. It was not rescheduled, so no headline winner is assigned."/>
          <Era years="2000–2004" title="The tradition continues" note="Jeff Storm, Al Schill Sr., Bill Skinner, Erik Darnell and Jamie Wallace carried the headline winner lineage into the new century."/>
          <Era years="2005" title="Fall Classic era" note="The weekend mixed local Late Models with Big 8 and Mid-American racing; Matt Kocourek is preserved as the primary Late Model winner."/>
          <Era years="2006" title="The Final Fall Classic" note="Rich Bickle Jr. won the 75-lap Super Late Model feature during Lake Geneva Raceway's Checkered Flag Season, while Michael Bilderback won the final Big 8 event."/>
        </div>
      </section>

      {repeats.length>0 && <section className={styles.section}>
        <div className={styles.kicker}>Repeat Headline Winners</div>
        <div className={styles.sectionHead}><h2>Drivers Who Won More Than Once</h2><div className={styles.sectionNote}>The official headline lineage is remarkably varied.</div></div>
        <div className={styles.eraGrid}>
          {repeats.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{seasons.filter(s=>s.champion_name===name).map(s=>s.year).sort((a,b)=>a-b).join(' • ')}</div></div>)}
        </div>
      </section>}

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Headline Winner Lineage</div>
        <div className={styles.sectionHead}><h2>October / Fall Classic Winners by Year</h2><div className={styles.sectionNote}>Primary Super Late Model / Late Model headliner. The 1999 Sunday program was cancelled by rain and snow.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map(s=><div key={s.id} className={styles.eraCard}><div className={styles.eraYear}>{s.year}</div><div className={styles.eraValue}>{s.champion_name||'No Sunday headline feature'}</div><div className={styles.eraNote}>{s.season_name||''}</div></div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>1999 Weather Note</div>
          <strong>The event happened, but the headline Sunday race did not.</strong>
          <p>Midwest Racing News reported that the Sunday portion of the O'Doul's October Classic was cancelled by rain and snow and was not rescheduled. Friday and Saturday activity remains part of the 1999 edition, but the museum does not manufacture a headline winner for that year.</p>
        </div>
      </section>

      <section className={styles.section} id="results">
        <div className={styles.kicker}>Preserved Headline Results</div>
        <div className={styles.sectionHead}><h2>Surviving Finishing Orders</h2><div className={styles.sectionNote}>Result depth varies by edition. Existing Lake Geneva database rows are retained and contemporary MRN reports extend several years to the top five.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live October Classic results.</div> :
        <div className={styles.eventStack}>{ordered.map(e=>{
          const year=yearBySeason.get(e.season_id||0)
          const rows=[...e.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
          return <article key={e.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year} • October / Fall Classic</div><div className={styles.eventDate}>{fmtDate(e.race_date)} • {e.track_name}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Headline Winner</span><strong className={styles.winnerName}>{e.winner_name}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>Preserved result depth • {rows.length} {rows.length===1?'row':'rows'}</span>{e.source_url?<a href={e.source_url} target="_blank" rel="noreferrer" style={{color:'inherit',textDecoration:'none'}}><strong>{sourceLabel(e.source_url)} →</strong></a>:<strong>{sourceLabel(null)}</strong>}</div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Status</span></div>
                {rows.map(r=><div key={r.id} className={styles.compactRow}><strong>{r.finishing_position??'—'}</strong><span>{r.starting_position??'—'}</span><strong>{r.driver_slug?<Link href={'/drivers/'+r.driver_slug} style={{color:'inherit'}}>{r.driver_name}</Link>:r.driver_name}</strong><span>{r.car_number??'—'}</span><span>{r.status||'—'}</span></div>)}
              </div>
            </div>
          </article>
        })}</div>}
      </section>

      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>2005 • Broadening the Weekend</div>
            <strong>The Fall Classic had become more than a single headline class.</strong>
            <p>Matt Kocourek won the local Late Model feature, Rick Corso won the 58-lap Big 8 feature and John Senerchia captured the Mid-American race, illustrating how many regional racing traditions were packed into one weekend.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>2006 • Final Fall Classic</div>
            <strong>The final edition became part of the track's farewell.</strong>
            <p>Rich Bickle Jr. led the 75-lap Super Late Model feature flag-to-flag. Michael Bilderback won the final Big 8 event, Jeremy Spoonmore won Mid-American, Tim Bell won the modified feature and Tim Cox won the BOSS outlaw sprint race during one of Lake Geneva Raceway's last major weekends.</p>
          </div>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/lake-geneva-raceway-wi" className={styles.footerLink}>Lake Geneva Raceway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue research →</span></Link>
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
