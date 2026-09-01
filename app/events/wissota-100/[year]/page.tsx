import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SERIES_IDS = [95, 96, 98, 99, 100, 101, 102, 103]
const MIN_YEAR = 1986
const MAX_YEAR = 2025

const divisionNames: Record<number, string> = {
  95: 'Late Model Division',
  96: 'Modified Division',
  98: 'Super Stock Division',
  99: 'Street Stock Division',
  100: 'Midwest Modified Division',
  101: 'Mod Four Division',
  102: 'Pure Stock Division',
  103: 'Hornet Division',
}

type ResultRow = {
  id: number
  finishing_position: number | null
  starting_position: string | null
  car_number: string | null
  driver_name: string
  status: string | null
  result_section: string | null
}

type RaceRow = {
  id: number
  series_id: number | null
  race_date: string | null
  track_name: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: ResultRow[]
}

export default async function Wissota100YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const seasonYear = Number(year)
  if (!Number.isInteger(seasonYear) || seasonYear < MIN_YEAR || seasonYear > MAX_YEAR) notFound()

  const { data: racesRaw, error } = await supabase
    .from('SeriesEvents')
    .select(`id,series_id,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,status,result_section)`)
    .in('series_id', SERIES_IDS)
    .gte('race_date', `${seasonYear}-01-01`)
    .lte('race_date', `${seasonYear}-12-31`)
    .order('series_id', { ascending: true })
    .order('race_date', { ascending: true })

  const races = (racesRaw ?? []) as RaceRow[]
  const cancelled = seasonYear === 1987 || seasonYear === 2020
  const previousYear = seasonYear > MIN_YEAR ? seasonYear - 1 : null
  const nextYear = seasonYear < MAX_YEAR ? seasonYear + 1 : null

  const grouped = new Map<number, RaceRow[]>()
  for (const race of races) {
    if (!race.series_id) continue
    if (!grouped.has(race.series_id)) grouped.set(race.series_id, [])
    grouped.get(race.series_id)!.push(race)
  }

  return (
    <main style={pageStyle}>
      <section style={hero}>
        <div style={heroInner}>
          <div style={breadcrumbs}>
            <Link href="/events" style={linkStyle}>Special Events</Link><span>/</span>
            <Link href="/events/wissota-100" style={linkStyle}>WISSOTA 100</Link><span>/</span><span>{seasonYear}</span>
          </div>
          <div style={eyebrow}>WISSOTA 100 Archive</div>
          <h1 style={title}>{seasonYear} WISSOTA 100</h1>
          <p style={tagline}>
            {cancelled ? (seasonYear === 2020 ? 'Event cancelled during COVID.' : 'Event rained out.') : races.length ? `${grouped.size} documented championship division${grouped.size === 1 ? '' : 's'}.` : 'No championship record currently available.'}
          </p>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={yearNav}>
          {previousYear ? <Link href={`/events/wissota-100/${previousYear}`} style={linkStyle}>← {previousYear}</Link> : <span />}
          <Link href="/events/wissota-100" style={allYears}>All Years</Link>
          {nextYear ? <Link href={`/events/wissota-100/${nextYear}`} style={{ ...linkStyle, textAlign: 'right' }}>{nextYear} →</Link> : <span />}
        </div>

        {cancelled ? (
          <div style={panel}><h2 style={panelTitle}>{seasonYear} Edition</h2><div style={panelBody}>{seasonYear === 2020 ? 'The WISSOTA 100 was cancelled during the COVID-19 season. No result is fabricated for this edition.' : 'The 1987 WISSOTA 100 was rained out. No result is fabricated for this edition.'}</div></div>
        ) : error ? (
          <div style={panel}><div style={panelBody}>Unable to load this WISSOTA 100 year from the Museum database.</div></div>
        ) : races.length ? (
          SERIES_IDS.filter(id => grouped.has(id)).map(id => (
            <DivisionSection key={id} title={divisionNames[id]} races={grouped.get(id) ?? []} />
          ))
        ) : (
          <div style={panel}><div style={panelBody}>No WISSOTA 100 championship result is currently documented for this year.</div></div>
        )}
      </section>
    </main>
  )
}

