import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type SeasonRow = { id:number; year:number; season_name:string|null; champion_name:string|null }
type ResultRow = { id:number; finishing_position:number|null; starting_position:string|null; car_number:string|null; driver_name:string; driver_slug:string|null; status:string|null }
type EventRow = { id:number; season_id:number|null; race_date:string|null; track_name:string|null; winner_name:string|null; source_url:string|null; SeriesEventResults:ResultRow[] }

function fmtDate(v:string|null) {
  if (!v) return 'Date not yet recovered'
  const [y,m,d]=v.split('-')
  return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
}
function sourceLabel(url:string|null) {
  if (!url) return 'Museum research source'
  if (url.includes('thethirdturn.com')) return 'The Third Turn'
  if (url.includes('starsnationaltour.com')) return 'ASA / STARS history'
  return 'Race source'
}

export default async function RockfordAllStar100Page() {
  const {data:series,error:seriesError}=await supabase.from('Series').select('id').eq('slug','rockford-all-star-100').maybeSingle()
  if (seriesError||!series) return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the All-Star 100 archive.</div></div></main>

  const [{data:seasonData},{data:eventData,error:eventError},{data:heroRows}] = await Promise.all([
    supabase.from('SeriesSeasons').select('id,year,season_name,champion_name').eq('series_id',series.id).order('year',{ascending:false}),
    supabase.from('SeriesEvents').select('id,season_id,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug,status)').eq('series_id',series.id).order('race_date',{ascending:false}),
    supabase.from('track_hero_photo_variants_view').select('slug,image_url').eq('slug','rockford-speedway-il').eq('photo_rank',1),
  ])

  const seasons=(seasonData||[]) as SeasonRow[]
  const events=(eventData||[]) as EventRow[]
  const yearBySeason=new Map(seasons.map(s=>[s.id,s.year]))
  const hero=(heroRows||[])[0]?.image_url||''
  const resultCount=events.reduce((n,e)=>n+e.SeriesEventResults.length,0)
  const distinctWinners=new Set(seasons.map(s=>s.champion_name).filter(Boolean)).size
  const counts=new Map<string,number>()
  seasons.forEach(s=>{ if(s.champion_name) counts.set(s.champion_name,(counts.get(s.champion_name)||0)+1) })
  const repeats=[...counts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  const ordered=[...events].sort((a,b)=>(yearBySeason.get(b.season_id||0)||0)-(yearBySeason.get(a.season_id||0)||0))

  return <main className={styles.page}>
    <section className={styles.hero}>
      {hero ? <img src={hero} alt="All-Star 100 at Rockford Speedway" className={styles.heroImage}/> : null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>All-Star 100</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>All-Star 100</h1>
        <p className={styles.tagline}>Rockford Speedway • Loves Park, Illinois • 1978–1992; 2007–2012; 2015–2019</p>
        <p className={styles.intro}>Rockford Speedway's All-Star 100 was born in 1978 as ARTGO's first event at the high-banked quarter-mile and the race that established the famous Tuesday Night Special formula: bring national stars into the Midwest on an off-night and turn them loose against the best short-track racers in the region.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/rockford-speedway-il" className={styles.button}>Open Rockford Speedway Archive</Link>
          <Link href="/series/artgo-challenge-series" className={styles.buttonGhost}>Open ARTGO Archive</Link>
          <Link href="#winners" className={styles.buttonGhost}>Winner Chronology</Link>
          <Link href="#results" className={styles.buttonGhost}>Preserved Results</Link>
          <a href="https://starsnationaltour.com/a-year-by-year-look-at-rockford-speedways-historic-all-star-100/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Year-by-Year History</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Completed Editions" value={String(seasons.length)}/>
          <Stat label="Different Winners" value={String(distinctWinners)}/>
          <Stat label="Race Records" value={String(events.length)}/>
          <Stat label="Preserved Result Rows" value={resultCount.toLocaleString('en-US')}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>July 11, 1978 • The First Tuesday Night Special</div>
            <strong>Dick Trickle won the race that started the tradition.</strong>
            <p>MRN reported that the 100-lap ARTGO special drew the largest stock-car crowd Rockford had seen in recent history. Trickle beat Rusty Wallace and NASCAR star Neil Bonnett, while Bobby Allison also joined the 22-car field.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The ARTGO Idea</div>
            <strong>The Tuesday date was the point.</strong>
            <p>John McKarns and Rockford promoters used a midweek race to make national drivers available without displacing their weekend commitments. The concept proved successful enough that similar Tuesday Night Specials spread to other Midwestern tracks.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>Three Distinct Chapters</h2><div className={styles.sectionNote}>The original ARTGO run remains the centerpiece, with two later revival eras preserved separately.</div></div>
        <div className={styles.eraGrid}>
          <Era years="1978–1992" title="The ARTGO era" note="Fifteen consecutive editions. Dick Trickle won four, Joe Shear won three, and Mark Martin, Bobby Allison, Dave Watson, Butch Miller, Rich Bickle and others added their names to the list."/>
          <Era years="1993–2006" title="Fourteen-year hiatus" note="The All-Star 100 disappeared from Rockford's schedule after ARTGO's final 1992 edition."/>
          <Era years="2007–2010" title="ASA Late Model revival" note="Eddie Hoffman, Trent Snyder, Ross Kenseth and Ryan Carlson won the revived race under the ASA Late Model banner."/>
          <Era years="2011–2012" title="JEGS/CRA and independent years" note="Erik Jones won in 2011. Michael Bilderback captured the only non-sanctioned All-Star 100 in 2012."/>
          <Era years="2013–2014" title="Two-year hiatus" note="The race disappeared again before the Midwest Tour brought it back."/>
          <Era years="2015–2019" title="ARCA Midwest Tour era" note="Ty Majeski won twice; Jeff Holtz, Austin Nason and Casey Johnson also captured the Rockford midsummer classic."/>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>National Star Power</div>
            <strong>The winners list reads like a short-track Hall of Fame.</strong>
            <p>Mark Martin won in 1979, Bobby Allison in 1984, and future national stars repeatedly used the race as a proving ground. Dale Earnhardt, Neil Bonnett, Rusty Wallace and others also appeared during the original ARTGO era.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Rockford's Crown-Jewel Trio</div>
            <strong>The All-Star 100 stood beside the Spring Classic and National Short Track Championships.</strong>
            <p>Eddie Hoffman, Al Schill, Joe Shear and Dick Trickle are among the select drivers credited with victories in all three of Rockford's major Late Model traditions.</p>
          </div>
        </div>
      </section>

      {repeats.length>0 && <section className={styles.section}>
        <div className={styles.kicker}>Repeat Winners</div>
        <div className={styles.sectionHead}><h2>Multiple All-Star 100 Victories</h2><div className={styles.sectionNote}>The original ARTGO years were dominated by two of the era's defining short-track racers.</div></div>
        <div className={styles.eraGrid}>
          {repeats.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{seasons.filter(s=>s.champion_name===name).map(s=>s.year).sort((a,b)=>a-b).join(' • ')}</div></div>)}
        </div>
      </section>}

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Complete Winner Lineage</div>
        <div className={styles.sectionHead}><h2>All-Star 100 Winners by Edition</h2><div className={styles.sectionNote}>Twenty-six completed editions across the ARTGO, ASA/JEGS and Midwest Tour eras.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map(s=><div key={s.id} className={styles.eraCard}><div className={styles.eraYear}>{s.year}</div><div className={styles.eraValue}>{s.champion_name}</div><div className={styles.eraNote}>{s.season_name||''}</div></div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>1989 Archive Correction</div>
          <strong>Rich Bickle Jr.'s 1989 win belongs in the lineage.</strong>
          <p>Some later published winner lists omitted 1989, but contemporary Midwest Racing News documents Bickle beating Dick Trickle in the August 15 All-Star 100 and publishes the full field. The museum preserves that verified edition.</p>
        </div>
      </section>

      <section className={styles.section} id="results">
        <div className={styles.kicker}>Preserved Race Results</div>
        <div className={styles.sectionHead}><h2>All-Star 100 Finishing Orders</h2><div className={styles.sectionNote}>The ARTGO era is especially deep: all fifteen original editions already carry preserved fields from the museum's ARTGO archive.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live All-Star 100 result archive.</div> :
        <div className={styles.eventStack}>{ordered.map(e=>{
          const year=yearBySeason.get(e.season_id||0)
          const rows=[...e.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
          return <article key={e.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year} • All-Star 100</div><div className={styles.eventDate}>{fmtDate(e.race_date)} • {e.track_name||'Rockford Speedway'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Winner</span><strong className={styles.winnerName}>{e.winner_name}</strong></div>
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
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>The All-Star 100 is now preserved as one event family instead of being scattered across ARTGO, ASA Late Models, JEGS/CRA and the Midwest Tour.</strong>
          <p>The current collection contains all 26 winners and 479 finishing-position rows. The complete 1978–1992 ARTGO run is the backbone; the later revival races are linked in without changing the identity of the original Tuesday Night Special.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/rockford-speedway-il" className={styles.footerLink}>Rockford Speedway<span>Open track archive →</span></Link>
        <Link href="/series/artgo-challenge-series" className={styles.footerLink}>ARTGO Challenge Series<span>Open series archive →</span></Link>
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
