import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 43200

const SERIES_ID = 97
const HERO_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/e/ee/IMCA_Modifieds_doing_Delaware_Style_restart.jpg'

type SeasonRow = {
  id: number
  year: number
  season_name: string | null
  champion_name: string | null
}

type ResultRow = {
  id: number
  finishing_position: number | null
  starting_position: string | null
  car_number: string | null
  driver_name: string
  driver_slug: string | null
  status: string | null
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

function formatDate(value: string | null) {
  if (!value) return 'Date not yet recovered'
  const [y, m, d] = value.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function ClashAtTheCreekPage() {
  const [{ data: seasonData }, { data: eventData, error: eventError }] = await Promise.all([
    supabase
      .from('SeriesSeasons')
      .select('id,year,season_name,champion_name')
      .eq('series_id', SERIES_ID)
      .order('year', { ascending: false }),
    supabase
      .from('SeriesEvents')
      .select('id,season_id,race_number,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug,status)')
      .eq('series_id', SERIES_ID)
      .order('race_date', { ascending: false }),
  ])

  const seasons = (seasonData || []) as SeasonRow[]
  const events = (eventData || []) as EventRow[]
  const yearBySeason = new Map(seasons.map((row) => [row.id, row.year]))
  const resultCount = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)
  const distinctWinners = new Set(events.map((event) => event.winner_name).filter(Boolean)).size

  const orderedEvents = [...events].sort((a, b) => {
    const ay = yearBySeason.get(a.season_id || 0) || 0
    const by = yearBySeason.get(b.season_id || 0) || 0
    return by - ay || (a.race_number || 0) - (b.race_number || 0)
  })

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <img src={HERO_IMAGE} alt="Clash at the Creek at 141 Speedway" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Clash at the Creek</span></div>
          <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
          <h1 className={styles.title}>Clash at the Creek</h1>
          <p className={styles.tagline}>141 Speedway • Francis Creek, Wisconsin • 2009–present</p>
          <p className={styles.intro}>The Clash at the Creek is 141 Speedway&apos;s annual Modified showcase, preserved here as one continuous event chronology with verified winners and available finishing orders by edition.</p>
          <div className={styles.heroActions}>
            <Link href="/tracks/141-speedway-wi" className={styles.button}>Open 141 Speedway Archive</Link>
            <Link href="#results" className={styles.buttonGhost}>Year-by-Year Results</Link>
          </div>
          <div className={styles.stats}>
            <Stat label="Annual Editions" value={String(seasons.length)} />
            <Stat label="Race Records" value={String(events.length)} />
            <Stat label="Preserved Result Rows" value={resultCount.toLocaleString('en-US')} />
            <Stat label="Different Winners" value={String(distinctWinners)} />
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Modified Racing at 141 Speedway</div>
            <strong>The event image is intentionally Modified-specific.</strong>
            <p>The Special Events card and this archive use IMCA Modified imagery from 141 Speedway rather than a Stock Car or another division, so the visual identity matches the race being preserved.</p>
            <p style={{ fontSize: 11, opacity: .72, marginTop: 10 }}>Hero photo: Royalbroil / Wikimedia Commons, CC BY-SA 3.0.</p>
          </div>
        </section>

        <section className={styles.section} id="results">
          <div className={styles.kicker}>Complete Event History</div>
          <div className={styles.sectionHead}>
            <h2>Clash at the Creek Results by Year</h2>
            <div className={styles.sectionNote}>The winner chronology is preserved across the full event run; finishing-order depth reflects the surviving museum record for each edition.</div>
          </div>

          {eventError ? <div className={styles.empty}>Unable to load the live Clash at the Creek archive.</div> :
          <div className={styles.eventStack}>
            {orderedEvents.map((event) => {
              const year = yearBySeason.get(event.season_id || 0) || Number(event.race_date?.slice(0, 4)) || 0
              const rows = [...event.SeriesEventResults].sort((a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
              return (
                <article key={event.id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <div>
                      <div className={styles.eventYear}>{year || 'Year unknown'} • Clash at the Creek</div>
                      <div className={styles.eventDate}>{formatDate(event.race_date)} • {event.track_name || '141 Speedway'}</div>
                    </div>
                    <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Winner</span><strong className={styles.winnerName}>{event.winner_name || 'Not listed'}</strong></div>
                  </div>
                  <div className={styles.panelBody}>
                    {rows.length ? (
                      <div className={styles.resultsScroller}>
                        <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Status</span></div>
                        {rows.map((row) => (
                          <div key={row.id} className={styles.compactRow}>
                            <strong>{row.finishing_position ?? '—'}</strong>
                            <span>{row.starting_position ?? '—'}</span>
                            <strong>{row.driver_slug ? <Link href={`/drivers/${row.driver_slug}`} style={{ color: 'inherit' }}>{row.driver_name}</Link> : row.driver_name}</strong>
                            <span>{row.car_number ?? '—'}</span>
                            <span>{row.status || '—'}</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className={styles.winnerOnly}>Winner chronology preserved; deeper finishing order is still being researched.</div>}
                  </div>
                </article>
              )
            })}
          </div>}
        </section>

        <div className={styles.footerLinks}>
          <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
          <Link href="/tracks/141-speedway-wi" className={styles.footerLink}>141 Speedway<span>Open track archive →</span></Link>
          <Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
