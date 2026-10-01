import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

const HIBBING_TRACK_ID = 80
const LATE_MODEL_CLASS_ID = 46
const WISSOTA_LATE_MODEL_SERIES_IDS = [48, 178]

type LegacyEvent = {
  id: number
  race_date: string | null
  year: number | null
  race_status: string | null
}

type LegacyResult = {
  id: number
  race_id: number
  driver_id: number
  finishing_position: number | null
}

type DriverRow = {
  driver_id: number
  driver_name: string
  slug: string | null
}

type SeriesResult = {
  id: number
  finishing_position: number | null
  starting_position: string | null
  car_number: string | null
  driver_name: string
  driver_slug: string | null
}

type SeriesEvent = {
  id: number
  series_id: number
  race_date: string | null
  track_name: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: SeriesResult[]
}

type ArchiveResult = {
  position: number
  startingPosition: string | null
  driverName: string
  driverSlug: string | null
  carNumber: string | null
}

type ArchiveRace = {
  key: string
  year: number
  raceDate: string
  winner: string
  sourceLabel: string
  sourceUrl: string | null
  results: ArchiveResult[]
  dnqNames: string[]
  sourceType: 'series' | 'museum'
}

const researchTrail = [
  {
    era: '1979',
    title: 'Earliest Labor Day-weekend result recovered',
    detail: 'Checkered Flag Racing News reported Leon Plank edging Tom Nesbitt by a bumper in the 40-lap Hibbing special, with Phil Prusak third. Rain pushed the weekend program through Monday.',
    url: null,
  },
  {
    era: '1981–1984',
    title: 'Labor Day Invitational era',
    detail: 'Midwest Racing News advertising repeatedly used the Labor Day Invitational name for Hibbing’s Late Models, Super Stocks and Six Cylinders. The museum OCR archive preserves those ads and race reports.',
    url: null,
  },
  {
    era: 'By 1985',
    title: 'The Shootout name appears',
    detail: 'The MRN archive begins using Labor Day Shootout, marking the naming transition into the identity the event still carries today.',
    url: null,
  },
  {
    era: '1989',
    title: 'Tom Nesbitt wins the Late Model feature',
    detail: 'MRN preserved a top ten: Tom Nesbitt, Steve Fegers, Paul Gilberts, John Kaanta, an unidentified fifth-place finisher, Dick Christman, Terry Lanphear, Tom Waseleski, Johnny Johnson and Tom Smart.',
    url: null,
  },
  {
    era: '1992 & 1994',
    title: 'Rick Aukland victories',
    detail: 'National Dirt Late Model Hall of Fame career statistics credit Rick Aukland with Hibbing Labor Day Shoot-Out victories in 1987, 1992 and 1994.',
    url: 'https://ndlmhof.wordpress.com/inductee-career-statistics/',
  },
  {
    era: '1996',
    title: 'Dirt Race Central video archive',
    detail: 'The surviving DRC broadcast identifies the 17th Annual Labor Day Shootout Late Model feature and shows Mitch Johnson defeating Rick Egersdorf.',
    url: 'https://speedsport.tv/videos/31277',
  },
  {
    era: '1998',
    title: 'Dirt Race Central preserves Night 2',
    detail: 'DRC’s archive identifies the 19th Annual Labor Day Shootout and records Ryan Aho sweeping the weekend’s WISSOTA Super Stock action.',
    url: 'https://drc.tv/videos/4400',
  },
  {
    era: '2025–2026',
    title: '47th and 48th published runnings',
    detail: 'Hibbing Speedway promoted the 2025 weekend as the 47th annual Shootout in honor of Bill Engelstad. The 2026 Labor Day weekend was promoted as the 48th running.',
    url: 'https://hibbingspeedway.com/news/47th-annual-labor-day-shootout-to-honor-bill-engelstad-s-legacy-at-hibbing-speedway',
  },
]

function laborDayUtc(year: number) {
  const sept1 = new Date(Date.UTC(year, 8, 1))
  const day = sept1.getUTCDay()
  const daysToMonday = (8 - day) % 7
  return new Date(Date.UTC(year, 8, 1 + daysToMonday))
}

