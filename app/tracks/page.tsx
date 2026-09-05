import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TrackLogo from './[slug]/TrackLogo'
import styles from './tracks-landing.module.css'

export const revalidate = 300

type TrackMeta = {
  track_id?: number | null
  track_name: string
  slug: string
  city?: string | null
  state?: string | null
  surface_type?: string | null
  configuration?: string | null
  first_year?: number | null
  last_year?: number | null
  logo_url?: string | null
}

type DirectoryRow = {
  track_id?: number | null
  track_name: string
  slug: string
  city?: string | null
  state?: string | null
  years_active?: string | null
  event_count?: number | null
}

type TrackRow = TrackMeta & {
  years_active?: string | null
  event_count: number
}

type PhotoRow = {
  file_name?: string | null
  track_slug?: string | null
  year?: string | null
  sequence?: number | null
}

type RecentRow = {
  track_slug?: string | null
  race_date?: string | null
  class_name?: string | null
  first_place_name?: string | null
}

const primaryStates = [
  { code: 'WI', name: 'Wisconsin' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'IL', name: 'Illinois' },
  { code: 'MI', name: 'Michigan' },
  { code: 'IN', name: 'Indiana' },
]

const stateNames: Record<string, string> = {
  WI: 'Wisconsin',
  MN: 'Minnesota',
  IL: 'Illinois',
  MI: 'Michigan',
  IN: 'Indiana',
  IA: 'Iowa',
  MO: 'Missouri',
  OH: 'Ohio',
  TN: 'Tennessee',
  CO: 'Colorado',
  KS: 'Kansas',
  ONT: 'Ontario',
}

function baseTrackSlug(slug: string) {
  return slug.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks)$/i, '')
}

