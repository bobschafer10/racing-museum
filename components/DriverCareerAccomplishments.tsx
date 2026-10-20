import { supabase } from '@/lib/supabase'
import { isSpecialEventSeriesId } from '@/lib/series-accomplishment-classification'
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

type MuseumSeriesWin = {
  series_id: number
  wins: number
}

type MuseumTrackChampionship = {
  year: number | string | null
  track_name: string
  class_name: string | null
}

export async function DriverCareerAccomplishments({
  slug,
  seriesWins = [],
  trackChampionships = [],
}: {
  slug: string
  seriesWins?: MuseumSeriesWin[]
  trackChampionships?: MuseumTrackChampionship[]
}) {
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

  const { data: seasonRows } = driverId
    ? await supabase
        .from('SeriesSeasons')
        .select('series_id, year')
        .eq('champion_driver_id', driverId)
        .order('year', { ascending: true })
    : { data: [] as Array<{ series_id: number; year: number | null }> }

  // Reuse the driver page's already-aggregated SeriesEvents win totals.
  // Fetch only series names, rather than reloading every individual race.
  const seriesIds = Array.from(new Set([
    ...(seasonRows ?? []).map((row: any) => Number(row.series_id)),
    ...seriesWins.map((row) => Number(row.series_id)),
  ].filter(Boolean)))
  const { data: seriesRows } = seriesIds.length
    ? await supabase.from('Series').select('id, series_name').in('id', seriesIds)
    : { data: [] as Array<{ id: number; series_name: string }> }

  const seriesNameById = new Map<number, string>()
  for (const row of seriesRows ?? []) {
    seriesNameById.set(Number((row as any).id), String((row as any).series_name || 'Series'))
  }
  const museumSeasonRows = (seasonRows ?? []).map((row: any) => ({
    year: row.year ?? null,
    series_id: Number(row.series_id),
    series_name: seriesNameById.get(Number(row.series_id)) || 'Series',
  }))
  const museumSeriesChampionships: MuseumSeriesChampionship[] = museumSeasonRows
    .filter((row) => !isSpecialEventSeriesId(row.series_id))
  const museumSpecialEventWins: MuseumSeriesChampionship[] = museumSeasonRows
    .filter((row) => isSpecialEventSeriesId(row.series_id))

  if (!rows.length && !museumSeriesChampionships.length && !museumSpecialEventWins.length && !trackChampionships.length && !seriesWins.length) return null

  const externalChampionships = rows.filter((row) => isSeriesChampionship(row.accomplishment_type))
  const externalTrackChampionships = rows.filter((row) => row.accomplishment_type === 'TRACK_CHAMPIONSHIP')
  const majorVictories = rows.filter((row) => row.accomplishment_type === 'MAJOR_EVENT_WIN')
  const outsideWins = rows.filter((row) => row.accomplishment_type === 'OUTSIDE_AREA_FEATURE_WIN')
  const majorTop5s = rows.filter((row) => row.accomplishment_type === 'MAJOR_TOP5')
  const summaries = rows.filter((row) => row.accomplishment_type === 'CAREER_SERIES_SUMMARY')
  const selectedVictories = [...majorVictories, ...outsideWins]
  const championshipItems = summarizeChampionships(
    museumSeriesChampionships,
    externalChampionships,
    trackChampionships,
    externalTrackChampionships,
  )

  // Summarize race wins by actual touring/points series. Separate annual
  // specials (Wayne Carter Classic, All-Star 100, etc.) into Box 3 below.
  // Include verified outside-area series wins not represented in SeriesEvents.
  const winsBySeries = new Map<string, { name: string; count: number }>()
  for (const row of seriesWins) {
    const seriesId = Number(row.series_id)
    const count = Number(row.wins)
    if (isSpecialEventSeriesId(seriesId) || !Number.isFinite(count) || count <= 0) continue
    const name = seriesNameById.get(seriesId)
    if (!name) continue
    const key = normalizeSeriesName(name)
    const current = winsBySeries.get(key)
    winsBySeries.set(key, { name, count: (current?.count ?? 0) + count })
  }

  const outsideWinsBySeries = new Map<string, { name: string; count: number }>()
  for (const row of selectedVictories) {
    if (!row.series_name || row.finishing_position !== 1 || row.accomplishment_type !== 'OUTSIDE_AREA_FEATURE_WIN') continue
    const key = normalizeSeriesName(row.series_name)
    const current = outsideWinsBySeries.get(key)
    outsideWinsBySeries.set(key, {
      name: row.series_name,
      count: (current?.count ?? 0) + 1,
    })
  }
  for (const [key, outside] of outsideWinsBySeries) {
    const museum = winsBySeries.get(key)
    // Do not add the two sets blindly: the same race may exist in both
    // SeriesEvents and broader-career records.
    if (!museum || outside.count > museum.count) winsBySeries.set(key, outside)
  }
  const rankedSeriesWins = [...winsBySeries.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  )

  const additionalCareerSummaries = summaries.filter((row) => {
    const note = normalizeSeriesName(row.notes || '')
    if (!note.includes('win')) return true
    // Imported prose summaries such as "5 ASA National Tour event wins"
    // should not repeat a sourced, numerical SeriesEvents win total.
    return !rankedSeriesWins.some(({ name }) => note.includes(normalizeSeriesName(name)))
  })
  const seriesSuccessItems = [
    ...rankedSeriesWins.map(({ name, count }) =>
      `${count.toLocaleString('en-US')} ${name} ${count === 1 ? 'win' : 'wins'}`),
    ...[...additionalCareerSummaries, ...majorTop5s].map(formatAccomplishment),
  ]

  // These SeriesSeasons rows are annual-event winners, not season champions.
  // Keep them visible as victories without duplicating a matching imported
  // accomplishment from DriverCareerAccomplishments.
  const seenSpecialEventWins = new Set<string>()
  const additionalEventWins = museumSpecialEventWins.filter((win) => {
    const key = `${win.year ?? ''}|${normalizeSeriesName(win.series_name)}`
    if (seenSpecialEventWins.has(key)) return false
    seenSpecialEventWins.add(key)
    return !selectedVictories.some((row) =>
      row.year === win.year &&
      [row.event_name, row.series_name].some((name) =>
        name && normalizeSeriesName(name) === normalizeSeriesName(win.series_name),
      ),
    )
  })
  const selectedVictoryItems = [
    ...selectedVictories.map((row) => ({ year: row.year, label: formatAccomplishment(row) })),
    ...additionalEventWins.map((win) => ({
      year: win.year,
      label: `${win.year ? `${win.year} ` : ''}${win.series_name} Winner`,
    })),
  ]
    .sort((a, b) => (a.year ?? Number.MAX_SAFE_INTEGER) - (b.year ?? Number.MAX_SAFE_INTEGER))
    .map((win) => win.label)

  const groups = [
    championshipItems.length ? { kicker: 'Championship record', title: 'Series & Track Championships', items: championshipItems } : null,
    seriesSuccessItems.length
      ? { kicker: 'Touring & series records', title: 'Series & Touring Wins', items: seriesSuccessItems }
      : null,
    selectedVictoryItems.length
      ? { kicker: 'Selected victories', title: 'Major & Touring Wins', items: selectedVictoryItems }
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

      <p className={styles.disclaimer}>
        Season-long championships are distinguished from major-event victories. Museum-recorded race results remain in their original event records.
      </p>
    </section>
  )
}

