import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PrintReportButton from './PrintReportButton'
import styles from './feature-win-report.module.css'

type Driver = {
  driver_id: number
  driver_name: string
  driver_slug?: string
  hometown: string | null
  state: string | null
  recorded_wins: number | null
}

type FeatureWin = {
  race_id: number
  race_date: string
  track_name: string
  track_slug: string
  class_name: string | null
  finishing_position: number
}

type BroaderWin = {
  id: number
  year: number | null
  accomplishment_date: string | null
  accomplishment_type: string
  series_name: string | null
  event_name: string | null
  track_name: string | null
  geography: string | null
  source_name: string | null
  source_url: string | null
  notes: string | null
}

type CountSummary = {
  label: string
  wins: number
}

export const revalidate = 300

const PAGE_SIZE = 1000

export default async function FeatureWinReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: driver } = await supabase
    .from('driver_directory_alpha_view')
    .select('driver_id, driver_name, driver_slug, hometown, state, recorded_wins')
    .eq('driver_slug', slug)
    .maybeSingle<Driver>()

  if (!driver) notFound()

  const [wins, broaderResult] = await Promise.all([
    fetchAllFeatureWins(slug),
    supabase
      .from('DriverCareerAccomplishments')
      .select('id, year, accomplishment_date, accomplishment_type, series_name, event_name, track_name, geography, source_name, source_url, notes')
      .eq('driver_slug', slug)
      .eq('is_published', true)
      .in('accomplishment_type', ['MAJOR_EVENT_WIN', 'OUTSIDE_AREA_FEATURE_WIN'])
      .order('year', { ascending: true, nullsFirst: false })
      .order('accomplishment_date', { ascending: true, nullsFirst: false })
      .returns<BroaderWin[]>(),
  ])

  const broaderWins = broaderResult.data ?? []
  const trackSummary = summarize(wins, (row) => row.track_name || 'Unknown track')
  const classSummary = summarize(wins, (row) => row.class_name || 'Unknown class')
  const yearSummary = summarizeYears(wins)

  const firstYear = yearFromDate(wins[0]?.race_date)
  const lastYear = yearFromDate(wins[wins.length - 1]?.race_date)
  const careerSpan = firstYear && lastYear
    ? firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`
    : '—'
  const bestYear = [...yearSummary].sort((a, b) => b.wins - a.wins || Number(a.label) - Number(b.label))[0]
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const hometown = [driver.hometown, driver.state ? String(driver.state).trim() : null]
    .filter(Boolean)
    .join(', ')

  return (
    <main className={styles.page}>
      <div className={styles.screenOnly}>
        <Link href={`/drivers/${slug}`} className={styles.backLink}>← Back to {driver.driver_name}</Link>
        <PrintReportButton />
      </div>

      <article className={styles.report}>
        <header className={styles.reportHeader}>
          <img src="/museum-logo.png" alt="Upper Midwest Auto Racing Museum" className={styles.logo} />
          <div>
            <p className={styles.kicker}>Upper Midwest Auto Racing Museum</p>
            <h1>Feature Win Report</h1>
            <p className={styles.driverLine}>
              <strong>{driver.driver_name}</strong>{hometown ? ` • ${hometown}` : ''}
            </p>
            <p className={styles.generated}>Generated {generatedDate} from the museum&apos;s current research database.</p>
          </div>
        </header>

        <section className={styles.statGrid} aria-label="Feature win report summary">
          <Stat value={wins.length.toLocaleString('en-US')} label="Result-Backed Feature Wins" />
          <Stat value={trackSummary.length.toLocaleString('en-US')} label="Tracks Won At" />
          <Stat value={classSummary.length.toLocaleString('en-US')} label="Classes Won In" />
          <Stat value={careerSpan} label="Recorded Win Span" />
          <Stat value={bestYear ? bestYear.label : '—'} label="Best Win Season" />
          <Stat value={bestYear ? bestYear.wins.toLocaleString('en-US') : '0'} label="Wins in Best Season" />
          <Stat value={broaderWins.length.toLocaleString('en-US')} label="Verified Broader-Career Wins" />
          <Stat value={(wins.length + broaderWins.length).toLocaleString('en-US')} label="Total Documented Wins" />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>Feature Win Summary</h2>
            <span>Every current result-backed win is included below</span>
          </div>

          <div className={styles.summaryGrid}>
            <SummaryTable title="Wins by Track" rows={trackSummary} />
            <SummaryTable title="Wins by Class" rows={classSummary} />
            <SummaryTable title="Wins by Year" rows={yearSummary} />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>Complete Feature Win History</h2>
            <span>{wins.length.toLocaleString('en-US')} result-backed win{wins.length === 1 ? '' : 's'}</span>
          </div>

          {wins.length === 0 ? (
            <div className={styles.empty}>No result-backed feature wins are currently recorded for this driver.</div>
          ) : (
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Track</th>
                  <th>Class</th>
                </tr>
              </thead>
              <tbody>
                {wins.map((win, index) => (
                  <tr key={`${win.race_id}-${win.race_date}-${index}`}>
                    <td>{formatRaceDate(win.race_date)}</td>
                    <td>{win.track_name || 'Unknown track'}</td>
                    <td>{win.class_name || 'Unknown class'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {broaderWins.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Verified Broader-Career Wins</h2>
              <span>Documented separately from museum race-result rows</span>
            </div>

            <div className={styles.broaderList}>
              {broaderWins.map((row) => {
                const title = row.event_name || row.series_name || 'Verified feature win'
                const location = [row.track_name, row.geography].filter(Boolean).join(', ')
                const dateLabel = row.accomplishment_date
                  ? formatRaceDate(row.accomplishment_date)
                  : row.year ? String(row.year) : 'Year unknown'
                return (
                  <div className={styles.broaderItem} key={row.id}>
                    <strong>{dateLabel} — {title}</strong>
                    {location ? <span>{location}</span> : null}
                    {row.notes ? <p>{row.notes}</p> : null}
                    {row.source_name ? (
                      row.source_url
                        ? <span>Source: <a href={row.source_url}>{row.source_name}</a></span>
                        : <span>Source: {row.source_name}</span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <footer className={styles.reportFooter}>
          <strong>Research note:</strong> Result-backed feature wins come directly from the museum&apos;s current race-result archive.
          Verified broader-career victories are shown separately because they may come from historical sources that have not yet been
          reconstructed into a complete individual race-result row. The archive is continually expanded and corrected as additional
          newspapers, track records, series records and historical sources are recovered.
        </footer>
      </article>
    </main>
  )
}

async function fetchAllFeatureWins(slug: string) {
  const rows: FeatureWin[] = []

  for (let from = 0; from < 20000; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('driver_full_results_view')
      .select('race_id, race_date, track_name, track_slug, class_name, finishing_position')
      .eq('driver_slug', slug)
      .eq('finishing_position', 1)
      .order('race_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<FeatureWin[]>()

    if (error) throw error

    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return rows
}

function summarize(rows: FeatureWin[], getLabel: (row: FeatureWin) => string): CountSummary[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const label = getLabel(row)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, wins]) => ({ label, wins }))
    .sort((a, b) => b.wins - a.wins || a.label.localeCompare(b.label))
}

function summarizeYears(rows: FeatureWin[]): CountSummary[] {
  const counts = new Map<number, number>()
  for (const row of rows) {
    const year = yearFromDate(row.race_date)
    if (!year) continue
    counts.set(year, (counts.get(year) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, wins]) => ({ label: String(year), wins }))
}

function SummaryTable({ title, rows }: { title: string; rows: CountSummary[] }) {
  return (
    <div className={styles.summaryBlock}>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <div className={styles.empty}>No data recorded.</div>
      ) : (
        <table className={styles.compactTable}>
          <thead>
            <tr><th>{title.replace('Wins by ', '')}</th><th>Wins</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}><td>{row.label}</td><td>{row.wins.toLocaleString('en-US')}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.statCard}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function yearFromDate(value: string | null | undefined) {
  if (!value) return null
  const year = Number(String(value).slice(0, 4))
  return Number.isFinite(year) && year > 0 ? year : null
}

function formatRaceDate(value: string) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