function getPhotoUrl(photo?: PhotoRow | null) {
  if (!photo?.file_name) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return ''
  const trackSlug = photo.track_slug || photo.file_name.split('_')[0]
  const year = photo.year || photo.file_name.split('_')[1] || 'unknown-year'
  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

function formatNumber(value?: number | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatLocation(track?: Pick<TrackRow, 'city' | 'state'> | null) {
  if (!track) return 'Upper Midwest archive'
  return [track.city, track.state].filter(Boolean).join(', ') || 'Location in archive'
}

function formatSurface(value?: string | null) {
  if (!value) return 'Surface not listed'
  return value.replaceAll('_', ' ')
}

function formatConfiguration(value?: string | null) {
  if (!value) return ''
  return value.replaceAll('_', ' ')
}

function formatYears(track?: TrackRow | null) {
  if (!track) return 'Archive years vary'
  if (track.years_active) return track.years_active
  if (track.first_year && track.last_year) {
    return track.first_year === track.last_year
      ? String(track.first_year)
      : `${track.first_year}–${track.last_year}`
  }
  if (track.first_year) return `${track.first_year}–Present`
  if (track.last_year) return `Through ${track.last_year}`
  return 'Years documented in archive'
}

function formatDate(value?: string | null) {
  if (!value) return 'Recently updated'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function trackMatchesPhoto(track: TrackRow, photo: PhotoRow) {
  const photoTrack = (photo.track_slug || '').toLowerCase()
  return photoTrack === track.slug.toLowerCase() || photoTrack === baseTrackSlug(track.slug).toLowerCase()
}

function uniqueTracks(items: Array<TrackRow | null | undefined>) {
  const seen = new Set<string>()
  return items.filter((track): track is TrackRow => {
    if (!track || seen.has(track.slug)) return false
    seen.add(track.slug)
    return true
  })
}

function buildPageHref(
  page: number,
  filters: { q: string; state: string; surface: string; sort: string },
) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.state) params.set('state', filters.state)
  if (filters.surface) params.set('surface', filters.surface)
  if (filters.sort && filters.sort !== 'name') params.set('sort', filters.sort)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return `/tracks${query ? `?${query}` : ''}#directory`
}

export default async function TracksPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string
    state?: string
    surface?: string
    sort?: string
    page?: string
  }>
}) {
  const params = (await searchParams) ?? {}
  const query = (params.q ?? '').trim()
  const selectedState = (params.state ?? '').trim().toUpperCase()
  const selectedSurface = (params.surface ?? '').trim()
  const selectedSort = ['name', 'events', 'oldest'].includes(params.sort || '')
    ? String(params.sort)
    : 'name'

  const [
    tracksResult,
    directoryResult,
    eventsCountResult,
    photosCountResult,
    firstYearResult,
    lastYearResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from('Tracks')
      .select(
        'track_id,track_name,slug,city,state,surface_type,configuration,first_year,last_year,logo_url',
      )
      .eq('is_published', true)
      .order('track_name', { ascending: true })
      .range(0, 999),
    supabase
      .from('track_directory_public_view')
      .select('track_id,track_name,slug,city,state,years_active,event_count')
      .order('event_count', { ascending: false })
      .range(0, 999),
    supabase
      .from('Events')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true),
    supabase
      .from('photos')
      .select('photo_id', { count: 'exact', head: true })
      .neq('credit_type', 'unknown'),
    supabase
      .from('Events')
      .select('year')
      .eq('is_published', true)
      .order('year', { ascending: true, nullsFirst: false })
      .limit(1),
    supabase
      .from('Events')
      .select('year')
      .eq('is_published', true)
      .order('year', { ascending: false, nullsFirst: false })
      .limit(1),
    supabase
      .from('track_recent_results_summary_view')
      .select('track_slug,race_date,class_name,first_place_name')
      .order('race_date', { ascending: false, nullsFirst: false })
      .limit(1),
  ])

  const metaRows = (tracksResult.data ?? []) as TrackMeta[]
  const directoryRows = (directoryResult.data ?? []) as DirectoryRow[]
  const directoryBySlug = new Map(directoryRows.map((row) => [row.slug, row]))

  const allTracks: TrackRow[] = metaRows.map((track) => {
    const directory = directoryBySlug.get(track.slug)
    return {
      ...track,
      years_active: directory?.years_active ?? null,
      event_count: Number(directory?.event_count || 0),
    }
  })

  const stateCounts = allTracks.reduce<Record<string, number>>((acc, track) => {
    const code = (track.state || '').trim().toUpperCase()
    if (code) acc[code] = (acc[code] || 0) + 1
    return acc
  }, {})

  const surfaces = Array.from(
    new Set(allTracks.map((track) => track.surface_type).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b))

  const byEvents = [...allTracks].sort((a, b) => b.event_count - a.event_count)
  const featuredTrack = allTracks.find((track) => track.slug === '141-speedway-wi') || byEvents[0] || null
  const historicTrack =
    allTracks.find((track) => track.slug === 'milwaukee-mile-wi') ||
    [...allTracks].sort((a, b) => Number(a.first_year || 9999) - Number(b.first_year || 9999))[0] ||
    null

  const latest = ((recentResult.data ?? []) as RecentRow[])[0] || null
  const recentTrack = latest?.track_slug
    ? allTracks.find((track) => track.slug === latest.track_slug) || null
    : null
  const deepestTrack = byEvents[0] || null
  const stateLeaders = primaryStates.map(
    (state) => byEvents.find((track) => track.state?.toUpperCase() === state.code) || null,
  )
  const featuredGrid = uniqueTracks(byEvents.slice(0, 8)).slice(0, 6)
  const discoveryTracks = uniqueTracks([
    featuredTrack,
    recentTrack,
    historicTrack,
    deepestTrack,
    ...stateLeaders,
    ...featuredGrid,
  ])

  const photoLookupSlugs = Array.from(
    new Set(discoveryTracks.flatMap((track) => [track.slug, baseTrackSlug(track.slug)])),
  )

  let photoRows: PhotoRow[] = []
  if (photoLookupSlugs.length > 0) {
    const photoResult = await supabase
      .from('photos')
      .select('file_name,track_slug,year,sequence')
      .in('track_slug', photoLookupSlugs)
      .neq('credit_type', 'unknown')
      .order('year', { ascending: false, nullsFirst: false })
      .order('sequence', { ascending: true })
      .limit(160)
    photoRows = (photoResult.data ?? []) as PhotoRow[]
  }

  const photoForTrack = (track?: TrackRow | null) => {
    if (!track) return null
    return photoRows.find((photo) => trackMatchesPhoto(track, photo)) || null
  }

  const heroPhotoUrl = getPhotoUrl(photoForTrack(featuredTrack))
  const firstEventYear = Number((firstYearResult.data?.[0] as { year?: number | null } | undefined)?.year || 0)
  const lastEventYear = Number((lastYearResult.data?.[0] as { year?: number | null } | undefined)?.year || 0)
  const archiveYears =
    firstEventYear && lastEventYear
      ? `${firstEventYear}–${lastEventYear}`
      : lastEventYear
        ? `Through ${lastEventYear}`
        : 'Growing archive'

  let filteredTracks = allTracks.filter((track) => {
    const haystack = `${track.track_name} ${track.city || ''} ${track.state || ''}`.toLowerCase()
    const matchesQuery = !query || haystack.includes(query.toLowerCase())
    const matchesState = !selectedState || track.state?.toUpperCase() === selectedState
    const matchesSurface = !selectedSurface || track.surface_type === selectedSurface
    return matchesQuery && matchesState && matchesSurface
  })

  if (selectedSort === 'events') {
    filteredTracks = filteredTracks.sort((a, b) => b.event_count - a.event_count)
  } else if (selectedSort === 'oldest') {
    filteredTracks = filteredTracks.sort((a, b) => {
      const ay = Number(a.first_year || 9999)
      const by = Number(b.first_year || 9999)
      return ay - by || a.track_name.localeCompare(b.track_name)
    })
  } else {
    filteredTracks = filteredTracks.sort((a, b) => a.track_name.localeCompare(b.track_name))
  }

  const pageSize = 20
  const requestedPage = Math.max(1, Number.parseInt(params.page || '1', 10) || 1)
  const pageCount = Math.max(1, Math.ceil(filteredTracks.length / pageSize))
  const currentPage = Math.min(requestedPage, pageCount)
  const directoryPage = filteredTracks.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const filters = { q: query, state: selectedState, surface: selectedSurface, sort: selectedSort }
  const hasFilters = Boolean(query || selectedState || selectedSurface || selectedSort !== 'name')

  const otherStates = Object.entries(stateCounts)
    .filter(([code]) => !primaryStates.some((state) => state.code === code))
    .sort(([a], [b]) => (stateNames[a] || a).localeCompare(stateNames[b] || b))

  const stats = [
    { icon: '◯', value: formatNumber(allTracks.length), label: 'Tracks Archived' },
    { icon: '⚑', value: formatNumber(eventsCountResult.count), label: 'Race Events Recorded' },
    { icon: '▣', value: formatNumber(photosCountResult.count), label: 'Track & Racing Photos' },
    { icon: '◆', value: String(primaryStates.length), label: 'Primary States' },
    { icon: '▦', value: archiveYears, label: 'Years of Racing' },
  ]

  const discoveryCards = [
    {
      label: 'Featured Track',
      icon: '★',
      track: featuredTrack,
      note: featuredTrack ? `${formatNumber(featuredTrack.event_count)} recorded events` : 'Museum feature',
    },
    {
      label: 'Recently Updated',
      icon: '◷',
      track: recentTrack,
      note: latest?.race_date
        ? `${formatDate(latest.race_date)}${latest.class_name ? ` · ${latest.class_name}` : ''}`
        : 'Newest results in the archive',
    },
    {
      label: 'Historic Venue',
      icon: '▥',
      track: historicTrack,
      note: historicTrack ? formatYears(historicTrack) : 'Historic racing venue',
    },
    {
      label: 'Deepest Results Archive',
      icon: '▤',
      track: deepestTrack,
      note: deepestTrack ? `${formatNumber(deepestTrack.event_count)} recorded events` : 'Explore the archive',
    },
  ]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroPhotoUrl ? (
          <img src={heroPhotoUrl} alt="Historic Upper Midwest racing" className={styles.heroImage} />
        ) : (
          <div className={styles.heroFallback} aria-hidden="true" />
        )}
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>Upper Midwest Auto Racing Museum</div>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}>Tracks</h1>
              <div className={styles.subtitle}>Explore {formatNumber(allTracks.length)} racing venues</div>
              <p className={styles.intro}>
                Discover short tracks, speedways, fairgrounds, and historic racing venues across the
                Upper Midwest. Search the museum archive, browse by state, and open the stories behind
                the places where regional racing history was made.
              </p>
            </div>
            <div className={styles.heroScript} aria-hidden="true">
              <span>Tracks</span>
              <strong>Build Legends</strong>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <div className={styles.statIcon}>{stat.icon}</div>
                <div>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <form action="/tracks" method="get" className={styles.searchPanel}>
            <div className={styles.searchRow}>
              <div className={styles.searchInputWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Search tracks by name, city, or state..."
                  className={styles.searchInput}
                />
              </div>
              <button type="submit" className={styles.searchButton}>Search Tracks</button>
            </div>
            <div className={styles.filterGrid}>
              <label className={styles.filterField}>
                <span>State</span>
                <select name="state" defaultValue={selectedState}>
                  <option value="">All States</option>
                  {Object.entries(stateCounts)
                    .sort(([a], [b]) => (stateNames[a] || a).localeCompare(stateNames[b] || b))
                    .map(([code, count]) => (
                      <option key={code} value={code}>{stateNames[code] || code} ({count})</option>
                    ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Surface</span>
                <select name="surface" defaultValue={selectedSurface}>
                  <option value="">All Surfaces</option>
                  {surfaces.map((surface) => (
                    <option key={surface} value={surface}>{formatSurface(surface)}</option>
                  ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Sort By</span>
                <select name="sort" defaultValue={selectedSort}>
                  <option value="name">Track Name (A–Z)</option>
                  <option value="events">Deepest Results Archive</option>
                  <option value="oldest">Oldest Documented Venue</option>
                </select>
              </label>
              <div className={styles.filterActions}>
                {hasFilters ? <Link href="/tracks#directory">Clear Filters</Link> : <span>Search the full museum directory</span>}
              </div>
            </div>
          </form>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>⌖ Browse the region</div>
              <h2>Browse by State</h2>
            </div>
            <div className={styles.sectionNote}>Start with the museum&apos;s five-state core region.</div>
          </div>

          <div className={styles.stateGrid}>
            {primaryStates.map((state, index) => {
              const leader = stateLeaders[index]
              const imageUrl = getPhotoUrl(photoForTrack(leader))
              return (
                <Link key={state.code} href={`/tracks/state/${state.code.toLowerCase()}`} className={styles.stateCard}>
                  {imageUrl ? <img src={imageUrl} alt="" className={styles.stateCardImage} /> : null}
                  <div className={styles.stateCardShade} />
                  <div className={styles.stateCode}>{state.code}</div>
                  <div className={styles.stateCardBody}>
                    <div className={styles.stateName}>{state.name}</div>
                    <div className={styles.stateCount}>{formatNumber(stateCounts[state.code])} Tracks</div>
                  </div>
                  <span className={styles.circleArrow}>›</span>
                </Link>
              )
            })}
          </div>

          {otherStates.length > 0 ? (
            <div className={styles.otherStates}>
              <span>Also in the archive:</span>
              {otherStates.map(([code, count]) => (
                <Link key={code} href={`/tracks/state/${code.toLowerCase()}`}>
                  {stateNames[code] || code} <strong>{count}</strong>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.discoveryGrid} aria-label="Track archive highlights">
          {discoveryCards.map((card) => {
            const track = card.track
            const imageUrl = getPhotoUrl(photoForTrack(track))
            return track ? (
              <Link key={card.label} href={`/tracks/${track.slug}`} className={styles.discoveryCard}>
                <div className={styles.discoveryLabel}><span>{card.icon}</span>{card.label}</div>
                <div className={styles.discoveryName}>{track.track_name}</div>
                <div className={styles.discoveryLocation}>{formatLocation(track)}</div>
                <div className={styles.discoveryMedia}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={`Racing at ${track.track_name}`} />
                  ) : (
                    <TrackLogo slug={track.slug} trackName={track.track_name} />
                  )}
                </div>
                <div className={styles.discoveryNote}>{card.note}</div>
                <div className={styles.discoveryLink}>View Track →</div>
              </Link>
            ) : null
          })}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>⚑ Museum highlights</div>
              <h2>Featured Tracks</h2>
            </div>
            <a href="#directory" className={styles.textLink}>View complete directory →</a>
          </div>

          <div className={styles.featuredGrid}>
            {featuredGrid.map((track) => {
              const imageUrl = getPhotoUrl(photoForTrack(track))
              return (
                <Link key={track.slug} href={`/tracks/${track.slug}`} className={styles.trackCard}>
                  <div className={styles.trackCardMedia}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={`Racing at ${track.track_name}`} />
                    ) : (
                      <TrackLogo slug={track.slug} trackName={track.track_name} />
                    )}
                  </div>
                  <div className={styles.trackCardBody}>
                    <div className={styles.trackCardName}>{track.track_name}</div>
                    <div className={styles.trackCardLocation}>{formatLocation(track)}</div>
                    <div className={styles.trackTags}>
                      {track.surface_type ? <span>{formatSurface(track.surface_type)}</span> : null}
                      {track.configuration ? <span>{formatConfiguration(track.configuration)}</span> : null}
                    </div>
                    <div className={styles.trackCardMeta}>
                      <span>{formatNumber(track.event_count)} events</span>
                      <span>{formatYears(track)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className={styles.section} id="directory">
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>▤ Research directory</div>
              <h2>Complete Track Directory</h2>
            </div>
            <div className={styles.directorySummary}>
              {formatNumber(filteredTracks.length)} track{filteredTracks.length === 1 ? '' : 's'}
              {hasFilters ? ' match the current filters' : ' in the museum archive'}
            </div>
          </div>

          {tracksResult.error ? (
            <div className={styles.errorBox}>The track directory could not be loaded right now.</div>
          ) : filteredTracks.length === 0 ? (
            <div className={styles.emptyBox}>
              <strong>No tracks matched those filters.</strong>
              <span>Try a different spelling, state, or surface.</span>
              <Link href="/tracks#directory">Clear all filters</Link>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.directoryTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Track Name</th>
                      <th>City</th>
                      <th>State</th>
                      <th>Surface</th>
                      <th>Archive</th>
                      <th>Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directoryPage.map((track, index) => (
                      <tr key={track.slug}>
                        <td>{(currentPage - 1) * pageSize + index + 1}</td>
                        <td><Link href={`/tracks/${track.slug}`}>{track.track_name}</Link></td>
                        <td>{track.city || '—'}</td>
                        <td>{track.state || '—'}</td>
                        <td>{formatSurface(track.surface_type)}</td>
                        <td>{formatYears(track)}</td>
                        <td>{formatNumber(track.event_count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 ? (
                <div className={styles.pagination}>
                  {currentPage > 1 ? (
                    <Link href={buildPageHref(currentPage - 1, filters)}>← Previous</Link>
                  ) : <span />}
                  <strong>Page {currentPage} of {pageCount}</strong>
                  {currentPage < pageCount ? (
                    <Link href={buildPageHref(currentPage + 1, filters)}>Next →</Link>
                  ) : <span />}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className={styles.researchGrid}>
          <Link href="/media/photos" className={styles.researchCard}>
            <div className={styles.researchIcon}>▣</div>
            <div>
              <div className={styles.researchTitle}>Track Photo Gallery</div>
              <p>Explore the museum&apos;s growing collection of track and racing photography.</p>
              <span>Browse Photos →</span>
            </div>
          </Link>
          <Link href="/media/newspapers" className={styles.researchCard}>
            <div className={styles.researchIcon}>▤</div>
            <div>
              <div className={styles.researchTitle}>OCR / Newspaper Archive</div>
              <p>Search digitized racing papers, clippings, results, and local coverage.</p>
              <span>Search Archive →</span>
            </div>
          </Link>
          <Link href="/stats/feature-winners" className={styles.researchCard}>
            <div className={styles.researchIcon}>▥</div>
            <div>
              <div className={styles.researchTitle}>Research Center</div>
              <p>Go deeper with feature winners, statistics, records, and museum research tools.</p>
              <span>Open Research Center →</span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  )
}
