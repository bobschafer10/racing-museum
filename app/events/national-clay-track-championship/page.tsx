import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type Edition = {
  year: number
  winner: string
  laps: string
  note?: string
  archiveDate?: string
}

type ResultRow = {
  race_date: string
  class_name: string | null
  driver_name: string
  driver_slug: string | null
  finishing_position: number | null
}

const editions: Edition[] = [
  { year: 1995, winner: 'John Provenzano', laps: '100 laps', archiveDate: '1995-09-03' },
  { year: 1994, winner: 'Kevin Roderick', laps: '200 laps', archiveDate: '1994-09-25' },
  { year: 1993, winner: 'John Gill', laps: '160 laps', note: 'Rain-shortened', archiveDate: '1993-09-26' },
  { year: 1992, winner: 'John Provenzano', laps: '200 laps', archiveDate: '1992-09-27' },
  { year: 1991, winner: 'Billy Moyer', laps: '200 laps', archiveDate: '1991-09-29' },
  { year: 1990, winner: 'John Provenzano', laps: '200 laps', archiveDate: '1990-09-30' },
  { year: 1989, winner: 'Pete Parker', laps: '200 laps', archiveDate: '1989-10-01' },
  { year: 1988, winner: 'John Provenzano', laps: '200 laps', archiveDate: '1988-09-24' },
  { year: 1987, winner: 'John Provenzano', laps: '200 laps', archiveDate: '1987-09-27' },
  { year: 1986, winner: 'Arnie Gardner', laps: '200 laps', archiveDate: '1986-09-28' },
  { year: 1985, winner: 'Larry Jackson', laps: '200 laps', archiveDate: '1985-09-29' },
  { year: 1984, winner: 'Bob Pierce', laps: '200 laps', archiveDate: '1984-09-30' },
  { year: 1983, winner: "Jim O'Connor", laps: '200 laps', archiveDate: '1983-10-09' },
  { year: 1982, winner: 'Brian Leslie', laps: '200 laps', archiveDate: '1982-09-26' },
  { year: 1981, winner: 'Arnie Gardner', laps: '200 laps', archiveDate: '1981-09-27' },
  { year: 1980, winner: 'Ken Pohlman', laps: '200 laps', archiveDate: '1980-09-28' },
  { year: 1979, winner: "Jim O'Connor", laps: '200 laps', archiveDate: '1979-09-23' },
  { year: 1978, winner: 'Tony Izzo', laps: '200 laps', archiveDate: '1978-09-24' },
  { year: 1977, winner: 'Tony Izzo', laps: '200 laps' },
  { year: 1976, winner: "Jim O'Connor", laps: '200 laps' },
  { year: 1975, winner: 'Arnie Gardner', laps: '200 laps' },
  { year: 1974, winner: 'Tony Izzo', laps: '200 laps' },
  { year: 1973, winner: 'Earl J. Hubert', laps: '200 laps' },
  { year: 1972, winner: "Jim O'Connor", laps: '200 laps' },
  { year: 1971, winner: 'Bob Kelly', laps: '200 laps' },
  { year: 1970, winner: 'Arnie Gardner', laps: '200 laps' },
  { year: 1969, winner: 'Bill Van Allen', laps: '200 laps' },
  { year: 1968, winner: 'Bill Van Allen', laps: '200 laps' },
  { year: 1967, winner: 'Dick Nelson', laps: '200 laps' },
  { year: 1966, winner: 'Skippy Michaels', laps: '250 laps', note: 'First listed 1966 NCTC race' },
  { year: 1966, winner: 'Dick Nelson', laps: '200 laps', note: 'Second listed 1966 NCTC race' },
  { year: 1965, winner: 'Don Waldvogel', laps: '200 laps' },
  { year: 1964, winner: 'Bill Van Allen', laps: '200 laps' },
  { year: 1963, winner: 'Rich Clement', laps: '200 laps' },
  { year: 1962, winner: 'Bill Van Allen', laps: '200 laps' },
  { year: 1961, winner: 'Gene Crowe', laps: '100 laps' },
  { year: 1960, winner: 'Roy Martinelli', laps: '100 laps' },
  { year: 1959, winner: 'Rich Clement', laps: '100 laps' },
  { year: 1958, winner: 'Bill Gibson', laps: '100 laps' },
  { year: 1957, winner: 'Ken Boyer', laps: '300 laps' },
  { year: 1956, winner: 'Skippy Michaels', laps: '300 laps' },
  { year: 1955, winner: 'Johnny Kapovich', laps: '300 laps' },
  { year: 1954, winner: 'Bill Van Allen', laps: '300 laps' },
  { year: 1953, winner: 'Fred Kasten', laps: '200 laps' },
]

