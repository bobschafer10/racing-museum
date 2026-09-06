import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TrackLogo from '../TrackLogo'
import profileStyles from '../track-profile.module.css'
import styles from './results.module.css'

export const revalidate = 300

type Track = {
  track_name: string
  slug: string
  city?: string | null
  state?: string | null
  first_year?: number | null
  last_year?: number | null
  surface_type?: string | null
  configuration?: string | null
  image_url?: string | null
}

type FullTrackResultRow = {
  race_id: number
  race_date: string
  class_name: string | null
  first_place_driver: string | null
  second_place_driver: string | null
  third_place_driver: string | null
  first_place_driver_slug: string | null
  second_place_driver_slug: string | null
  third_place_driver_slug: string | null
  race_status?: string | null
  feature_number?: number | null
}

type YearSummary = {
  result_year: number
  result_count: number | string
  race_dates: number | string
  divisions: number | string
}

type PhotoRow = {
  file_name?: string | null
  track_slug?: string | null
  year?: string | null
}

function formatNumber(value?: number | string | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatRaceDate(dateString: string) {
  const [year, month, day] = String(dateString).split('-').map(Number)
  if (!year || !month || !day) return dateString
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPhotoUrl(photo?: PhotoRow | null) {
  if (!photo?.file_name) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return ''
  const trackSlug = photo.track_slug || photo.file_name.split('_')[0]
  const year = photo.year || photo.file_name.split('_')[1] || 'unknown-year'
  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

function driverCell(name: string | null, slug: string | null) {
  if (!name) return <span className={styles.missing}>—</span>
  return slug ? (
    <Link href={`/drivers/${slug}`} className={styles.driverLink}>{name}</Link>
  ) : (
    <span>{name}</span>
  )
}

function buildResultsHref(
  slug: string,
  year: number,
  options: { order?: string; division?: string; q?: string },
) {
  const params = new URLSearchParams({ year: String(year) })
  if (options.order && options.order !== 'newest') params.set('order', options.order)
  if (options.division) params.set('division', options.division)
  if (options.q) params.set('q', options.q)
  return `/tracks/${slug}/results?${params.toString()}`
}

export default async function TrackResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ year?: string; order?: string; division?: string; q?: string }>
}) {
  const { slug } = await params
  const queryParams = (await searchParams) ?? {}
  const order = queryParams.order === 'oldest' ? 'oldest' : 'newest'
  const selectedDivision = (queryParams.division ?? '').trim()
  const searchText = (queryParams.q ?? '').trim()
  const baseSlug = slug.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks|ky|sc|sd|ont)$/i, '')

  const { data: track } = await supabase
    .from('track_profile_view_v3')
    .select('track_name,slug,city,state,first_year,last_year,surface_type,configuration,image_url')
    .eq('slug', slug)
    .maybeSingle<Track>()

  if (!track) notFound()

  const resultsTrackSlug =
    track.state?.toLowerCase() === 'wi' && !slug.endsWith('-wi') ? `${slug}-wi` : slug

  const [yearSummaryResult, divisionResult, photoResult] = await Promise.all([
    supabase
      .from('track_results_year_summary_view')
      .select('result_year,result_count,race_dates,divisions')
      .eq('track_slug', resultsTrackSlug)
      .order('result_year', { ascending: false }),
    supabase
      .from('track_top_classes_view')
      .select('class_name')
      .eq('track_slug', resultsTrackSlug)
      .range(0, 999),
    supabase
      .from('track_card_photo_view')
      .select('file_name,track_slug,year')
      .eq('slug', slug)
      .maybeSingle<PhotoRow>(),
  ])

  const yearSummaries = ((yearSummaryResult.data ?? []) as YearSummary[]).map((row) => ({
    ...row,
    result_year: Number(row.result_year),
    result_count: Number(row.result_count || 0),
    race_dates: Number(row.race_dates || 0),
    divisions: Number(row.divisions || 0),
  }))

  const availableYears = yearSummaries.map((row) => row.result_year)
  const requestedYear = Number.parseInt(queryParams.year || '', 10)
  const selectedYear = availableYears.includes(requestedYear)
    ? requestedYear
    : availableYears[0] || new Date().getFullYear()
  const selectedSummary = yearSummaries.find((row) => row.result_year === selectedYear) || null

  const yearStart = `${selectedYear}-01-01`
  const yearEnd = `${selectedYear}-12-31`
  const { data: results, error: resultsError } = await supabase
    .from('track_full_results_view')
    .select('race_id,race_date,class_name,first_place_driver,second_place_driver,third_place_driver,first_place_driver_slug,second_place_driver_slug,third_place_driver_slug,race_status,feature_number')
    .eq('track_slug', resultsTrackSlug)
    .gte('race_date', yearStart)
    .lte('race_date', yearEnd)
    .order('race_date', { ascending: order === 'oldest' })
    .order('class_name', { ascending: true })
    .returns<FullTrackResultRow[]>()

  const safeResults = results ?? []
  const divisionOptions = Array.from(
    new Set(safeResults.map((row) => row.class_name).filter((value): value is string => Boolean(value && value !== 'Canceled'))),
  ).sort((a, b) => a.localeCompare(b))

  const normalizedSearch = searchText.toLowerCase()
  const filteredResults = safeResults.filter((row) => {
    const matchesDivision = !selectedDivision || row.class_name === selectedDivision
    const haystack = [
      row.class_name,
      row.first_place_driver,
      row.second_place_driver,
      row.third_place_driver,
    ].filter(Boolean).join(' ').toLowerCase()
    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
    return matchesDivision && matchesSearch
  })

  const grouped = filteredResults.reduce<Record<string, FullTrackResultRow[]>>((acc, row) => {
    if (!acc[row.race_date]) acc[row.race_date] = []
    acc[row.race_date].push(row)
    return acc
  }, {})

  const dateEntries = Object.entries(grouped).sort(([a], [b]) => {
    const comparison = a.localeCompare(b)
    return order === 'oldest' ? comparison : -comparison
  })

  const totalResults = yearSummaries.reduce((sum, row) => sum + Number(row.result_count || 0), 0)
  const totalRaceDates = yearSummaries.reduce((sum, row) => sum + Number(row.race_dates || 0), 0)
  const totalDivisions = (divisionResult.data ?? []).length
  const oldestYear = availableYears.length ? availableYears[availableYears.length - 1] : track.first_year || null
  const newestYear = availableYears[0] || track.last_year || null
  const archiveSpan = oldestYear && newestYear
    ? oldestYear === newestYear ? String(oldestYear) : `${oldestYear}–${newestYear}`
    : 'Growing archive'

  const selectedIndex = yearSummaries.findIndex((row) => row.result_year === selectedYear)
  const newerSeason = selectedIndex > 0 ? yearSummaries[selectedIndex - 1]?.result_year : null
  const olderSeason = selectedIndex >= 0 && selectedIndex < yearSummaries.length - 1
    ? yearSummaries[selectedIndex + 1]?.result_year
    : null

  const heroUrl = track.image_url || getPhotoUrl(photoResult.data)
  const locationText = [track.city, track.state].filter(Boolean).join(', ') || 'Location not yet documented'
  const operatingSpan = track.first_year && track.last_year
    ? track.first_year === track.last_year ? String(track.first_year) : `${track.first_year}–${track.last_year}`
    : track.first_year ? `${track.first_year}–Present` : null

  const stats = [
    { value: formatNumber(totalResults), label: 'Feature Results', icon: '▤' },
    { value: archiveSpan, label: 'Results Archive', icon: '▦' },
    { value: formatNumber(totalRaceDates), label: 'Race Dates', icon: '◷' },
    { value: formatNumber(totalDivisions), label: 'Divisions Represented', icon: '◉' },
  ]

  return (
    <main className={profileStyles.page}>
      <section className={profileStyles.hero}>
        {heroUrl ? (
          <img src={heroUrl} alt={`Racing at ${track.track_name}`} className={profileStyles.heroImage} />
        ) : (
          <div className={profileStyles.heroFallback} aria-hidden="true" />
        )}

        <div className={profileStyles.heroInner}>
          <nav className={profileStyles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>›</span>
            <Link href="/tracks">Tracks</Link><span>›</span>
            <Link href={`/tracks/${slug}`}>{track.track_name}</Link><span>›</span>
            <span>Results</span>
          </nav>

          <div className={profileStyles.heroGrid}>
            <div className={profileStyles.logoFrame}>
              <TrackLogo slug={slug} trackName={track.track_name} />
            </div>
            <div>
              <p className={profileStyles.eyebrow}>Track Results Archive</p>
              <h1 className={profileStyles.title}>{track.track_name}</h1>
              <p className={profileStyles.location}>{locationText}</p>
            </div>
            <p className={profileStyles.heroIntro}>
              Browse the complete feature-result archive by season and race date, with divisions and top-three finishers where available.
            </p>
            <div className={profileStyles.heroFacts}>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>●</span>{locationText}</span>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>▦</span>{archiveSpan} results</span>
              {track.configuration ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>⬭</span>{track.configuration}</span> : null}
              {track.surface_type ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>⚑</span>{track.surface_type}</span> : null}
              {operatingSpan ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>◷</span>{operatingSpan}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <nav className={profileStyles.tabs} aria-label="Track sections">
        <div className={profileStyles.tabInner}>
          <Link href={`/tracks/${slug}`} className={profileStyles.tab}>Overview</Link>
          <Link href={`/tracks/${slug}/results`} className={`${profileStyles.tab} ${profileStyles.activeTab}`}>Results</Link>
          <Link href={`/tracks/${slug}/champions`} className={profileStyles.tab}>Champions</Link>
          <Link href={`/tracks/${slug}/feature-winners`} className={profileStyles.tab}>Feature Winners</Link>
          <Link href={`/tracks/${slug}/photos`} className={profileStyles.tab}>Photos</Link>
          <Link href="/media/newspapers" className={profileStyles.tab}>OCR / Newspaper Clippings</Link>
          <Link href={`/tracks/${slug}#track-info`} className={profileStyles.tab}>Track Info</Link>
        </div>
      </nav>

      <div className={styles.content}>
        <section className={styles.statsGrid} aria-label="Results archive statistics">
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <span className={styles.statIcon}>{stat.icon}</span>
              <div><strong>{stat.value}</strong><span>{stat.label}</span></div>
            </div>
          ))}
        </section>

        <section className={styles.archivePanel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.kicker}>Complete archive</div>
              <h2>{selectedYear} Feature Results</h2>
            </div>
            <div className={styles.panelSummary}>
              {selectedSummary ? `${formatNumber(selectedSummary.result_count)} results · ${formatNumber(selectedSummary.race_dates)} race dates` : 'Season archive'}
            </div>
          </div>

          <form action={`/tracks/${slug}/results`} method="get" className={styles.filters}>
            <label>
              <span>Season</span>
              <select name="year" defaultValue={String(selectedYear)}>
                {yearSummaries.map((row) => <option key={row.result_year} value={row.result_year}>{row.result_year} · {formatNumber(row.result_count)} results</option>)}
              </select>
            </label>
            <label>
              <span>Division</span>
              <select name="division" defaultValue={selectedDivision}>
                <option value="">All divisions</option>
                {divisionOptions.map((division) => <option key={division} value={division}>{division}</option>)}
              </select>
            </label>
            <label>
              <span>Order</span>
              <select name="order" defaultValue={order}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <label className={styles.searchField}>
              <span>Search this season</span>
              <input name="q" defaultValue={searchText} placeholder="Driver or division..." />
            </label>
            <button type="submit" className={styles.applyButton}>Apply Filters</button>
            {(selectedDivision || searchText || order !== 'newest') ? (
              <Link href={`/tracks/${slug}/results?year=${selectedYear}`} className={styles.clearLink}>Clear filters</Link>
            ) : <span className={styles.filterNote}>Showing {formatNumber(filteredResults.length)} result rows</span>}
          </form>

          <div className={styles.seasonNav}>
            <div>
              {newerSeason ? <Link href={buildResultsHref(slug, newerSeason, { order })}>← {newerSeason}</Link> : <span />}
            </div>
            <div className={styles.seasonCurrent}>
              <span>Selected season</span>
              <strong>{selectedYear}</strong>
              {selectedSummary ? <small>{formatNumber(selectedSummary.divisions)} divisions represented</small> : null}
            </div>
            <div className={styles.seasonNext}>
              {olderSeason ? <Link href={buildResultsHref(slug, olderSeason, { order })}>{olderSeason} →</Link> : <span />}
            </div>
          </div>

          {resultsError ? (
            <div className={styles.empty}>The results archive could not be loaded right now.</div>
          ) : filteredResults.length === 0 ? (
            <div className={styles.empty}>
              <strong>No results matched those filters.</strong>
              <span>Try another season, division, or driver search.</span>
              <Link href={`/tracks/${slug}/results?year=${selectedYear}`}>Reset this season</Link>
            </div>
          ) : (
            <div className={styles.dateList}>
              {dateEntries.map(([date, races]) => (
                <section key={date} className={styles.dateCard}>
                  <div className={styles.dateHeader}>
                    <div>
                      <div className={styles.dateKicker}>Race date</div>
                      <h3>{formatRaceDate(date)}</h3>
                    </div>
                    <span>{races.length} feature{races.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className={styles.resultGridHeader}>
                    <div>Division</div><div>Winner</div><div>2nd</div><div>3rd</div>
                  </div>
                  <div className={styles.resultRows}>
                    {races.map((race, index) => {
                      const canceled = String(race.class_name || '').toLowerCase() === 'canceled' || /cancel|rain/i.test(String(race.race_status || ''))
                      return (
                        <div key={`${race.race_id}-${index}`} className={`${styles.resultRow} ${canceled ? styles.canceledRow : ''}`}>
                          <div className={styles.divisionCell}>
                            <span className={styles.cellLabel}>Division</span>
                            <strong>{race.class_name || 'Unknown division'}</strong>
                            {race.feature_number && race.feature_number > 1 ? <small>Feature {race.feature_number}</small> : null}
                          </div>
                          <div className={styles.winnerCell}>
                            <span className={styles.cellLabel}>Winner</span>
                            {canceled ? <span className={styles.statusBadge}>Canceled</span> : driverCell(race.first_place_driver, race.first_place_driver_slug)}
                          </div>
                          <div><span className={styles.cellLabel}>2nd</span>{canceled ? <span className={styles.missing}>—</span> : driverCell(race.second_place_driver, race.second_place_driver_slug)}</div>
                          <div><span className={styles.cellLabel}>3rd</span>{canceled ? <span className={styles.missing}>—</span> : driverCell(race.third_place_driver, race.third_place_driver_slug)}</div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className={styles.footerGrid}>
          <Link href={`/tracks/${slug}`} className={styles.footerCard}><strong>Track Overview</strong><span>Return to the full {track.track_name} archive →</span></Link>
          <Link href={`/tracks/${slug}/feature-winners`} className={styles.footerCard}><strong>Feature Winners</strong><span>View the complete winner leaderboard →</span></Link>
          <Link href={`/tracks/${slug}/photos`} className={styles.footerCard}><strong>Track Photos</strong><span>Browse the museum photo collection →</span></Link>
        </section>
      </div>
    </main>
  )
}
