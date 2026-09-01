import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { getSlingerNationalsMrnStandings } from '@/lib/special-events/slingerNationals'

export const dynamic = 'force-dynamic'

const SERIES_ID = 38
const MIN_YEAR = 1980
const MAX_YEAR = 2026
const mrnYears = new Set([1981, 1982, 1983, 1987, 1999])

type ResultRow = {
  id: number
  finishing_position: number | null
  starting_position: number | null
  car_number: string | null
  driver_name: string
  sponsor: string | null
  make: string | null
  laps: number | null
  led: number | null
  status: string | null
  result_section: string | null
}

type RaceEventRow = {
  id: number
  race_number: number | null
  race_date: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: ResultRow[]
}

export default async function SlingerNationalsYearPage({
  params,
}: {
  params: Promise<{ year: string }>
}) {
  const { year } = await params
  const seasonYear = Number(year)

  if (!Number.isInteger(seasonYear) || seasonYear < MIN_YEAR || seasonYear > MAX_YEAR) {
    notFound()
  }

  const { data: raceEventsRaw, error: raceError } = await supabase
    .from('SeriesEvents')
    .select(`
      id,
      race_number,
      race_date,
      winner_name,
      source_url,
      SeriesEventResults (
        id,
        finishing_position,
        starting_position,
        car_number,
        driver_name,
        sponsor,
        make,
        laps,
        led,
        status,
        result_section
      )
    `)
    .eq('series_id', SERIES_ID)
    .gte('race_date', `${seasonYear}-01-01`)
    .lte('race_date', `${seasonYear}-12-31`)
    .order('race_date', { ascending: true })
    .order('race_number', { ascending: true })

  const raceEvents = (raceEventsRaw ?? []) as RaceEventRow[]
  const seriesEra = seasonYear < 2000
  const expectedRaceCount =
    seasonYear === 1980 ? 3 :
    seasonYear === 1981 || seasonYear === 1982 ? 4 :
    seasonYear >= 1983 && seasonYear <= 1998 ? 3 :
    seasonYear === 1999 ? 2 : 1

  const liveRaceCount = raceEvents.length || expectedRaceCount
  const resultCount = raceEvents.reduce((sum, race) => sum + race.SeriesEventResults.length, 0)
  const dnqCount = raceEvents.reduce(
    (sum, race) => sum + race.SeriesEventResults.filter((row) => row.result_section === 'DNQ').length,
    0,
  )
  const mrnStandings = getSlingerNationalsMrnStandings(seasonYear)
  const champion = mrnStandings?.rows.find((row) => row.position === 1) ?? null
  const previousYear = seasonYear > MIN_YEAR ? seasonYear - 1 : null
  const nextYear = seasonYear < MAX_YEAR ? seasonYear + 1 : null

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span>/</span>
            <Link href="/events" style={breadcrumbLink}>Special Events</Link>
            <span>/</span>
            <Link href="/events/slinger-nationals" style={breadcrumbLink}>Slinger Nationals</Link>
            <span>/</span>
            <span>{seasonYear}</span>
          </div>

          <div style={eyebrow}>Slinger Nationals Archive</div>
          <h1 style={pageTitle}>{seasonYear} Slinger Nationals</h1>
          <p style={heroTagline}>
            {seriesEra
              ? `${liveRaceCount}-race Slinger Nationals series season.`
              : 'Annual Slinger Nationals special event.'}
          </p>

          <div style={statRow}>
            <Stat label="Archive Era" value={seriesEra ? 'Series' : 'Annual'} />
            <Stat label="Race Events" value={String(liveRaceCount)} />
            <Stat label="Result Rows" value={String(resultCount)} />
            <Stat label="DNQs" value={String(dnqCount)} />
            <Stat label="Points Source" value={mrnYears.has(seasonYear) ? 'MRN + TTT' : 'The Third Turn'} />
            {champion ? <Stat label="Published Champion" value={champion.driver} /> : null}
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={yearNav}>
          {previousYear ? (
            <Link href={`/events/slinger-nationals/${previousYear}`} style={yearNavLink}>← {previousYear}</Link>
          ) : <span />}
          <Link href="/events/slinger-nationals" style={yearNavCenter}>All Years</Link>
          {nextYear ? (
            <Link href={`/events/slinger-nationals/${nextYear}`} style={yearNavLink}>{nextYear} →</Link>
          ) : <span />}
        </div>

        <Panel title="Race Results">
          {raceError ? (
            <div style={statusBox}>Unable to load the live race archive.</div>
          ) : raceEvents.length > 0 ? (
            <div style={raceStack}>
              {raceEvents.map((race) => {
                const featureRows = race.SeriesEventResults
                  .filter((row) => row.result_section !== 'DNQ')
                  .sort((a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
                const dnqRows = race.SeriesEventResults
                  .filter((row) => row.result_section === 'DNQ')
                  .sort((a, b) => a.driver_name.localeCompare(b.driver_name))

                return (
                  <section key={race.id} style={raceCard}>
                    <div style={raceTitleRow}>
                      <div>
                        <div style={raceEyebrow}>Race {race.race_number ?? '—'}</div>
                        <h3 style={raceTitle}>{formatDate(race.race_date)}</h3>
                      </div>
                      <div style={winnerBlock}>
                        <span style={winnerLabel}>Winner</span>
                        <strong>{race.winner_name ?? 'Not listed'}</strong>
                      </div>
                    </div>

                    <div style={resultsHeader}>
                      <span>Pos.</span>
                      <span>Car</span>
                      <span>Driver</span>
                      <span>Start</span>
                      <span>Laps</span>
                      <span>Status</span>
                    </div>
                    {featureRows.map((row) => (
                      <div key={row.id} style={resultsRow}>
                        <strong>{row.finishing_position ?? '—'}</strong>
                        <span>{row.car_number ?? '—'}</span>
                        <strong>{row.driver_name}</strong>
                        <span>{row.starting_position ?? '—'}</span>
                        <span>{row.laps ?? '—'}</span>
                        <span>{row.status ?? '—'}</span>
                      </div>
                    ))}

                    {dnqRows.length > 0 ? (
                      <div style={dnqBlock}>
                        <div style={dnqTitle}>Did Not Qualify</div>
                        <div style={dnqGrid}>
                          {dnqRows.map((row) => (
                            <div key={row.id} style={dnqChip}>
                              <strong>{row.driver_name}</strong>
                              {row.car_number ? <span>#{row.car_number}</span> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                )
              })}
            </div>
          ) : (
            <div style={statusBox}>No race archive is currently available for this year.</div>
          )}
        </Panel>

        <Panel title="Point Standings">
          {mrnStandings ? (
            <div>
              <div style={sourceNote}>
                <strong>{mrnStandings.source}</strong> — {mrnStandings.coverage}
              </div>
              <div style={standingsHeader}>
                <span>Pos.</span>
                <span>Driver</span>
                <span style={{ textAlign: 'right' }}>Points</span>
              </div>
              {mrnStandings.rows.map((row) => (
                <div key={`${seasonYear}-${row.position}-${row.driver}`} style={standingsRow}>
                  <strong>{row.position}</strong>
                  <span>{row.driver}</span>
                  <strong style={{ textAlign: 'right' }}>{row.points.toLocaleString('en-US')}</strong>
                </div>
              ))}
              <p style={standingsFoot}>
                Only clearly confirmed published positions are shown. Missing positions or point totals are not reconstructed.
              </p>
            </div>
          ) : (
            <p style={panelText}>
              Available point standings will be shown exactly as preserved by the historical source. Missing point totals
              remain blank rather than estimated.
            </p>
          )}
        </Panel>

        <Panel title="Source Attribution">
          <p style={panelText}>
            Primary race-results source: The Third Turn. Supplemental final standings source where identified:
            Midwest Racing News. DNQ entries are stored separately from the feature finishing order.
          </p>
        </Panel>

        <Link href="/events/slinger-nationals" style={backButton}>← Back to Slinger Nationals</Link>
      </section>
    </main>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Date not listed'
  const [year, month, day] = value.split('-')
  return `${Number(month)}/${Number(day)}/${year}`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={panel}>
      <div style={panelHeader}>{title}</div>
      <div style={panelBody}>{children}</div>
    </div>
  )
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const heroSection: CSSProperties = { background: 'linear-gradient(to bottom,#e7d9bf,#eadfc7)', borderBottom: '2px solid #b29364' }
const heroInner: CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 34px' }
const breadcrumbRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '14px', color: '#6b4a22', marginBottom: '20px' }
const breadcrumbLink: CSSProperties = { color: '#7a5827', textDecoration: 'none', fontWeight: 700 }
const eyebrow: CSSProperties = { fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const pageTitle: CSSProperties = { fontSize: '52px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }
const heroTagline: CSSProperties = { fontSize: '22px', fontStyle: 'italic', color: '#6f4d24', margin: 0 }
const statRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginTop: '22px', maxWidth: '1000px' }
const statCard: CSSProperties = { background: '#f1e5ce', border: '1px solid #b89b6d', padding: '14px' }
const statLabel: CSSProperties = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#7a5827' }
const statValue: CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#3d2b16', marginTop: '4px' }
const contentWrap: CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 44px', display: 'grid', gap: '18px' }
const yearNav: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px' }
const yearNavLink: CSSProperties = { color: '#6a4a1f', fontWeight: 700, textDecoration: 'none' }
const yearNavCenter: CSSProperties = { color: '#fff8ea', background: '#7a5827', border: '1px solid #5d3f17', padding: '7px 11px', textDecoration: 'none', fontWeight: 700 }
const panel: CSSProperties = { background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }
const panelHeader: CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#5b3a1b', marginBottom: '8px' }
const panelBody: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }
const panelText: CSSProperties = { fontSize: '16px', lineHeight: 1.65, margin: 0 }
const statusBox: CSSProperties = { marginTop: '12px', padding: '10px 12px', background: '#eadfc7', border: '1px solid #b89b6d', fontWeight: 700, color: '#6b4a22' }
const raceStack: CSSProperties = { display: 'grid', gap: '18px' }
const raceCard: CSSProperties = { border: '1px solid #b29364', background: '#eadfc7', padding: '14px' }
const raceTitleRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'end', marginBottom: '12px' }
const raceEyebrow: CSSProperties = { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px', color: '#7a5827', fontWeight: 700 }
const raceTitle: CSSProperties = { margin: '3px 0 0', fontSize: '23px', color: '#3d2b16' }
const winnerBlock: CSSProperties = { display: 'grid', textAlign: 'right', gap: '2px' }
const winnerLabel: CSSProperties = { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', color: '#7a5827', fontWeight: 700 }
const resultsHeader: CSSProperties = { display: 'grid', gridTemplateColumns: '55px 70px minmax(170px,1fr) 60px 65px minmax(90px,130px)', gap: '8px', padding: '7px 0', borderBottom: '2px solid #b29364', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.6px', color: '#7a5827', fontWeight: 700 }
const resultsRow: CSSProperties = { display: 'grid', gridTemplateColumns: '55px 70px minmax(170px,1fr) 60px 65px minmax(90px,130px)', gap: '8px', padding: '8px 0', borderBottom: '1px solid #ccb48a', alignItems: 'center', fontSize: '14px' }
const dnqBlock: CSSProperties = { marginTop: '14px', borderTop: '2px solid #b29364', paddingTop: '12px' }
const dnqTitle: CSSProperties = { fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.8px', color: '#7a5827', fontWeight: 700, marginBottom: '8px' }
const dnqGrid: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '7px' }
const dnqChip: CSSProperties = { display: 'flex', gap: '6px', alignItems: 'center', background: '#f1e5ce', border: '1px solid #c2a97d', padding: '6px 8px', fontSize: '13px' }
const sourceNote: CSSProperties = { fontSize: '14px', color: '#6b4a22', marginBottom: '12px' }
const standingsHeader: CSSProperties = { display: 'grid', gridTemplateColumns: '70px 1fr 110px', gap: '12px', padding: '8px 0', borderBottom: '2px solid #b29364', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.7px', color: '#7a5827', fontWeight: 700 }
const standingsRow: CSSProperties = { display: 'grid', gridTemplateColumns: '70px 1fr 110px', gap: '12px', padding: '9px 0', borderBottom: '1px solid #ccb48a', alignItems: 'center' }
const standingsFoot: CSSProperties = { fontSize: '13px', lineHeight: 1.5, color: '#6b4a22', margin: '12px 0 0' }
const backButton: CSSProperties = { display: 'inline-block', justifySelf: 'start', background: '#7a5827', color: '#fff8ea', padding: '10px 14px', border: '1px solid #5d3f17', textDecoration: 'none', fontWeight: 700 }
