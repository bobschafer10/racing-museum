import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './special-event.module.css'

export const revalidate = 43200

type Finish = { id: number; finishing_position: number | null; driver_name: string | null; car_number: string | null }
type Event = { id: number; season_id: number | null; race_date: string | null; race_number: number | null; track_name: string | null; winner_name: string | null; SeriesEventResults: Finish[] }
type Season = { id: number; year: number }

export default async function HistoricalWinnersArchive({ seriesId, title, venue, trackSlug, years, description, note }: {
  seriesId: number; title: string; venue: string; trackSlug: string; years: string; description: string; note: string
}) {
  const [{ data: eventData, error }, { data: seasonData }] = await Promise.all([
    supabase.from('SeriesEvents').select('id,season_id,race_date,race_number,track_name,winner_name,SeriesEventResults(id,finishing_position,driver_name,car_number)').eq('series_id', seriesId),
    supabase.from('SeriesSeasons').select('id,year').eq('series_id', seriesId),
  ])
  const seasons = new Map(((seasonData ?? []) as Season[]).map(s => [s.id, s.year]))
  const events = ((eventData ?? []) as Event[]).map(event => ({ ...event, year: event.season_id ? seasons.get(event.season_id) : (event.race_date ? Number(event.race_date.slice(0, 4)) : undefined) }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.race_number ?? 0) - (b.race_number ?? 0))
  const yearCount = new Set(events.map(e => e.year).filter(Boolean)).size
  const detailedCount = events.reduce((sum, e) => sum + (e.SeriesEventResults?.length ?? 0), 0)
  return <main className={styles.page}>
    <section className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>{title}</span></div>
      <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.tagline}>{venue}</p>
      <p className={styles.intro}>{description}</p>
      <div className={styles.heroActions}><Link href={`/tracks/${trackSlug}`} className={styles.buttonGhost}>Track Archive</Link><Link href="#results" className={styles.button}>Historical Winners</Link></div>
      <div className={styles.stats}><Stat label="Years Documented" value={years}/><Stat label="Recorded Features" value={String(events.length)}/><Stat label="Years Represented" value={String(yearCount)}/><Stat label="Preserved Result Rows" value={String(detailedCount)}/></div>
    </div></section>
    <div className={styles.content}>
      <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Research Coverage</div><strong>Historical winners and verified results</strong><p>{note}</p></div></section>
      <section className={styles.section} id="results"><div className={styles.kicker}>Event Chronology</div><div className={styles.sectionHead}><h2>Year-by-Year Winners</h2><div className={styles.sectionNote}>Original event dates and finishing positions appear only where documented.</div></div>
        {error ? <div className={styles.empty}>Unable to load the archive.</div> : <div className={styles.eventStack}>{events.map(event => {
          const division = event.track_name?.match(/\(([^)]+)\)\s*$/)?.[1]
          const finishes = [...(event.SeriesEventResults ?? [])].sort((a, b) => (a.finishing_position ?? 999) - (b.finishing_position ?? 999))
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}><div><div className={styles.eventYear}>{event.year ?? 'Year unverified'}</div><div className={styles.eventDate}>{division ?? venue}{event.race_date ? ` · ${event.race_date}` : ''}</div></div><div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Winner</span><strong className={styles.winnerName}>{event.winner_name ?? 'Not documented'}</strong></div></div>
            <div className={styles.panelBody}>{finishes.length > 1 ? <div className={styles.resultsScroller}><div className={styles.compactHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>{finishes.map(f => <div key={f.id} className={styles.compactRow}><strong>{f.finishing_position ?? '—'}</strong><span>{f.car_number ?? '—'}</span><strong>{f.driver_name ?? 'Unknown'}</strong><span>—</span><span>—</span></div>)}</div> : <div className={styles.winnerOnly}>Winner documented; complete finishing order not yet recovered.</div>}</div>
          </article>
        })}</div>}
      </section>
      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all traditions →</span></Link><Link href={`/tracks/${trackSlug}`} className={styles.footerLink}>{venue}<span>Open track archive →</span></Link></div>
    </div>
  </main>
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
