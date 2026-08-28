import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type CareerProfile = {
  summary?: string
  headlineChampionships: number
}

type CareerAccomplishment = {
  id: number
  year: number | null
  accomplishment_date: string | null
  accomplishment_type: string
  series_name: string | null
  event_name: string | null
  track_name: string | null
  finishing_position: number | null
  championship_level: string | null
  geography: string | null
  source_name: string | null
  source_url: string | null
  display_priority: number | null
  notes: string | null
}

// Temporary compatibility metadata for the profile hero while page.tsx is
// migrated to calculate its headline championship count directly from Supabase.
const LEGACY_PROFILE_META: Record<string, CareerProfile> = {
  'dick-trickle': {
    summary: 'One of the most accomplished short-track stock car drivers in American racing history, with major success across ARTGO, ASA, national touring series, and marquee events beyond the museum’s core reporting area.',
    headlineChampionships: 10,
  },
  'kevin-adams': { headlineChampionships: 4 },
  'tom-reffner': { headlineChampionships: 2 },
  'miles-melius': { headlineChampionships: 2 },
  'pete-parker': { headlineChampionships: 1 },
  'rod-snellenberger': { headlineChampionships: 2 },
  'bill-johnson-jr': { headlineChampionships: 0 },
  'terry-van-roy': { headlineChampionships: 0 },
  'curt-myers': { headlineChampionships: 3 },
  'benji-lacrosse': { headlineChampionships: 2 },
}

export function getDriverCareerProfile(slug: string) {
  return LEGACY_PROFILE_META[slug] ?? null
}

export async function DriverCareerAccomplishments({ slug }: { slug: string }) {
  const { data } = await supabase
    .from('DriverCareerAccomplishments')
    .select('id, year, accomplishment_date, accomplishment_type, series_name, event_name, track_name, finishing_position, championship_level, geography, source_name, source_url, display_priority, notes')
    .eq('driver_slug', slug)
    .eq('is_published', true)
    .order('display_priority', { ascending: true })
    .order('year', { ascending: true, nullsFirst: false })

  const rows = (data ?? []) as CareerAccomplishment[]
  if (!rows.length) return null

  const championships = rows.filter((row) => isChampionship(row.accomplishment_type))
  const majorVictories = rows.filter((row) => row.accomplishment_type === 'MAJOR_EVENT_WIN')
  const outsideWins = rows.filter((row) => row.accomplishment_type === 'OUTSIDE_AREA_FEATURE_WIN')
  const majorTop5s = rows.filter((row) => row.accomplishment_type === 'MAJOR_TOP5')
  const summaries = rows.filter((row) => row.accomplishment_type === 'CAREER_SERIES_SUMMARY')

  return (
    <section style={{ margin: '10px 0 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
        <span style={{ height: '1px', background: '#b29364', flex: 1 }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8a632b', fontWeight: 700 }}>Documented Career History</div>
          <h2 style={{ fontSize: '31px', margin: '4px 0 0', color: '#3d2b16' }}>Career Accomplishments</h2>
        </div>
        <span style={{ height: '1px', background: '#b29364', flex: 1 }} />
      </div>

      <p style={{ margin: '0 auto 16px', maxWidth: '970px', textAlign: 'center', fontSize: '15px', lineHeight: 1.65, color: '#5a4327' }}>
        Verified career accomplishments beyond the museum’s normal race-result coverage, with existing museum results kept in their original event and championship records.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: '14px' }}>
        {championships.length > 0 && (
          <CareerCard title="Championships" icon="★">
            <CareerList items={championships.map(formatAccomplishment)} />
          </CareerCard>
        )}

        {(summaries.length > 0 || outsideWins.length > 0 || majorTop5s.length > 0) && (
          <CareerCard title="Major Series Success" icon="◆">
            <CareerList items={[...summaries, ...outsideWins, ...majorTop5s].map(formatAccomplishment)} />
          </CareerCard>
        )}

        {majorVictories.length > 0 && (
          <CareerCard title="Selected Major Victories" icon="🏁">
            <CareerList items={majorVictories.map(formatAccomplishment)} />
          </CareerCard>
        )}
      </div>

      <div style={{ marginTop: '12px', padding: '9px 14px', borderTop: '1px solid #c8aa79', borderBottom: '1px solid #c8aa79', fontSize: '12px', lineHeight: 1.55, color: '#6a5337', fontStyle: 'italic', textAlign: 'center' }}>
        Career accomplishments shown here are independently verified additions. Museum-recorded race results and championships are not duplicated in this section.
      </div>
    </section>
  )
}

function isChampionship(type: string) {
  return ['SERIES_CHAMPIONSHIP', 'REGIONAL_CHAMPIONSHIP', 'NATIONAL_CHAMPIONSHIP', 'TRACK_CHAMPIONSHIP'].includes(type)
}

function formatAccomplishment(row: CareerAccomplishment) {
  const year = row.year ? `${row.year} ` : ''

  if (isChampionship(row.accomplishment_type)) {
    const label = row.series_name || row.track_name || row.notes || 'Championship'
    return `${year}${label} Champion`
  }

  if (row.accomplishment_type === 'MAJOR_EVENT_WIN') {
    const event = row.event_name || row.series_name || 'Major event'
    const location = [row.track_name, row.geography].filter(Boolean).join(', ')
    return `${year}${event}${location ? ` — ${location}` : ''}`
  }

  if (row.accomplishment_type === 'OUTSIDE_AREA_FEATURE_WIN') {
    const label = row.event_name || row.series_name || 'Feature win'
    const location = [row.track_name, row.geography].filter(Boolean).join(', ')
    return `${year}${label}${location ? ` — ${location}` : ''}`
  }

  if (row.accomplishment_type === 'MAJOR_TOP5') {
    const event = row.event_name || row.series_name || 'Major event'
    const finish = row.finishing_position ? ` — P${row.finishing_position}` : ''
    return `${year}${event}${finish}`
  }

  return row.notes || `${year}${row.series_name || row.event_name || 'Documented career accomplishment'}`
}

function CareerCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid #c8b18a', background: '#f7eedf', padding: '17px 18px', minHeight: '178px', boxShadow: '0 4px 12px rgba(73,48,21,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px', fontWeight: 700, color: '#5b3a1b', marginBottom: '11px', borderBottom: '1px solid #dbc8a7', paddingBottom: '8px' }}>
        <span style={{ color: '#8a632b' }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function CareerList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '18px', color: '#3f2d18', fontSize: '13px', lineHeight: 1.6 }}>
      {items.map((item, index) => <li key={`${item}-${index}`} style={{ marginBottom: '6px' }}>{item}</li>)}
    </ul>
  )
}
