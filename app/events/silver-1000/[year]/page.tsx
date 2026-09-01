import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const LATE_MODEL_SERIES_ID = 93
const MODIFIED_SERIES_ID = 94
const MIN_YEAR = 1973
const MAX_YEAR = 2025
const MODIFIED_FIRST_YEAR = 1988

type ResultRow = {
  id: number
  finishing_position: number | null
  starting_position: number | null
  car_number: string | null
  driver_name: string
  status: string | null
  result_section: string | null
}

type RaceRow = {
  id: number
  race_date: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: ResultRow[]
}

export default async function Silver1000YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const seasonYear = Number(year)
  if (!Number.isInteger(seasonYear) || seasonYear < MIN_YEAR || seasonYear > MAX_YEAR) notFound()

  const [{ data: season }, { data: lateModelsRaw, error: lateError }, { data: modifiedsRaw, error: modifiedError }] = await Promise.all([
    supabase.from('SeriesSeasons').select('year,races').eq('series_id', LATE_MODEL_SERIES_ID).eq('year', seasonYear).maybeSingle(),
    supabase.from('SeriesEvents').select(`id,race_date,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,status,result_section)`).eq('series_id', LATE_MODEL_SERIES_ID).gte('race_date', `${seasonYear}-01-01`).lte('race_date', `${seasonYear}-12-31`).order('race_date', { ascending: true }),
    supabase.from('SeriesEvents').select(`id,race_date,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,status,result_section)`).eq('series_id', MODIFIED_SERIES_ID).gte('race_date', `${seasonYear}-01-01`).lte('race_date', `${seasonYear}-12-31`).order('race_date', { ascending: true }),
  ])

  const lateModels = (lateModelsRaw ?? []) as RaceRow[]
  const modifieds = (modifiedsRaw ?? []) as RaceRow[]
  const cancelled = season?.races === 0
  const hasModifiedDivision = seasonYear >= MODIFIED_FIRST_YEAR && seasonYear !== 2020
  const previousYear = seasonYear > MIN_YEAR ? seasonYear - 1 : null
  const nextYear = seasonYear < MAX_YEAR ? seasonYear + 1 : null

  return (
    <main style={pageStyle}>
      <section style={hero}>
        <div style={heroInner}>
          <div style={breadcrumbs}>
            <Link href="/events" style={linkStyle}>Special Events</Link><span>/</span>
            <Link href="/events/silver-1000" style={linkStyle}>Silver 1000</Link><span>/</span><span>{seasonYear}</span>
          </div>
          <div style={eyebrow}>Silver 1000 Archive</div>
          <h1 style={title}>{seasonYear} Silver 1000</h1>
          <p style={tagline}>
            {cancelled ? 'Event cancelled.' : hasModifiedDivision ? 'Late Model and Modified divisions at Proctor Speedway.' : 'Late Model Division at Proctor Speedway.'}
          </p>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={yearNav}>
          {previousYear ? <Link href={`/events/silver-1000/${previousYear}`} style={linkStyle}>← {previousYear}</Link> : <span />}
          <Link href="/events/silver-1000" style={allYears}>All Years</Link>
          {nextYear ? <Link href={`/events/silver-1000/${nextYear}`} style={{ ...linkStyle, textAlign: 'right' }}>{nextYear} →</Link> : <span />}
        </div>

        {cancelled ? (
          <div style={panel}><h2 style={panelTitle}>2020 Edition</h2><div style={panelBody}>The Silver 1000 was cancelled in 2020. No race result is fabricated for the missing edition.</div></div>
        ) : (
          <>
            <DivisionSection title="Late Model Division" races={lateModels} error={Boolean(lateError)} />
            {hasModifiedDivision ? <DivisionSection title="Modified Division" races={modifieds} error={Boolean(modifiedError)} /> : null}
          </>
        )}
      </section>
    </main>
  )
}

function DivisionSection({ title, races, error }: { title: string; races: RaceRow[]; error: boolean }) {
  return (
    <section style={divisionSection}>
      <div style={divisionHeading}>{title}</div>
      {error ? (
        <div style={panel}><div style={panelBody}>Unable to load this division from the Museum database.</div></div>
      ) : races.length ? (
        races.map((race) => {
          const feature = race.SeriesEventResults.filter(r => !['DNQ', 'DNS'].includes(r.result_section ?? '')).sort((a,b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
          const dnq = race.SeriesEventResults.filter(r => ['DNQ', 'DNS'].includes(r.result_section ?? '')).sort((a,b) => a.driver_name.localeCompare(b.driver_name))
          return (
            <div key={race.id} style={panel}>
              <div style={panelTitle}>{formatDate(race.race_date)} — Winner: {race.winner_name ?? 'Not listed'}</div>
              <div style={panelBody}>
                <div style={resultsHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>
                {feature.map(row => (
                  <div key={row.id} style={resultsRow}>
                    <strong>{row.finishing_position ?? '—'}</strong><span>{row.car_number ?? '—'}</span><strong>{row.driver_name}</strong><span>{row.starting_position ?? '—'}</span><span>{row.status ?? '—'}</span>
                  </div>
                ))}
                {dnq.length ? <div style={dnqWrap}><div style={dnqTitle}>Did Not Start / Qualify</div>{dnq.map(row => <span key={row.id} style={dnqChip}>{row.driver_name}{row.car_number ? ` #${row.car_number}` : ''}</span>)}</div> : null}
                <p style={note}>Only positions preserved by historical sources are shown. Missing finishing positions are not reconstructed.</p>
              </div>
            </div>
          )
        })
      ) : (
        <div style={panel}><div style={panelBody}>No race record is currently available for this division.</div></div>
      )}
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
const panelTitle: CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#5b3a1b', margin: '0 0 8px' }
const panelBody: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }
const resultsHeader: CSSProperties = { display: 'grid', gridTemplateColumns: '60px 70px minmax(180px,1fr) 70px 120px', gap: '8px', padding: '7px 0', borderBottom: '2px solid #b29364', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const resultsRow: CSSProperties = { display: 'grid', gridTemplateColumns: '60px 70px minmax(180px,1fr) 70px 120px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #ccb48a', alignItems: 'center', fontSize: '14px' }
const dnqWrap: CSSProperties = { marginTop: '14px', paddingTop: '12px', borderTop: '2px solid #b29364', display: 'flex', gap: '7px', flexWrap: 'wrap' }
const dnqTitle: CSSProperties = { width: '100%', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const dnqChip: CSSProperties = { background: '#eadfc7', border: '1px solid #b89b6d', padding: '5px 7px', fontSize: '13px' }
const note: CSSProperties = { margin: '12px 0 0', fontSize: '13px', lineHeight: 1.5, color: '#6b4a22' }