function isLaborDayWeekend(value: string | null) {
  if (!value) return false
  const date = new Date(value + 'T00:00:00Z')
  const year = date.getUTCFullYear()
  const laborDay = laborDayUtc(year)
  const difference = Math.round((laborDay.getTime() - date.getTime()) / 86400000)
  return difference >= 0 && difference <= 2
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function sourceName(url: string | null) {
  if (!url) return 'Museum results database'
  if (url.includes('thethirdturn.com')) return 'The Third Turn / WISSOTA'
  if (url.includes('dirtondirt.com')) return 'Dirt on Dirt'
  if (url.includes('hibbingspeedway.com')) return 'Hibbing Speedway'
  return 'Published race source'
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
}

export default async function HibbingLaborDayShootoutPage() {
  const [{ data: legacyEventData }, { data: seriesEventData }, { data: heroRows }] = await Promise.all([
    supabase
      .from('Events')
      .select('id,race_date,year,race_status')
      .eq('track_id', HIBBING_TRACK_ID)
      .eq('class_id', LATE_MODEL_CLASS_ID)
      .gte('race_date', '1979-08-25')
      .lte('race_date', '2026-09-07')
      .order('race_date', { ascending: true }),
    supabase
      .from('SeriesEvents')
      .select('id,series_id,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug)')
      .eq('track_slug', 'hibbing-raceway-mn')
      .in('series_id', WISSOTA_LATE_MODEL_SERIES_IDS)
      .gte('race_date', '1979-08-25')
      .lte('race_date', '2026-09-07')
      .order('race_date', { ascending: true }),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug', 'hibbing-raceway-mn')
      .eq('photo_rank', 1),
  ])

  const legacyEvents = ((legacyEventData || []) as LegacyEvent[]).filter((event) => isLaborDayWeekend(event.race_date))
  const legacyIds = legacyEvents.map((event) => event.id)

  const { data: legacyResultData } = legacyIds.length
    ? await supabase
        .from('Results')
        .select('id,race_id,driver_id,finishing_position')
        .in('race_id', legacyIds)
        .order('race_id', { ascending: true })
        .order('finishing_position', { ascending: true })
    : { data: [] as LegacyResult[] }

  const legacyResults = (legacyResultData || []) as LegacyResult[]
  const driverIds = Array.from(new Set(legacyResults.map((row) => Number(row.driver_id)).filter(Number.isFinite)))
  const { data: driverData } = driverIds.length
    ? await supabase
        .from('Drivers')
        .select('driver_id,driver_name,slug')
        .in('driver_id', driverIds)
    : { data: [] as DriverRow[] }

  const drivers = new Map(
    ((driverData || []) as DriverRow[]).map((driver) => [
      Number(driver.driver_id),
      { name: driver.driver_name || 'Unknown Driver', slug: driver.slug || null },
    ]),
  )

  const legacyResultsByRace = new Map<number, ArchiveResult[]>()
  for (const row of legacyResults) {
    if (row.finishing_position == null) continue
    const driver = drivers.get(Number(row.driver_id))
    const result: ArchiveResult = {
      position: Number(row.finishing_position),
      startingPosition: null,
      driverName: driver?.name || 'Unknown Driver',
      driverSlug: driver?.slug || null,
      carNumber: null,
    }
    const rows = legacyResultsByRace.get(Number(row.race_id)) || []
    rows.push(result)
    legacyResultsByRace.set(Number(row.race_id), rows)
  }

  const legacyArchive: ArchiveRace[] = legacyEvents
    .filter((event) => event.race_date)
    .map((event) => {
      const results = [...(legacyResultsByRace.get(event.id) || [])].sort((a, b) => a.position - b.position)
      return {
        key: 'museum-' + event.id,
        year: Number(event.year || event.race_date!.slice(0, 4)),
        raceDate: event.race_date!,
        winner: results.find((row) => row.position === 1)?.driverName || 'Winner not yet identified',
        sourceLabel: 'Museum results database',
        sourceUrl: null,
        results,
        dnqNames: [],
        sourceType: 'museum' as const,
      }
    })

  const seriesEvents = ((seriesEventData || []) as SeriesEvent[]).filter((event) => isLaborDayWeekend(event.race_date))
  const seriesArchive: ArchiveRace[] = seriesEvents
    .filter((event) => event.race_date)
    .map((event) => {
      const rawRows = event.SeriesEventResults || []
      const results: ArchiveResult[] = rawRows
        .filter((row) => row.finishing_position != null)
        .map((row) => ({
          position: Number(row.finishing_position),
          startingPosition: row.starting_position,
          driverName: row.driver_name,
          driverSlug: row.driver_slug,
          carNumber: row.car_number,
        }))
        .sort((a, b) => a.position - b.position)

      return {
        key: 'series-' + event.id,
        year: Number(event.race_date!.slice(0, 4)),
        raceDate: event.race_date!,
        winner: event.winner_name || results.find((row) => row.position === 1)?.driverName || 'Winner not yet identified',
        sourceLabel: sourceName(event.source_url),
        sourceUrl: event.source_url,
        results,
        dnqNames: rawRows.filter((row) => row.finishing_position == null).map((row) => row.driver_name),
        sourceType: 'series' as const,
      }
    })

  const byDate = new Map<string, ArchiveRace>()
  for (const race of legacyArchive) byDate.set(race.raceDate, race)
  for (const race of seriesArchive) {
    const current = byDate.get(race.raceDate)
    if (!current || race.results.length >= current.results.length) byDate.set(race.raceDate, race)
  }

  const archives = [...byDate.values()].sort((a, b) => b.raceDate.localeCompare(a.raceDate))
  const resultCount = archives.reduce((sum, race) => sum + race.results.length, 0)
  const coveredYears = new Set(archives.map((race) => race.year))
  const missingYears = range(1979, 2026).filter((year) => !coveredYears.has(year))

  const winnerCounts = new Map<string, number>()
  for (const race of archives) {
    if (!race.winner || race.winner === 'Winner not yet identified') continue
    winnerCounts.set(race.winner, (winnerCounts.get(race.winner) || 0) + 1)
  }
  const repeatWinners = [...winnerCounts.entries()]
    .filter(([, wins]) => wins > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)

  const racesByYear = new Map<number, ArchiveRace[]>()
  for (const race of [...archives].reverse()) {
    const rows = racesByYear.get(race.year) || []
    rows.push(race)
    racesByYear.set(race.year, rows)
  }

  const heroSrc = (heroRows || [])[0]?.image_url || ''

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc ? <img src={heroSrc} alt="Hibbing Raceway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Labor Day Shootout</span></div>
        <div className={styles.eyebrow}>Northern Minnesota Special Event Archive</div>
        <h1 className={styles.title}>Labor Day Shootout</h1>
        <p className={styles.tagline}>Hibbing Raceway • Labor Day Weekend Tradition</p>
        <p className={styles.intro}>Museum newspaper sources trace Hibbing’s Labor Day-weekend stock-car tradition to at least 1979. Midwest Racing News called the program the Labor Day Invitational through the early 1980s before the Labor Day Shootout name took hold. The modern two-night WISSOTA weekend remains one of northern Minnesota’s major annual dirt-track events.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/hibbing-raceway-mn" className={styles.button}>Open Hibbing Raceway</Link>
          <a href="#results" className={styles.buttonGhost}>Recovered Late Model Results</a>
          <a href="https://hibbingspeedway.com/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Hibbing Speedway</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Published Current Running" value="48th • 2026" />
          <Stat label="Recovered Late Model Nights" value={String(archives.length)} />
          <Stat label="Published Finish Positions" value={resultCount.toLocaleString('en-US')} />
          <Stat label="Museum Evidence Span" value="1979–2026" />
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Why It Belongs in Special Events</div>
            <strong>A Labor Day destination race with nearly five decades of northern Minnesota history.</strong>
            <p>The weekend has repeatedly drawn regional Late Model, Modified and Super Stock fields to Hibbing after the regular-season point chase. Modern editions run as a multi-division WISSOTA weekend, while the older newspaper record shows the same Labor Day identity long before today’s format.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Annual-Number Research Note</div>
            <strong>The published numbering is not perfectly consistent across surviving sources.</strong>
            <p>MRN called the 1990 program the 13th annual, Dirt Race Central labeled the 1996 Late Model race the 17th annual and the 1998 Super Stock race the 19th annual, while Hibbing Speedway promoted 2025 as the 47th annual. The museum therefore preserves the wording used by each source instead of forcing a single unsupported inaugural-year calculation.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Source Trail</div>
        <div className={styles.sectionHead}><h2>How the History Comes Together</h2><div className={styles.sectionNote}>MRN and CFRN OCR, Dirt Race Central, official Hibbing material, Hall of Fame records and the museum’s existing result database.</div></div>
        <div className={styles.eraGrid}>
          {researchTrail.map((item) => <div key={item.era + item.title} className={styles.eraCard}>
            <div className={styles.eraYear}>{item.era}</div>
            <div className={styles.eraValue}>{item.title}</div>
            <div className={styles.eraNote}>{item.detail}</div>
            {item.url ? <a href={item.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#d0ad63', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>Open source →</a> : null}
          </div>)}
        </div>
      </section>

      {repeatWinners.length > 0 && <section className={styles.section}>
        <div className={styles.kicker}>Recovered Late Model Winners</div>
        <div className={styles.sectionHead}><h2>Multiple Race-Night Victories</h2><div className={styles.sectionNote}>Counts reflect the race nights currently attached to the museum archive, not a claim about all-time totals while historical gaps remain.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name, wins]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>Recovered Labor Day-weekend Late Model race nights</div></div>)}
        </div>
      </section>}

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Research Queue</div>
          <strong>Some editions still need a Late Model result row attached to the museum database.</strong>
          <p>The current database has no Labor Day-weekend Late Model race row for: {missingYears.join(', ')}. Several of those years already have winner evidence in newspaper, Hall of Fame or video sources, so they remain enrichment targets rather than assumed cancellations.</p>
        </div>
      </section>

      <section className={styles.section} id="results">
        <div className={styles.kicker}>Recovered Result Archive</div>
        <div className={styles.sectionHead}><h2>Hibbing Labor Day Weekend Late Models</h2><div className={styles.sectionNote}>For duplicate dates, the page automatically uses the deeper WISSOTA series result set when available and falls back to the museum’s legacy track result rows otherwise.</div></div>
        <div className={styles.eventStack}>
          {archives.map((race) => {
            const yearRaces = racesByYear.get(race.year) || []
            const chronological = [...yearRaces].sort((a, b) => a.raceDate.localeCompare(b.raceDate))
            const nightIndex = chronological.findIndex((item) => item.key === race.key)
            const nightLabel = yearRaces.length > 1 ? ' • Night ' + (nightIndex + 1) : ''
            return <article key={race.key} className={styles.eventCard}>
              <div className={styles.eventHeader}>
                <div><div className={styles.eventYear}>{race.year}{nightLabel}</div><div className={styles.eventDate}>{formatDate(race.raceDate)} • Hibbing Raceway</div></div>
                <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Late Model Winner</span><strong className={styles.winnerName}>{race.winner}</strong></div>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.winnerBar}>
                  <span>{race.results.length} published finish {race.results.length === 1 ? 'position' : 'positions'}{race.dnqNames.length ? ' • ' + race.dnqNames.length + ' additional entrants' : ''}</span>
                  {race.sourceUrl ? <a href={race.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>{race.sourceLabel} →</strong></a> : <strong>{race.sourceLabel}</strong>}
                </div>
                {race.results.length ? <div className={styles.resultsScroller}>
                  <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Source</span></div>
                  {race.results.map((row) => <div key={race.key + '-' + row.position + '-' + row.driverName} className={styles.compactRow}>
                    <strong>{row.position}</strong>
                    <span>{row.startingPosition || '—'}</span>
                    <strong>{row.driverSlug ? <Link href={'/drivers/' + row.driverSlug} style={{ color: 'inherit' }}>{row.driverName}</Link> : row.driverName}</strong>
                    <span>{row.carNumber || '—'}</span>
                    <span>{race.sourceType === 'series' ? 'WISSOTA' : 'Museum'}</span>
                  </div>)}
                </div> : <div className={styles.winnerOnly}>Winner recovered; deeper finishing order is still being researched.</div>}
                {race.dnqNames.length > 0 && <div className={styles.dnqWrap}><div className={styles.dnqTitle}>Additional entrants / no published feature position</div>{race.dnqNames.map((name) => <span key={race.key + '-dnq-' + name} className={styles.dnqChip}>{name}</span>)}</div>}
              </div>
            </article>
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>This page is built from existing museum records rather than a duplicate event database.</strong>
          <p>The Special Event archive merges Hibbing’s legacy Events/Results records with the deeper WISSOTA Challenge and AMSOIL Late Model series fields already stored in Supabase. That keeps driver links and future result corrections synchronized with the main museum.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/hibbing-raceway-mn" className={styles.footerLink}>Hibbing Raceway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue archival research →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
