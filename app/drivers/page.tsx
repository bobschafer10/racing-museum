import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './drivers-landing.module.css'

export const revalidate = 300

type DriverRow = {
  driver_id?: number | null
  driver_name: string
  driver_slug: string
  hometown?: string | null
  state?: string | null
  recorded_results?: number | null
  recorded_wins?: number | null
  recorded_top_3_finishes?: number | null
  wisconsin_feature_wins?: number | null
  last_name?: string | null
  last_initial?: string | null
  photo_count?: number | null
  championship_count?: number | null
}

type LandingStats = {
  driver_count?: number | string | null
  recorded_wins?: number | string | null
  recorded_results?: number | string | null
  driver_photos?: number | string | null
  championship_drivers?: number | string | null
}

type PhotoRow = {
  driver_slug?: string | null
  file_name?: string | null
  track_slug?: string | null
  year?: string | null
  sequence?: number | null
}

type SortKey = 'name' | 'wins' | 'results' | 'top3' | 'photos' | 'titles'

const PAGE_SIZE = 24
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function formatNumber(value?: number | string | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatLocation(driver?: DriverRow | null) {
  if (!driver) return 'Hometown not yet documented'
  return [driver.hometown, driver.state].filter(Boolean).join(', ') || 'Hometown not yet documented'
}

function driverInitials(name?: string | null) {
  if (!name) return 'DR'
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] || ''
  const last = words.length > 1 ? words[words.length - 1]?.[0] || '' : ''
  return `${first}${last}`.toUpperCase() || 'DR'
}