function isSeriesChampionship(type: string) {
  return ['SERIES_CHAMPIONSHIP', 'REGIONAL_CHAMPIONSHIP', 'NATIONAL_CHAMPIONSHIP', 'STATE_CHAMPIONSHIP'].includes(type)
}

/**
 * Box 1 summarizes distinct championship seasons. A track + class and a
 * touring/points series are separate titles; an event victory is neither.
 * Import duplicates are counted only once per year and championship.
 */
function summarizeChampionships(
  museumSeriesRows: MuseumSeriesChampionship[],
  externalSeriesRows: CareerAccomplishment[],
  museumTrackRows: MuseumTrackChampionship[],
  externalTrackRows: CareerAccomplishment[],
): string[] {
  const grouped = new Map<string, { label: string; years: Set<string> }>()
  const recordTitle = (
    type: 'series' | 'track',
    name: string,
    year: number | string | null,
    className?: string | null,
  ) => {
    const label = type === 'track' && className ? `${name} ${className}` : name
    const key = `${type}|${normalizeSeriesName(name)}|${type === 'track' ? normalizeSeriesName(className || '') : ''}`
    const group = grouped.get(key) ?? { label, years: new Set<string>() }
    group.years.add(String(year ?? 'undated'))
    grouped.set(key, group)
  }

  for (const row of museumSeriesRows) recordTitle('series', row.series_name, row.year)
  for (const row of externalSeriesRows) {
    const name = row.series_name || row.track_name || row.notes
    if (name) recordTitle('series', name, row.year)
  }

  const existingTrackYears = new Set(
    museumTrackRows.map((row) => `${row.year ?? ''}|${normalizeSeriesName(row.track_name)}`),
  )
  for (const row of museumTrackRows) {
    if (row.track_name) recordTitle('track', row.track_name, row.year, row.class_name)
  }
  for (const row of externalTrackRows) {
    const name = row.track_name || row.series_name
    if (!name) continue
    // An external record may omit its division. If the museum already
    // records that track championship in the same year, don't count twice.
    const museumKey = `${row.year ?? ''}|${normalizeSeriesName(name)}`
    if (existingTrackYears.has(museumKey)) continue
    recordTitle('track', name, row.year)
  }

  return [...grouped.values()]
    .map(({ label, years }) => ({ label, count: years.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(({ label, count }) => `${count} ${label} Championship${count === 1 ? '' : 's'}`)
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
