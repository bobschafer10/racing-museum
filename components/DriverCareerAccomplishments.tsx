import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

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

type MuseumSeriesChampionship = {
  year: number | null
  series_name: string
}

export async function DriverCareerAccomplishments({ slug }: { slug: string }) {
  const [{ data }, { data: driverRow }] = await Promise.all([
    supabase
      .from('DriverCareerAccomplishments')
      .select('id, year, accomplishment_date, accomplishment_type, series_name, event_name, track_name, finishing_position, championship_level, geography, source_name, source_url, display_priority, notes')
      .eq('driver_slug', slug)
      .eq('is_published', true)
      .order('display_priority', { ascending: true })
      .order('year', { ascending: true, nullsFirst: false })
      .order('accomplishment_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('driver_directory_alpha_view')
      .select('driver_id')
      .eq('driver_slug', slug)
      .maybeSingle(),
  ])

  const rows = (data ?? []) as CareerAccomplishment[]
  const driverId = Number((driverRow as any)?.driver_id || 0)

  let museumSeriesChampionships: MuseumSeriesChampionship[] = []
  if (driverId) {
    const { data: seasonRows } = await supabase
      .from('SeriesSeasons')
      .select('series_id, year')
      .eq('champion_driver_id', driverId)
      .order('year', { ascending: true })

    const seriesIds = Array.from(new Set((seasonRows ?? []).map((row: any) => Number(row.series_id)).filter(Boolean)))
    const { data: seriesRows } = seriesIds.length
      ? await supabase.from('Series').select('id, series_name').in('id', seriesIds)
      : { data: [] as any[] }

    const seriesNameById = new Map<number, string>()
    for (const row of seriesRows ?? []) {
      seriesNameById.set(Number((row as any).id), String((row as any).series_name || 'Series'))
    }

    museumSeriesChampionships = (seasonRows ?? []).map((row: any) => ({
      year: row.year ?? null,
      series_name: seriesNameById.get(Number(row.series_id)) || 'Series',
    }))
  }

  if (!rows.length && !museumSeriesChampionships.length) return null

  const externalChampionships = rows.filter((row) => isSeriesChampionship(row.accomplishment_type))
  const trackChampionships = rows.filter((row) => row.accomplishment_type === 'TRACK_CHAMPIONSHIP')
  const majorVictories = rows.filter((row) => row.accomplishment_type === 'MAJOR_EVENT_WIN')
  const outsideWins = rows.filter((row) => row.accomplishment_type === 'OUTSIDE_AREA_FEATURE_WIN')
  const majorTop5s = rows.filter((row) => row.accomplishment_type === 'MAJOR_TOP5')
  const summaries = rows.filter((row) => row.accomplishment_type === 'CAREER_SERIES_SUMMARY')
  const selectedVictories = [...majorVictories, ...outsideWins]

  const championshipItems = mergeSeriesChampionships(museumSeriesChampionships, externalChampionships)

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
        Documented series championships and verified broader-career accomplishments, with museum-recorded race results kept in their original event records.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: '14px' }}>
        {championshipItems.length > 0 && (
          <CareerCard title="Series Championships" icon="★">
            <CareerList items={championshipItems} />
          </CareerCard>
        )}

        {(summaries.length > 0 || majorTop5s.length > 0) && (
          <CareerCard title="Major Series Success" icon="◆">
            <CareerList items={[...summaries, ...majorTop5s].map(formatAccomplishment)} />
          </CareerCard>
        )}

        {selectedVictories.length > 0 && (
          <CareerCard title="Selected Major & Touring Victories" icon="🏁">
            <CareerList items={selectedVictories.map(formatAccomplishment)} />
          </CareerCard>
        )}
      </div>

      {trackChampionships.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '12px', lineHeight: 1.55, color: '#6a5337', textAlign: 'center' }}>
          Additional verified track championships are reflected in the Track Championships total and track-championship section below.
        </div>
      )}

      <div style={{ marginTop: '12px', padding: '9px 14px', borderTop: '1px solid #c8aa79', borderBottom: '1px solid #c8aa79', fontSize: '12px', lineHeight: 1.55, color: '#6a5337', fontStyle: 'italic', textAlign: 'center' }}>
        Museum series championships are merged with verified broader-career championship records and deduplicated here. Museum-recorded race results are not duplicated.
      </div>
    </section>
  )
}

function isSeriesChampionship(type: string) {
  return ['SERIES_CHAMPIONSHIP', 'REGIONAL_CHAMPIONSHIP', 'NATIONAL_CHAMPIONSHIP'].includes(type)
}

function mergeSeriesChampionships(museumRows: MuseumSeriesChampionship[], externalRows: CareerAccomplishment[]) {
  const items: { year: number | null; series: string; label: string }[] = []
  const seen = new Set<string>()

  for (const row of museumRows) {
    const key = `${row.year ?? ''}|${normalizeSeriesName(row.series_name)}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      year: row.year,
      series: row.series_name,
      label: `${row.year ? `${row.year} ` : ''}${row.series_name} Champion`,
    })
  }

  for (const row of externalRows) {
    const series = row.series_name || row.track_name || row.notes || 'Championship'
    const key = `${row.year ?? ''}|${normalizeSeriesName(series)}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      year: row.year,
      series,
      label: `${row.year ? `${row.year} ` : ''}${series} Champion`,
    })
  }

  return items
    .sort((a, b) => (a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER) || a.series.localeCompare(b.series))
    .map((item) => item.label)
}

function normalizeSeriesName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function formatAccomplishment(row: CareerAccomplishment) {
  const year = row.year ? `${row.year} ` : ''

  if (isSeriesChampionship(row.accomplishment_type) || row.accomplishment_type === 'TRACK_CHAMPIONSHIP') {
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
