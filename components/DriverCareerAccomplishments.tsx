import { supabase } from '@/lib/supabase'
import styles from './DriverCareerAccomplishments.module.css'

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

    const seriesIds = Array.from(new Set(
      (seasonRows ?? []).map((row: any) => Number(row.series_id)).filter(Boolean),
    ))
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

  const groups = [
    championshipItems.length ? { kicker: 'Championship record', title: 'Series Championships', items: championshipItems } : null,
    summaries.length || majorTop5s.length
      ? { kicker: 'Touring & major events', title: 'Major Series Success', items: [...summaries, ...majorTop5s].map(formatAccomplishment) }
      : null,
    selectedVictories.length
      ? { kicker: 'Selected victories', title: 'Major & Touring Wins', items: selectedVictories.map(formatAccomplishment) }
      : null,
  ].filter(Boolean) as Array<{ kicker: string; title: string; items: string[] }>

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span>Documented career history</span>
          <h2>Career Accomplishments</h2>
        </div>
        <p>Verified broader-career milestones alongside the museum&apos;s original event records.</p>
      </div>

      <div className={styles.grid}>
        {groups.map((group, index) => (
          <article className={styles.card} key={group.title}>
            <div className={styles.cardHeading}>
              <span>{String(index + 1).padStart(2, '0')} · {group.kicker}</span>
              <h3>{group.title}</h3>
            </div>
            <ul>
              {group.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>

      {trackChampionships.length > 0 ? (
        <p className={styles.note}>
          Additional verified track championships are included in the Track Championships total and championship archive below.
        </p>
      ) : null}

      <p className={styles.disclaimer}>
        Museum series championships and verified broader-career records are merged and deduplicated here. Museum-recorded race results remain in their original event records.
      </p>
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
