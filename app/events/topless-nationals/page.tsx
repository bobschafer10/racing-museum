import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 3600

type Race = { id: number; race_id: number | null; race_date: string | null; class_id: number | null }
type Finish = { race_id: number | null; driver_id: number | null; finishing_position: number | null }
type Driver = { driver_id: number | null; driver_name: string | null }
type SeriesFinish = { id: number; finishing_position: number | null; driver_name: string | null; car_number: string | null }
type SeriesRace = { id: number; event_id: number | null; race_date: string | null; winner_name: string | null; SeriesEventResults: SeriesFinish[] }

function dateLabel(date: string | null) {
  if (!date) return 'Date not recorded'
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function ToplessNationalsPage() {
  const [{ data: raceData, error: raceError }, { data: seriesData }, { data: classData }] = await Promise.all([
    supabase.from('Events').select('id,race_id,race_date,class_id').eq('series_id', 229).eq('track_id', 143).order('race_date', { ascending: false }),
    supabase.from('SeriesEvents').select('id,event_id,race_date,winner_name,SeriesEventResults(id,finishing_position,driver_name,car_number)').eq('series_id', 229),
    supabase.from('Classes').select('id,name'),
  ])
  const races = (raceData ?? []) as Race[]
  const seriesRaces = (seriesData ?? []) as SeriesRace[]
  const raceIds = races.map(r => r.race_id).filter((id): id is number => id !== null)
  const { data: finishData } = raceIds.length
    ? await supabase.from('Results').select('race_id,driver_id,finishing_position').in('race_id', raceIds).order('finishing_position')
    : { data: [] }
  const finishes = (finishData ?? []) as Finish[]
  const driverIds = [...new Set(finishes.map(r => r.driver_id).filter((id): id is number => id !== null))]
  const { data: driverData } = driverIds.length
    ? await supabase.from('Drivers').select('driver_id,driver_name').in('driver_id', driverIds)
    : { data: [] }
  const drivers = new Map(((driverData ?? []) as Driver[]).map(d => [d.driver_id, d.driver_name ?? 'Driver not identified']))
  const classes = new Map(((classData ?? []) as { id: number; name: string }[]).map(c => [c.id, c.name]))
  const seriesByEvent = new Map(seriesRaces.filter(r => r.event_id !== null).map(r => [r.event_id, r]))
  const years = [...new Set(races.map(r => r.race_date?.slice(0, 4)).filter((y): y is string => Boolean(y)))].sort((a, b) => Number(b) - Number(a))
  const recordedResults = finishes.length
  const richerResults = seriesRaces.reduce((n, r) => n + (r.SeriesEventResults?.length ?? 0), 0)

  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Topless Nationals</span></div>
        <div className={styles.eyebrow}>Upper Midwest Dirt Special Event Archive</div>
        <h1 className={styles.title}>Topless Nationals</h1>
        <p className={styles.tagline}>Ogilvie Raceway’s Traditional Season Finale</p>
        <p className={styles.intro}>The annual multi-division Topless Nationals closes the racing season at Ogilvie Raceway in Ogilvie, Minnesota. The museum is assembling feature winners and complete finishing orders across its history, with 2010 as the first documented season. No event was held in 2020.</p>
        <div className={styles.heroActions}><Link href="/events" className={styles.buttonGhost}>All Special Events</Link><Link href="#results" className={styles.button}>Browse Race Results</Link></div>
        <div className={styles.stats}><Stat label="Historical Span" value="2010–2026"/><Stat label="Linked Features" value={String(races.length)}/><Stat label="Core Result Rows" value={recordedResults.toLocaleString('en-US')}/><Stat label="2026 Detailed Rows" value={richerResults.toLocaleString('en-US')}/></div>
      </div>
    </section>
    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.sourceCard}><div className={styles.sourceLabel}>Museum Research Notes</div>
          <strong>One tradition, multiple divisions, one annual fall finale.</strong>
          <p>The 2018 event was contested on October 19, with six feature divisions. Its official finishing orders have been located, but driver reconciliation and import are still in progress. The 2020 edition was not held. Years missing below reflect incomplete archival recovery, not evidence that the race did not run.</p>
          <p><a href="https://www.ogilvieraceway.com/schedules/event/246102/media-results" target="_blank" rel="noopener noreferrer">Official October 19, 2018 results archive ↗</a></p>
        </div>
      </section>
      <section className={styles.section} id="results">
        <div className={styles.kicker}>Race History</div>
        <div className={styles.sectionHead}><h2>Year-by-Year Feature Results</h2><div className={styles.sectionNote}>Published from linked museum race records; results are shown only to their preserved depth.</div></div>
        {raceError ? <div className={styles.empty}>The results archive is temporarily unavailable.</div> : years.length === 0 ? <div className={styles.empty}>Historical race records are being prepared.</div> :
          <div className={styles.eventStack}>
            {years.map(year => <article key={year} className={styles.eventCard}>
              <div className={styles.eventHeader}><div><div className={styles.eventYear}>{year}</div><div className={styles.eventDate}>Ogilvie Raceway · Minnesota</div></div><div className={styles.winnerBlock}><span className={styles.winnerLabel}>Features Archived</span><strong className={styles.winnerName}>{races.filter(r => r.race_date?.startsWith(year)).length}</strong></div></div>
              <div className={styles.panelBody}>
                {races.filter(r => r.race_date?.startsWith(year)).map(race => {
                  const sr = seriesByEvent.get(race.id)
                  const core = finishes.filter(r => r.race_id === race.race_id).sort((a, b) => (a.finishing_position ?? 999) - (b.finishing_position ?? 999))
                  const detailed = [...(sr?.SeriesEventResults ?? [])].sort((a, b) => (a.finishing_position ?? 999) - (b.finishing_position ?? 999))
                  const winner = sr?.winner_name ?? (core.find(r => r.finishing_position === 1)?.driver_id != null ? drivers.get(core.find(r => r.finishing_position === 1)!.driver_id) : null) ?? 'Winner not yet reconciled'
                  return <div key={race.id} style={{padding:'14px 0',borderBottom:'1px solid #333'}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'baseline'}}>
                      <strong>{classes.get(race.class_id ?? -1) ?? 'Division not recorded'}</strong>
                      <span>{dateLabel(race.race_date)} · Winner: <strong>{winner}</strong></span>
                    </div>
                    {(detailed.length || core.length) ? <details style={{marginTop:8}}>
                      <summary style={{cursor:'pointer',color:'#e0b07a'}}>View {detailed.length || core.length} finishing positions</summary>
                      <div className={styles.resultsScroller}>
                        <div className={styles.compactHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>
                        {detailed.length ? detailed.map(row => <div key={row.id} className={styles.compactRow}><strong>{row.finishing_position ?? '—'}</strong><span>{row.car_number ?? '—'}</span><strong>{row.driver_name ?? 'Unidentified'}</strong><span>—</span><span>—</span></div>)
                          : core.map((row, i) => <div key={i} className={styles.compactRow}><strong>{row.finishing_position ?? '—'}</strong><span>—</span><strong>{drivers.get(row.driver_id) ?? 'Unidentified'}</strong><span>—</span><span>—</span></div>)}
                      </div>
                    </details> : <p className={styles.winnerOnly}>Finishing order not yet available.</p>}
                  </div>
                })}
              </div>
            </article>)}
          </div>}
      </section>
      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse the archive →</span></Link><Link href="/tracks/ogilvie-raceway-mn" className={styles.footerLink}>Ogilvie Raceway<span>Track history →</span></Link></div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