function DivisionSection({ title, races }: { title: string; races: RaceRow[] }) {
  return (
    <section style={divisionSection}>
      <div style={divisionHeading}>{title}</div>
      {races.map((race, raceIndex) => {
        const feature = race.SeriesEventResults
          .filter(r => !['DNQ', 'DNS'].includes((r.result_section ?? '').toUpperCase()))
          .sort((a,b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
        const dnq = race.SeriesEventResults
          .filter(r => ['DNQ', 'DNS'].includes((r.result_section ?? '').toUpperCase()))
          .sort((a,b) => a.driver_name.localeCompare(b.driver_name))
        const raceLabel = races.length > 1 ? `Feature ${raceIndex + 1}` : 'Championship Feature'

        return (
          <div key={race.id} style={panel}>
            <div style={panelTitle}>{raceLabel} — {formatDate(race.race_date)}{race.track_name ? ` — ${race.track_name}` : ''}</div>
            <div style={winnerBar}>Winner: <strong>{race.winner_name ?? feature.find(r => r.finishing_position === 1)?.driver_name ?? 'Not listed'}</strong></div>
            <div style={panelBody}>
              {feature.length ? (
                <>
                  <div style={resultsHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>
                  {feature.map(row => (
                    <div key={row.id} style={resultsRow}>
                      <strong>{row.finishing_position ?? '—'}</strong><span>{row.car_number ?? '—'}</span><strong>{row.driver_name}</strong><span>{row.starting_position ?? '—'}</span><span>{row.status ?? '—'}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={winnerOnly}>Winner-only record preserved for this division.</div>
              )}
              {dnq.length ? <div style={dnqWrap}><div style={dnqTitle}>Did Not Start / Qualify</div>{dnq.map(row => <span key={row.id} style={dnqChip}>{row.driver_name}{row.car_number ? ` #${row.car_number}` : ''}</span>)}</div> : null}
              <p style={note}>Only positions preserved by historical sources are shown. Missing finishing positions are not reconstructed. Race of Champions and qualifying-night features are maintained separately.</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Date not listed'
  const [y,m,d] = value.split('-')
  return `${Number(m)}/${Number(d)}/${y}`
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const hero: CSSProperties = { background: 'linear-gradient(to bottom,#e7d9bf,#eadfc7)', borderBottom: '2px solid #b29364' }
const heroInner: CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 34px' }
const breadcrumbs: CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '14px', marginBottom: '20px', color: '#6b4a22' }
const linkStyle: CSSProperties = { color: '#6a4a1f', fontWeight: 700, textDecoration: 'none' }
const eyebrow: CSSProperties = { fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const title: CSSProperties = { fontSize: '52px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }
const tagline: CSSProperties = { fontSize: '22px', fontStyle: 'italic', color: '#6f4d24', margin: 0 }
const contentWrap: CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 44px', display: 'grid', gap: '18px' }
const yearNav: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px' }
const allYears: CSSProperties = { color: '#fff8ea', background: '#7a5827', border: '1px solid #5d3f17', padding: '7px 11px', textDecoration: 'none', fontWeight: 700 }
const divisionSection: CSSProperties = { display: 'grid', gap: '10px' }
const divisionHeading: CSSProperties = { fontSize: '25px', fontWeight: 700, color: '#3d2b16', borderBottom: '2px solid #9b7440', padding: '6px 0 8px' }
const panel: CSSProperties = { background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }
const panelTitle: CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#5b3a1b', margin: '0 0 8px' }
const winnerBar: CSSProperties = { background: '#ead6ae', border: '1px solid #b29364', padding: '8px 10px', marginBottom: '8px', color: '#5b3a1b' }
const panelBody: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }
const resultsHeader: CSSProperties = { display: 'grid', gridTemplateColumns: '60px 70px minmax(180px,1fr) 70px 120px', gap: '8px', padding: '7px 0', borderBottom: '2px solid #b29364', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const resultsRow: CSSProperties = { display: 'grid', gridTemplateColumns: '60px 70px minmax(180px,1fr) 70px 120px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #ccb48a', alignItems: 'center', fontSize: '14px' }
const winnerOnly: CSSProperties = { padding: '8px 0', fontStyle: 'italic', color: '#6b4a22' }
const dnqWrap: CSSProperties = { marginTop: '14px', paddingTop: '12px', borderTop: '2px solid #b29364', display: 'flex', gap: '7px', flexWrap: 'wrap' }
const dnqTitle: CSSProperties = { width: '100%', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const dnqChip: CSSProperties = { background: '#eadfc7', border: '1px solid #b89b6d', padding: '5px 7px', fontSize: '13px' }
const note: CSSProperties = { margin: '12px 0 0', fontSize: '13px', lineHeight: 1.5, color: '#6b4a22' }