function displayDate(value: string) {
  const [y, m, d] = value.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(sr|jr|ii|iii)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export default async function NationalClayTrackChampionshipPage() {
  const archiveDates = editions.flatMap((edition) => edition.archiveDate ? [edition.archiveDate] : [])

  const [{ data: resultRows }, { data: heroRows }] = await Promise.all([
    archiveDates.length
      ? supabase
          .from('global_results_view')
          .select('race_date,class_name,driver_name,driver_slug,finishing_position')
          .eq('track_slug', 'santa-fe-speedway-il')
          .in('race_date', archiveDates)
          .order('race_date', { ascending: false })
          .order('finishing_position', { ascending: true })
      : Promise.resolve({ data: [] as ResultRow[] }),
    supabase
      .from('track_hero_photo_variants_view')
      .select('image_url')
      .eq('slug', 'santa-fe-speedway-il')
      .eq('photo_rank', 1)
      .limit(1),
  ])

  const rows = (resultRows || []) as ResultRow[]
  const heroSrc = heroRows?.[0]?.image_url || ''
  const rowsByDate = new Map<string, ResultRow[]>()

  for (const row of rows) {
    const bucket = rowsByDate.get(row.race_date) || []
    bucket.push(row)
    rowsByDate.set(row.race_date, bucket)
  }

  const linkedEditions = editions.filter((edition) => edition.archiveDate && rowsByDate.has(edition.archiveDate)).length
  const linkedRows = editions.reduce((sum, edition) => sum + (edition.archiveDate ? (rowsByDate.get(edition.archiveDate)?.length || 0) : 0), 0)

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroSrc ? <img src={heroSrc} alt="National Clay Track Championship at Santa Fe Speedway" className={styles.heroImage} /> : null}
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>National Clay Track Championship</span>
          </div>
          <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
          <h1 className={styles.title}>National Clay Track Championship</h1>
          <p className={styles.tagline}>Santa Fe Speedway's Fall Championship Tradition</p>
          <p className={styles.intro}>
            The National Clay Track Championship was an annual Santa Fe Speedway headline event in Hinsdale, Illinois, spanning the track's full 1953–1995 era. This archive preserves the complete published winner chronology and connects editions to Museum race results as those dates are verified.
          </p>
          <div className={styles.heroActions}>
            <Link href="/tracks/santa-fe-speedway-il" className={styles.button}>Open Santa Fe Archive</Link>
            <Link href="#history" className={styles.buttonGhost}>View Winners</Link>
          </div>
          <div className={styles.stats}>
            <Stat label="Years" value="1953–1995" />
            <Stat label="Winning Records" value={String(editions.length)} />
            <Stat label="Linked Editions" value={String(linkedEditions)} />
            <Stat label="Linked Result Rows" value={linkedRows.toLocaleString('en-US')} />
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Archive Notes</div>
            <strong>Preserved as a Special Event, not a touring series.</strong>
            <p>
              Winner chronology is based on the Santa Fe Speedway historical listing supplied to the Museum and cross-checked against existing Santa Fe race records. The 1966 source chronology contains two NCTC winning records, one listed at 250 laps and one at 200 laps, so both are retained rather than forcing them into a single entry.
            </p>
          </div>
        </section>

        <section className={styles.section} id="history">
          <div className={styles.kicker}>Complete Winner Chronology</div>
          <div className={styles.sectionHead}>
            <h2>1953–1995 National Clay Track Championship Winners</h2>
            <div className={styles.sectionNote}>Museum result panels appear where an edition is already tied to a verified Santa Fe race date.</div>
          </div>

          <div className={styles.eventStack}>
            {editions.map((edition, index) => {
              const linked = edition.archiveDate ? (rowsByDate.get(edition.archiveDate) || []) : []
              const winnerRow = linked.find((row) => row.finishing_position === 1 && normalizeName(row.driver_name) === normalizeName(edition.winner))
              const className = winnerRow?.class_name
              const resultSet = className ? linked.filter((row) => row.class_name === className) : []
              return (
                <article key={`${edition.year}-${edition.winner}-${index}`} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <div>
                      <div className={styles.eventYear}>{edition.year}</div>
                      <div className={styles.eventDate}>
                        {edition.archiveDate ? displayDate(edition.archiveDate) : 'Race date linkage pending'}
                      </div>
                    </div>
                    <div className={styles.winnerBlock}>
                      <span className={styles.winnerLabel}>{edition.laps}{edition.note ? ` • ${edition.note}` : ''}</span>
                      <strong className={styles.winnerName}>{edition.winner}</strong>
                    </div>
                  </div>
                  <div className={styles.panelBody}>
                    {resultSet.length ? (
                      <>
                        <div className={styles.resultsScroller}>
                          <div className={styles.compactHeader}><span>Pos.</span><span></span><span>Driver</span><span></span><span>Class</span></div>
                          {resultSet.map((row, rowIndex) => (
                            <div key={`${edition.year}-${row.driver_name}-${rowIndex}`} className={styles.compactRow}>
                              <strong>{row.finishing_position ?? '—'}</strong>
                              <span></span>
                              <strong>{row.driver_slug ? <Link href={`/drivers/${row.driver_slug}`} style={{ color: 'inherit' }}>{row.driver_name}</Link> : row.driver_name}</strong>
                              <span></span>
                              <span>{row.class_name || '—'}</span>
                            </div>
                          ))}
                        </div>
                        {edition.archiveDate ? <p className={styles.note}><Link href={`/results/${edition.archiveDate}`} style={{ color: 'inherit' }}>Open the complete Museum results page for this race date →</Link></p> : null}
                      </>
                    ) : (
                      <div className={styles.winnerOnly}>Winner and race distance preserved; detailed finishing order has not yet been tied to this NCTC edition.</div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <div className={styles.footerLinks}>
          <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
          <Link href="/tracks/santa-fe-speedway-il" className={styles.footerLink}>Santa Fe Speedway<span>Open track history →</span></Link>
          <Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
