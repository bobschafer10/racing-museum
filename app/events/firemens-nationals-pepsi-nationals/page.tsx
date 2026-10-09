import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 43200

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

const MRN_BASE = 'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/newspapers/midwest-racing-news'

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function formatDate(value: string | null) {
  if (!value) return 'Labor Day Weekend'
  const [y, m, d] = value.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function noWinnerLabel(year: number) {
  if (year === 2006 || year === 2011 || year === 2022) return 'Rained out'
  if (year === 2020) return 'Not held — COVID-19'
  return 'No winner recorded'
}

function eraLabel(year: number) {
  if (year === 1982) return 'NAMAR / BMARA • inaugural Nationals'
  if (year <= 2009) return 'Angell Park / Badger midget era'
  if (year <= 2019) return 'Firemen’s Nationals era'
  if (year === 2020) return 'Not held'
  return 'USAC National Midgets / BMARA'
}

function sourceLabel(url: string | null) {
  if (!url) return 'Museum research source'
  if (url.includes('angellpark.racing')) return 'Angell Park Speedway'
  if (url.includes('usacracing.com')) return 'USAC'
  if (url.includes('bmara.com')) return 'Badger Midgets'
  return 'Race source'
}

function splitWinners(name: string | null) {
  return name ? name.split(' / ').map((item) => item.trim()).filter(Boolean) : []
}

function eventLabel(year: number | undefined, raceNumber: number | null) {
  if (year === 1982) return 'Twin 50 No. ' + (raceNumber || '—')
  if (year === 2023 || year === 2024) return 'Night ' + (raceNumber || '—')
  return 'Firemen’s Nationals / Pepsi Nationals'
}

export default async function FiremensNationalsPage() {
  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('id')
    .eq('slug', 'firemens-nationals-pepsi-nationals')
    .maybeSingle()

  if (seriesError || !series) {
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Firemen’s Nationals / Pepsi Nationals archive.</div></div></main>
  }

  const [{ data: seasonData }, { data: eventData, error: eventError }, { data: heroRows }] = await Promise.all([
    supabase
      .from('SeriesSeasons')
      .select('id,year,season_name,champion_name')
      .eq('series_id', series.id)
      .order('year', { ascending: false }),
    supabase
      .from('SeriesEvents')
      .select('id,season_id,race_number,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug,status)')
      .eq('series_id', series.id)
      .order('race_date', { ascending: false }),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug', 'angell-park-speedway-wi')
      .eq('photo_rank', 1),
  ])

  const seasons = (seasonData || []) as SeasonRow[]
  const events = (eventData || []) as EventRow[]
  const yearBySeason = new Map(seasons.map((row) => [row.id, row.year]))
  const heroSrc = (heroRows || [])[0]?.image_url || ''
  const completed = seasons.filter((row) => row.champion_name)
  const allWinnerNames = completed.flatMap((row) => splitWinners(row.champion_name))
  const distinctWinners = new Set(allWinnerNames).size
  const resultCount = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)

  const winnerYears = new Map<string, number[]>()
  for (const season of completed) {
    for (const winner of splitWinners(season.champion_name)) {
      winnerYears.set(winner, [...(winnerYears.get(winner) || []), season.year])
    }
  }

  const repeatWinners = [...winnerYears.entries()]
    .filter(([, years]) => years.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))

  const orderedEvents = [...events].sort((a, b) => {
    const ay = yearBySeason.get(a.season_id || 0) || 0
    const by = yearBySeason.get(b.season_id || 0) || 0
    return by - ay || (a.race_number || 0) - (b.race_number || 0)
  })

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc ? <img src={heroSrc} alt="Midget racing at Angell Park Speedway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Firemen’s Nationals / Pepsi Nationals</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Firemen’s Nationals / Pepsi Nationals</h1>
        <p className={styles.tagline}>Angell Park Speedway • Sun Prairie, Wisconsin • 1982–present</p>
        <p className={styles.intro}>Angell Park’s Labor Day weekend midget classic began as the Pepsi Challenge Midget Nationals in 1982 and evolved into today’s Firemen’s Nationals. The event became one of the track’s signature national races, bringing together Badger regulars and leading midget racers from across the country at the historic one-third-mile clay oval.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/angell-park-speedway-wi" className={styles.button}>Open Angell Park Archive</Link>
          <Link href="/series/badger-midget-auto-racing-association" className={styles.buttonGhost}>Open Badger Midget Archive</Link>
          <a href="https://angellpark.racing/history/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Angell Park History</a>
          <Link href="#winners" className={styles.buttonGhost}>Winner Chronology</Link>
        </div>
        <div className={styles.stats}>
          <Stat label="Completed Editions" value={String(completed.length)} />
          <Stat label="Different Winners" value={String(distinctWinners)} />
          <Stat label="Race Records" value={String(events.length)} />
          <Stat label="Preserved Result Rows" value={formatNumber(resultCount)} />
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.kicker}>Before the Nationals</div>
        <div className={styles.sectionHead}><h2>The Pepsi 50 Precursor Races</h2><div className={styles.sectionNote}>Midwest Racing News shows that Pepsi-backed Labor Day midget specials existed at Angell Park before the modern Nationals lineage began.</div></div>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>1973 • First Pepsi 50</div>
            <strong>MRN called the 1973 race the “first running” of the $1,000-added Pepsi 50.</strong>
            <p>The race was originally scheduled for September 2, was washed out, and returned on September 9. Rich Vogler led all 50 laps to win at Angell Park.</p>
            <p><a href={MRN_BASE + '/1973-08-30/022.jpg'} target="_blank" rel="noreferrer" style={{ color: '#d0ad63' }}>MRN Aug. 30, 1973 preview →</a> &nbsp; <a href={MRN_BASE + '/1973-09-13/002.jpg'} target="_blank" rel="noreferrer" style={{ color: '#d0ad63' }}>MRN Sept. 13, 1973 report →</a></p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>1975 • Pepsi 50 Season Finale</div>
            <strong>The Pepsi 50 returned as Angell Park’s Labor Day-weekend season finale.</strong>
            <p>MRN advertised the August 31 program as the Pepsi 50-Lap Feature. Tom Steiner won the Badger Midget 50-lapper over Bob Walldan and Bill Ripp.</p>
            <p><a href={MRN_BASE + '/1975-08-28/013.jpg'} target="_blank" rel="noreferrer" style={{ color: '#d0ad63' }}>MRN Aug. 28, 1975 preview →</a> &nbsp; <a href={MRN_BASE + '/1975-09-04/011.jpg'} target="_blank" rel="noreferrer" style={{ color: '#d0ad63' }}>MRN Sept. 4, 1975 report →</a></p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>The Modern Lineage</div>
        <div className={styles.sectionHead}><h2>1982: The Pepsi Nationals Are Born</h2><div className={styles.sectionNote}>The museum treats 1982 as edition No. 1 of the Firemen’s Nationals / Pepsi Nationals lineage.</div></div>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>First Annual • September 1982</div>
          <strong>MRN explicitly described the 1982 weekend as the first annual Pepsi Challenge Midget Nationals.</strong>
          <p>The two-day program carried a $10,000 purse with twin 50-lap A-features. Larry Hillerud won the first 50, Kevin Olson won the second, and Billy Engelhart captured the overall Nationals championship. Angell Park’s own history likewise dates the Pepsi Nationals tradition to 1982.</p>
          <p><a href={MRN_BASE + '/1982-09-02/005.jpg'} target="_blank" rel="noreferrer" style={{ color: '#d0ad63' }}>MRN Sept. 2, 1982 preview →</a> &nbsp; <a href={MRN_BASE + '/1982-09-09/002.jpg'} target="_blank" rel="noreferrer" style={{ color: '#d0ad63' }}>MRN Sept. 9, 1982 results →</a></p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>From Pepsi Nationals to Firemen’s Nationals</h2><div className={styles.sectionNote}>The name, sanctions and race format evolved, but the Labor Day Angell Park tradition remained the common thread.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1973 & 1975</div><div className={styles.eraValue}>Pepsi 50 precursors</div><div className={styles.eraNote}>Documented Pepsi-backed 50-lap season-ending specials before the Nationals name existed.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1982</div><div className={styles.eraValue}>Pepsi Challenge Midget Nationals</div><div className={styles.eraNote}>The official modern lineage begins with a two-day, twin-50 format and Billy Engelhart as overall champion.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1983–2019</div><div className={styles.eraValue}>Pepsi / Firemen’s tradition</div><div className={styles.eraNote}>The Labor Day classic became a fixture of Angell Park and Badger midget history, with national stars regularly joining the field.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2020–2022</div><div className={styles.eraValue}>Interrupted years</div><div className={styles.eraNote}>The event was not held in 2020 and the 2022 program was lost to heavy rain; 2021 was completed with Tanner Thorson winning.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2023–2024</div><div className={styles.eraValue}>Two-night USAC Nationals</div><div className={styles.eraNote}>Both nights were full Firemen’s Nationals programs, producing two feature winners in each running.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2025–2026</div><div className={styles.eraValue}>40th & 41st editions</div><div className={styles.eraNote}>Gavin Miller won the 40th running in 2025; Kevin Thomas Jr. won the 41st in 2026.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Multiple-Time Winners</div>
        <div className={styles.sectionHead}><h2>The Event’s Repeat Champions</h2><div className={styles.sectionNote}>Kevin Doty and Kevin Olson define the early winner history, with several other drivers adding multiple victories.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name, years]) => <div key={name} className={styles.eraCard}>
            <div className={styles.eraYear}>{years.length} wins</div>
            <div className={styles.eraValue}>{name}</div>
            <div className={styles.eraNote}>{[...years].sort((a, b) => a - b).join(' • ')}</div>
          </div>)}
        </div>
      </section>

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Winner Lineage</div>
        <div className={styles.sectionHead}><h2>Firemen’s Nationals / Pepsi Nationals by Year</h2><div className={styles.sectionNote}>Official 1982–2026 lineage, including rainouts, the 2020 COVID interruption, and both winners from the two-night 2023 and 2024 editions.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map((season) => <div key={season.id} className={styles.eraCard}>
            <div className={styles.eraYear}>{season.year}</div>
            <div className={styles.eraValue}>{season.champion_name || noWinnerLabel(season.year)}</div>
            <div className={styles.eraNote}>{eraLabel(season.year)}</div>
          </div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Preserved Race Results</div>
        <div className={styles.sectionHead}><h2>Nationals Finishing Orders</h2><div className={styles.sectionNote}>Existing museum result records were inherited where they matched the official Nationals race. Winner-only records mark years still awaiting deeper finishing-order enrichment.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live Firemen’s Nationals result archive.</div> :
        <div className={styles.eventStack}>{orderedEvents.map((event) => {
          const year = yearBySeason.get(event.season_id || 0)
          const rows = [...event.SeriesEventResults].sort((a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year || 'Year unknown'} • {eventLabel(year, event.race_number)}</div><div className={styles.eventDate}>{formatDate(event.race_date)} • {event.track_name || 'Angell Park Speedway'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Winner</span><strong className={styles.winnerName}>{event.winner_name || 'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}>
                <span>Preserved result depth • {rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>
                {event.source_url ? <a href={event.source_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>{sourceLabel(event.source_url)} →</strong></a> : <strong>Museum archive</strong>}
              </div>
              {rows.length <= 1 ? <div className={styles.winnerOnly}>Winner preserved. Deeper finishing-order research is still open for this edition.</div> :
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Status</span></div>
                {rows.map((row) => <div key={row.id} className={styles.compactRow}><strong>{row.finishing_position ?? '—'}</strong><span>{row.starting_position ?? '—'}</span><strong>{row.driver_slug ? <Link href={'/drivers/' + row.driver_slug} style={{ color: 'inherit' }}>{row.driver_name}</Link> : row.driver_name}</strong><span>{row.car_number ?? '—'}</span><span>{row.status || '—'}</span></div>)}
              </div>}
            </div>
          </article>
        })}</div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>The Firemen’s Nationals / Pepsi Nationals now has its own event family in the museum.</strong>
          <p>The collection preserves all 45 calendar-year records from 1982 through 2026, identifies 41 completed editions, records the four interrupted years, links 44 feature-race records, carries forward 312 existing result rows, and documents the 1973 and 1975 Pepsi 50 precursors directly from Midwest Racing News. Historical finishing-order enrichment can now continue without changing the event structure.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/angell-park-speedway-wi" className={styles.footerLink}>Angell Park Speedway<span>Open track archive →</span></Link>
        <Link href="/series/badger-midget-auto-racing-association" className={styles.footerLink}>Badger Midget Auto Racing Association<span>Open series archive →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
