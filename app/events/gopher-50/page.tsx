import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

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

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function formatDate(value: string | null) {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function ordinal(n: number) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return n + 'th'
  const mod10 = n % 10
  if (mod10 === 1) return n + 'st'
  if (mod10 === 2) return n + 'nd'
  if (mod10 === 3) return n + 'rd'
  return n + 'th'
}

function venueFor(year: number) {
  if (year <= 1981) return 'Chateau Speedway'
  if (year <= 2004) return 'Steele County Fairgrounds'
  return 'Deer Creek Speedway'
}

function noWinnerLabel(year: number) {
  if (year === 2020) return 'Cancelled — COVID-19'
  if (year === 2021) return 'Rained out'
  if (year === 2025) return 'No winner — finale rained out'
  if (year === 2026) return 'Cancelled — weather'
  return 'No winner recorded'
}

function sourceLabel(url: string | null) {
  if (!url) return 'Museum research source'
  if (url.includes('dirtondirt.com')) return 'Dirt on Dirt'
  if (url.includes('worldofoutlaws.com')) return 'World of Outlaws'
  return 'Race report'
}

export default async function Gopher50Page() {
  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('id')
    .eq('slug', 'gopher-50')
    .maybeSingle()

  if (seriesError || !series) {
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Gopher 50 archive.</div></div></main>
  }

  const [{ data: seasonData }, { data: eventData, error: eventError }, { data: heroRows }] = await Promise.all([
    supabase
      .from('SeriesSeasons')
      .select('id,year,season_name,champion_name')
      .eq('series_id', series.id)
      .order('year', { ascending: false }),
    supabase
      .from('SeriesEvents')
      .select('id,season_id,race_number,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug)')
      .eq('series_id', series.id)
      .order('race_date', { ascending: false }),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug', 'deer-creek-speedway-mn')
      .eq('photo_rank', 1),
  ])

  const seasons = (seasonData || []) as SeasonRow[]
  const events = (eventData || []) as EventRow[]
  const yearBySeason = new Map(seasons.map((row) => [row.id, row.year]))
  const heroSrc = (heroRows || [])[0]?.image_url || ''
  const completed = seasons.filter((row) => row.champion_name)
  const distinctWinners = new Set(completed.map((row) => row.champion_name)).size
  const resultCount = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)

  const winnerCounts = new Map<string, number>()
  for (const season of completed) {
    if (!season.champion_name) continue
    winnerCounts.set(season.champion_name, (winnerCounts.get(season.champion_name) || 0) + 1)
  }
  const repeatWinners = [...winnerCounts.entries()]
    .filter(([, wins]) => wins > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const orderedEvents = [...events].sort((a, b) => {
    const ay = yearBySeason.get(a.season_id || 0) || 0
    const by = yearBySeason.get(b.season_id || 0) || 0
    return by - ay || (b.race_number || 0) - (a.race_number || 0)
  })

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc ? <img src={heroSrc} alt="Gopher 50 at Deer Creek Speedway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Gopher 50</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>NAPA Auto Parts Gopher 50</h1>
        <p className={styles.tagline}>Minnesota Dirt Late Model Classic • 1980–present</p>
        <p className={styles.intro}>Founded in 1980 as a fundraiser for the Blooming Prairie Jaycees, the Gopher 50 grew into one of Minnesota&apos;s signature Dirt Late Model events. Its lineage runs from Chateau Speedway to the Steele County Fairgrounds in Owatonna and, since 2005, Deer Creek Speedway near Spring Valley.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/deer-creek-speedway-mn" className={styles.button}>Open Deer Creek Archive</Link>
          <a href="https://review.dirtondirt.com/history-major.php?id=40" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Dirt on Dirt History</a>
          <Link href="#winners" className={styles.buttonGhost}>Winners 1980–2026</Link>
        </div>
        <div className={styles.stats}>
          <Stat label="Annual Editions" value={String(seasons.length)} />
          <Stat label="Completed Headliners" value={String(completed.length)} />
          <Stat label="Different Winners" value={String(distinctWinners)} />
          <Stat label="Recovered Result Rows" value={formatNumber(resultCount)} />
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.kicker}>Three Homes, One Tradition</div>
        <div className={styles.sectionHead}><h2>The Gopher 50 Across Southern Minnesota</h2><div className={styles.sectionNote}>The event moved twice while preserving one continuous winner lineage.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1980–1981</div><div className={styles.eraValue}>Chateau Speedway</div><div className={styles.eraNote}>The first two Gopher 50s launched the tradition near Austin/Lansing.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1982–2004</div><div className={styles.eraValue}>Steele County Fairgrounds</div><div className={styles.eraNote}>The Owatonna era carried the race through 23 consecutive seasons.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2005–present</div><div className={styles.eraValue}>Deer Creek Speedway</div><div className={styles.eraNote}>The modern era has featured World of Outlaws and Lucas Oil Late Model competition.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Why It Belongs in Special Events</div>
            <strong>It is a charitable Minnesota race tradition with its own identity and winner history.</strong>
            <p>The Gopher 50 was founded in 1980 as a fundraiser for the Blooming Prairie Jaycees. By 2009, Dirt on Dirt reported that the event had already raised more than $300,000 for Jaycee and Lions projects. Its long-running charitable identity has remained distinct even as tracks and national Late Model sanctions changed.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Recent Weather Chapters</div>
            <strong>Four modern editions have no headline winner.</strong>
            <p>The 2020 event was cancelled during the COVID-19 season and the 2021 race was rained out. In 2025, Bobby Pierce and Nick Hoffman won the two preliminary features before heavy rain cancelled the $50,000 finale. The entire 2026 three-night weekend was cancelled because of the weather forecast.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Multiple-Time Winners</div>
        <div className={styles.sectionHead}><h2>The Drivers Who Won It More Than Once</h2><div className={styles.sectionNote}>Headline Gopher 50 winners only; preliminary-night victories are not counted here.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name, wins]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>Gopher 50 headline victories through 2026</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Winner Lineage</div>
        <div className={styles.sectionHead}><h2>1980–2026 Gopher 50 History</h2><div className={styles.sectionNote}>Complete headline-winner chronology, including years in which the scheduled event did not produce a winner.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map((season) => {
            const edition = season.year - 1979
            return <div key={season.id} className={styles.eraCard}>
              <div className={styles.eraYear}>{season.year} • {ordinal(edition)}</div>
              <div className={styles.eraValue}>{season.champion_name || noWinnerLabel(season.year)}</div>
              <div className={styles.eraNote}>{venueFor(season.year)}</div>
            </div>
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Recovered Full Fields</div>
        <div className={styles.sectionHead}><h2>Preserved Gopher 50 Feature Results</h2><div className={styles.sectionNote}>The inaugural 1980 race, 2022–2024 headline features, and both completed 2025 preliminaries are loaded in this first enrichment pass.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live Gopher 50 result archive.</div> :
        <div className={styles.eventStack}>{orderedEvents.map((event) => {
          const year = yearBySeason.get(event.season_id || 0)
          const rows = [...event.SeriesEventResults].sort((a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
          const eventLabel = event.race_number === 99 ? 'Headline Gopher 50' : `Preliminary Night ${event.race_number || '—'}`
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year || 'Year unknown'} • {eventLabel}</div><div className={styles.eventDate}>{formatDate(event.race_date)} • {event.track_name || 'Venue not listed'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Winner</span><strong className={styles.winnerName}>{event.winner_name || 'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>Published Feature Field • {rows.length} cars</span>{event.source_url ? <a href={event.source_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>{sourceLabel(event.source_url)} →</strong></a> : <strong>{sourceLabel(null)}</strong>}</div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Source</span></div>
                {rows.map((row) => <div key={row.id} className={styles.compactRow}><strong>{row.finishing_position ?? '—'}</strong><span>{row.starting_position ?? '—'}</span><strong>{row.driver_slug ? <Link href={'/drivers/' + row.driver_slug} style={{ color: 'inherit' }}>{row.driver_name}</Link> : row.driver_name}</strong><span>{row.car_number ?? '—'}</span><span>{sourceLabel(event.source_url)}</span></div>)}
              </div>
            </div>
          </article>
        })}</div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>The winner chronology is complete; full-field recovery is continuing backward through the middle decades.</strong>
          <p>This initial museum build preserves all 47 scheduled editions, 43 completed headline winners, the exact modern cancellation history, and 152 verified finishing positions. Dirt on Dirt&apos;s dedicated event history and surviving historical race reports provide a strong path for expanding the remaining 1981–2019 full fields without reconstructing missing positions.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/steele-county-fairgrounds-mn" className={styles.footerLink}>Steele County Fairgrounds<span>Open Owatonna archive →</span></Link>
        <Link href="/tracks/chateau-speedway-mn" className={styles.footerLink}>Chateau Speedway<span>Open track archive →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