function getPhotoUrl(photo?: PhotoRow | null) {
  if (!photo?.file_name) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return ''
  const trackSlug = photo.track_slug || photo.file_name.split('_')[0] || 'unknown-track'
  const year = photo.year || photo.file_name.split('_')[1] || 'unknown-year'
  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

function uniqueDrivers(items: Array<DriverRow | null | undefined>) {
  const seen = new Set<string>()
  return items.filter((driver): driver is DriverRow => {
    if (!driver?.driver_slug || seen.has(driver.driver_slug)) return false
    seen.add(driver.driver_slug)
    return true
  })
}

function buildHref(
  filters: { q: string; letter: string; sort: SortKey },
  options: { page?: number; letter?: string | null } = {},
) {
  const params = new URLSearchParams()
  const nextLetter = options.letter === null ? '' : (options.letter ?? filters.letter)
  if (filters.q) params.set('q', filters.q)
  if (nextLetter) params.set('letter', nextLetter)
  if (filters.sort !== 'name') params.set('sort', filters.sort)
  if ((options.page || 1) > 1) params.set('page', String(options.page))
  const query = params.toString()
  return `/drivers${query ? `?${query}` : ''}#directory`
}

function StatIcon({ kind }: { kind: 'drivers' | 'wins' | 'results' | 'photos' | 'champions' }) {
  if (kind === 'drivers') {
    return (
      <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true">
        <circle cx="16" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 27c.8-6.2 4-9.3 9-9.3S24.2 20.8 25 27" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (kind === 'wins') {
    return (
      <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true">
        <path d="M7 27V5" stroke="currentColor" strokeWidth="2" />
        <path d="M9 6h16v12H9z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 6h8v6H9zm8 6h8v6h-8z" fill="currentColor" opacity=".85" />
      </svg>
    )
  }
  if (kind === 'results') {
    return (
      <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true">
        <rect x="7" y="5" width="18" height="22" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M11 11h10M11 16h10M11 21h10" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (kind === 'photos') {
    return (
      <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true">
        <path d="M6 10h5l2-3h6l2 3h5v15H6z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="17" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true">
      <path d="M10 6h12v5c0 5-2.4 8-6 8s-6-3-6-8z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9H6c0 4 1.8 6 5 6M22 9h4c0 4-1.8 6-5 6M16 19v4M11 27h10M13 23h6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function DriverMedia({
  driver,
  photo,
  className,
}: {
  driver: DriverRow
  photo?: PhotoRow | null
  className?: string
}) {
  const imageUrl = getPhotoUrl(photo)
  if (imageUrl) {
    return <img src={imageUrl} alt={driver.driver_name} className={className || styles.cardImage} />
  }

  return (
    <div className={`${styles.driverFallback} ${className || ''}`} aria-label={`${driver.driver_name} photo unavailable`}>
      <span>{driverInitials(driver.driver_name)}</span>
      <small>Driver Archive</small>
    </div>
  )
}

export default async function DriversPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; letter?: string; sort?: string; page?: string }>
}) {
  const params = (await searchParams) ?? {}
  const q = (params.q ?? '').trim()
  const letter = (params.letter ?? '').trim().toUpperCase().slice(0, 1)
  const requestedSort = (params.sort ?? 'name') as SortKey
  const sort: SortKey = ['name', 'wins', 'results', 'top3', 'photos', 'titles'].includes(requestedSort)
    ? requestedSort
    : 'name'
  const requestedPage = Math.max(1, Number.parseInt(params.page || '1', 10) || 1)
  const from = (requestedPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let directoryQuery = supabase
    .from('driver_landing_directory_view')
    .select(
      'driver_id,driver_name,driver_slug,hometown,state,recorded_results,recorded_wins,recorded_top_3_finishes,wisconsin_feature_wins,last_name,last_initial,photo_count,championship_count',
      { count: 'exact' },
    )

  if (q) directoryQuery = directoryQuery.ilike('driver_name', `%${q}%`)
  if (letter && alphabet.includes(letter)) directoryQuery = directoryQuery.eq('last_initial', letter)

  if (sort === 'wins') {
    directoryQuery = directoryQuery.order('recorded_wins', { ascending: false, nullsFirst: false })
  } else if (sort === 'results') {
    directoryQuery = directoryQuery.order('recorded_results', { ascending: false, nullsFirst: false })
  } else if (sort === 'top3') {
    directoryQuery = directoryQuery.order('recorded_top_3_finishes', { ascending: false, nullsFirst: false })
  } else if (sort === 'photos') {
    directoryQuery = directoryQuery.order('photo_count', { ascending: false, nullsFirst: false })
  } else if (sort === 'titles') {
    directoryQuery = directoryQuery.order('championship_count', { ascending: false, nullsFirst: false })
  } else {
    directoryQuery = directoryQuery.order('last_name', { ascending: true }).order('driver_name', { ascending: true })
  }

  directoryQuery = directoryQuery.order('driver_name', { ascending: true }).range(from, to)

  const [
    directoryResult,
    statsResult,
    featureLeadersResult,
    resultsLeadersResult,
    photoLeadersResult,
    titleLeadersResult,
  ] = await Promise.all([
    directoryQuery,
    supabase.from('driver_landing_stats_view').select('*').maybeSingle<LandingStats>(),
    supabase
      .from('driver_landing_directory_view')
      .select('driver_name,driver_slug,hometown,state,recorded_results,recorded_wins,recorded_top_3_finishes,wisconsin_feature_wins,photo_count,championship_count')
      .order('recorded_wins', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from('driver_landing_directory_view')
      .select('driver_name,driver_slug,hometown,state,recorded_results,recorded_wins,recorded_top_3_finishes,wisconsin_feature_wins,photo_count,championship_count')
      .order('recorded_results', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from('driver_landing_directory_view')
      .select('driver_name,driver_slug,hometown,state,recorded_results,recorded_wins,recorded_top_3_finishes,wisconsin_feature_wins,photo_count,championship_count')
      .order('photo_count', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from('driver_landing_directory_view')
      .select('driver_name,driver_slug,hometown,state,recorded_results,recorded_wins,recorded_top_3_finishes,wisconsin_feature_wins,photo_count,championship_count')
      .order('championship_count', { ascending: false, nullsFirst: false })
      .limit(8),
  ])

  const directoryRows = (directoryResult.data ?? []) as DriverRow[]
  const totalMatches = directoryResult.count ?? directoryRows.length
  const stats = (statsResult.data ?? {}) as LandingStats
  const featureLeaders = (featureLeadersResult.data ?? []) as DriverRow[]
  const resultsLeaders = (resultsLeadersResult.data ?? []) as DriverRow[]
  const photoLeaders = (photoLeadersResult.data ?? []) as DriverRow[]
  const titleLeaders = (titleLeadersResult.data ?? []) as DriverRow[]

  const usedHighlights = new Set<string>()
  const pickUnique = (rows: DriverRow[]) => {
    const found = rows.find((row) => row.driver_slug && !usedHighlights.has(row.driver_slug))
    if (found?.driver_slug) usedHighlights.add(found.driver_slug)
    return found || rows[0] || null
  }

  const featureHighlight = pickUnique(featureLeaders)
  const titleHighlight = pickUnique(titleLeaders)
  const resultsHighlight = pickUnique(resultsLeaders)
  const photoHighlight = pickUnique(photoLeaders)

  const highlightCards = [
    featureHighlight ? {
      kicker: 'Feature Win Leader',
      driver: featureHighlight,
      metric: `${formatNumber(featureHighlight.recorded_wins)} recorded wins`,
    } : null,
    titleHighlight ? {
      kicker: 'Championship Archive',
      driver: titleHighlight,
      metric: `${formatNumber(titleHighlight.championship_count)} track titles`,
    } : null,
    resultsHighlight ? {
      kicker: 'Deep Results Archive',
      driver: resultsHighlight,
      metric: `${formatNumber(resultsHighlight.recorded_results)} recorded results`,
    } : null,
    photoHighlight ? {
      kicker: 'Museum Photo Collection',
      driver: photoHighlight,
      metric: `${formatNumber(photoHighlight.photo_count)} driver photos`,
    } : null,
  ].filter(Boolean) as Array<{ kicker: string; driver: DriverRow; metric: string }>

  const featuredCandidates: DriverRow[] = []
  const leaderLists = [featureLeaders, titleLeaders, resultsLeaders, photoLeaders]
  for (let index = 0; index < 8; index += 1) {
    for (const list of leaderLists) {
      if (list[index]) featuredCandidates.push(list[index])
    }
  }
  const featuredDrivers = uniqueDrivers(featuredCandidates).slice(0, 6)

  const photoSlugs = Array.from(new Set(
    [...directoryRows, ...featuredDrivers, ...highlightCards.map((item) => item.driver)]
      .map((driver) => driver.driver_slug)
      .filter(Boolean),
  ))

  const { data: photoRows } = photoSlugs.length
    ? await supabase
        .from('driver_card_photo_view')
        .select('driver_slug,file_name,track_slug,year,sequence')
        .in('driver_slug', photoSlugs)
    : { data: [] as PhotoRow[] }

  const photoMap = new Map<string, PhotoRow>()
  for (const photo of (photoRows ?? []) as PhotoRow[]) {
    if (photo.driver_slug && !photoMap.has(photo.driver_slug)) photoMap.set(photo.driver_slug, photo)
  }

  const heroPhoto = featureHighlight?.driver_slug ? photoMap.get(featureHighlight.driver_slug) : null
  const heroUrl = getPhotoUrl(heroPhoto)
  const pageCount = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE))
  const filters = { q, letter: alphabet.includes(letter) ? letter : '', sort }

  const heroStats = [
    { kind: 'drivers' as const, value: formatNumber(stats.driver_count), label: 'Drivers Archived' },
    { kind: 'wins' as const, value: formatNumber(stats.recorded_wins), label: 'Recorded Feature Wins' },
    { kind: 'results' as const, value: formatNumber(stats.recorded_results), label: 'Recorded Results' },
    { kind: 'photos' as const, value: formatNumber(stats.driver_photos), label: 'Driver & Racing Photos' },
    { kind: 'champions' as const, value: formatNumber(stats.championship_drivers), label: 'Championship Drivers' },
  ]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroUrl ? (
          <img src={heroUrl} alt="" className={styles.heroImage} aria-hidden="true" />
        ) : (
          <div className={styles.heroFallback} aria-hidden="true" />
        )}
        <div className={styles.heroShade} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>Upper Midwest Auto Racing Museum</div>
            <h1>Drivers</h1>
            <h2>Explore {formatNumber(stats.driver_count)} Racing Careers</h2>
            <p>
              Discover the drivers behind the region&apos;s racing history. Search profiles, feature wins,
              championships, photographs, and recorded results from the museum archive.
            </p>
          </div>

          <div className={styles.heroMotto} aria-hidden="true">
            <span>Drivers</span>
            <span>Make</span>
            <span>History</span>
          </div>

          <div className={styles.statsGrid}>
            {heroStats.map((stat) => (
              <div className={styles.statCard} key={stat.label}>
                <span className={styles.statIcon}><StatIcon kind={stat.kind} /></span>
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <form action="/drivers" method="get" className={styles.searchPanel}>
            <div className={styles.searchRow}>
              <label className={styles.searchField}>
                <span className={styles.srOnly}>Search drivers</span>
                <input name="q" defaultValue={q} placeholder="Search drivers by name..." />
              </label>
              <label>
                <span>Sort By</span>
                <select name="sort" defaultValue={sort}>
                  <option value="name">Last Name (A–Z)</option>
                  <option value="wins">Most Feature Wins</option>
                  <option value="results">Most Recorded Results</option>
                  <option value="top3">Most Top-3 Finishes</option>
                  <option value="photos">Largest Photo Collection</option>
                  <option value="titles">Most Track Championships</option>
                </select>
              </label>
              {filters.letter ? <input type="hidden" name="letter" value={filters.letter} /> : null}
              <button type="submit">Search Drivers</button>
            </div>
            <div className={styles.searchMeta}>
              <span>
                {q
                  ? <>Search results for <strong>{q}</strong></>
                  : filters.letter
                    ? <>Last names beginning with <strong>{filters.letter}</strong></>
                    : <>Search the complete museum driver directory</>}
              </span>
              {(q || filters.letter || sort !== 'name') ? <Link href="/drivers">Clear Filters</Link> : null}
            </div>
          </form>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.alphabetSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>Browse the archive</span>
              <h2>Browse by Last Name</h2>
            </div>
            <span>{formatNumber(stats.driver_count)} driver profiles currently indexed</span>
          </div>
          <div className={styles.alphabetBar}>
            <Link
              href={buildHref(filters, { page: 1, letter: null })}
              className={!filters.letter ? styles.activeLetter : undefined}
            >
              All
            </Link>
            {alphabet.map((value) => (
              <Link
                key={value}
                href={buildHref(filters, { page: 1, letter: value })}
                className={filters.letter === value ? styles.activeLetter : undefined}
              >
                {value}
              </Link>
            ))}
          </div>
        </section>

        {highlightCards.length > 0 ? (
          <section className={styles.highlightsSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.kicker}>Museum archive highlights</span>
                <h2>Explore Driver History</h2>
              </div>
              <Link href="#directory">Browse complete directory →</Link>
            </div>
            <div className={styles.highlightGrid}>
              {highlightCards.map((item) => (
                <Link href={`/drivers/${item.driver.driver_slug}`} className={styles.highlightCard} key={item.kicker}>
                  <div className={styles.highlightCopy}>
                    <span>{item.kicker}</span>
                    <strong>{item.driver.driver_name}</strong>
                    <small>{formatLocation(item.driver)}</small>
                  </div>
                  <DriverMedia
                    driver={item.driver}
                    photo={photoMap.get(item.driver.driver_slug)}
                    className={styles.highlightImage}
                  />
                  <div className={styles.highlightMetric}>{item.metric}</div>
                  <div className={styles.highlightLink}>View Driver →</div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {featuredDrivers.length > 0 ? (
          <section className={styles.featuredSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.kicker}>Museum highlights</span>
                <h2>Featured Drivers</h2>
              </div>
              <span>Leaders from across the museum database</span>
            </div>
            <div className={styles.featuredGrid}>
              {featuredDrivers.map((driver) => (
                <Link href={`/drivers/${driver.driver_slug}`} className={styles.featuredCard} key={driver.driver_slug}>
                  <DriverMedia
                    driver={driver}
                    photo={photoMap.get(driver.driver_slug)}
                    className={styles.featuredImage}
                  />
                  <div className={styles.featuredBody}>
                    <h3>{driver.driver_name}</h3>
                    <p>{formatLocation(driver)}</p>
                    <div className={styles.tagRow}>
                      {driver.state ? <span>{driver.state}</span> : null}
                      {Number(driver.championship_count || 0) > 0 ? <span>{formatNumber(driver.championship_count)} Titles</span> : null}
                    </div>
                    <div className={styles.featuredStats}>
                      <div><strong>{formatNumber(driver.recorded_wins)}</strong><span>Wins</span></div>
                      <div><strong>{formatNumber(driver.recorded_results)}</strong><span>Results</span></div>
                      <div><strong>{formatNumber(driver.photo_count)}</strong><span>Photos</span></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.directorySection} id="directory">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>Research directory</span>
              <h2>Complete Driver Directory</h2>
            </div>
            <span>{formatNumber(totalMatches)} driver{totalMatches === 1 ? '' : 's'} match the current view</span>
          </div>

          {directoryResult.error ? (
            <div className={styles.emptyState}>The driver directory could not be loaded right now.</div>
          ) : directoryRows.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No drivers matched those filters.</strong>
              <span>Try another name or last-name letter.</span>
              <Link href="/drivers">Show all drivers</Link>
            </div>
          ) : (
            <>
              <div className={styles.directoryGrid}>
                {directoryRows.map((driver) => (
                  <Link href={`/drivers/${driver.driver_slug}`} className={styles.driverCard} key={driver.driver_slug}>
                    <div className={styles.driverMedia}>
                      <DriverMedia driver={driver} photo={photoMap.get(driver.driver_slug)} />
                    </div>
                    <div className={styles.driverBody}>
                      <h3>{driver.driver_name}</h3>
                      <p>{formatLocation(driver)}</p>
                      <div className={styles.driverStats}>
                        <div><strong>{formatNumber(driver.recorded_wins)}</strong><span>Wins</span></div>
                        <div><strong>{formatNumber(driver.recorded_results)}</strong><span>Results</span></div>
                        <div><strong>{formatNumber(driver.recorded_top_3_finishes)}</strong><span>Top 3s</span></div>
                        <div><strong>{formatNumber(driver.photo_count)}</strong><span>Photos</span></div>
                      </div>
                      <div className={styles.driverFooter}>
                        <span>{Number(driver.championship_count || 0) > 0 ? `${formatNumber(driver.championship_count)} track titles` : 'Driver profile'}</span>
                        <strong>View Profile →</strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {pageCount > 1 ? (
                <div className={styles.pagination}>
                  {requestedPage > 1 ? (
                    <Link href={buildHref(filters, { page: requestedPage - 1 })}>← Previous</Link>
                  ) : <span />}
                  <strong>Page {Math.min(requestedPage, pageCount)} of {pageCount}</strong>
                  {requestedPage < pageCount ? (
                    <Link href={buildHref(filters, { page: requestedPage + 1 })}>Next →</Link>
                  ) : <span />}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className={styles.researchGrid}>
          <Link href="/results" className={styles.researchCard}>
            <div className={styles.researchIcon}>01</div>
            <div>
              <div className={styles.researchTitle}>Race Results Archive</div>
              <p>Browse recorded finishes and race history across the museum database.</p>
              <span>Browse Results →</span>
            </div>
          </Link>
          <Link href="/media/photos" className={styles.researchCard}>
            <div className={styles.researchIcon}>02</div>
            <div>
              <div className={styles.researchTitle}>Driver Photo Archive</div>
              <p>Explore historic racing photography connected to drivers and tracks.</p>
              <span>Browse Photos →</span>
            </div>
          </Link>
          <Link href="/stats/feature-winners" className={styles.researchCard}>
            <div className={styles.researchIcon}>03</div>
            <div>
              <div className={styles.researchTitle}>Research Center</div>
              <p>Go deeper with feature winners, championships, statistics, and museum research tools.</p>
              <span>Open Research Center →</span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  )
}
