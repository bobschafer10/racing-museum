import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TrackLogo from '../../[slug]/TrackLogo'
import StateMark from './StateMark'
import styles from './state-tracks.module.css'

export const revalidate = 300

type TrackRow = {
  track_id?: number | null
  slug: string
  track_name: string
  city?: string | null
  state?: string | null
  surface_type?: string | null
  configuration?: string | null
  first_year?: number | null
  last_year?: number | null
  event_count?: number | null
  first_event_year?: number | null
  last_event_year?: number | null
  latest_event_date?: string | null
  photo_count?: number | null
}

type PhotoRow = {
  slug: string
  file_name?: string | null
  track_slug?: string | null
  year?: string | null
  sequence?: number | null
}

const stateNames: Record<string, string> = {
  WI: 'Wisconsin',
  MN: 'Minnesota',
  MI: 'Michigan',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  MO: 'Missouri',
  OH: 'Ohio',
  TN: 'Tennessee',
  CO: 'Colorado',
  KS: 'Kansas',
  KY: 'Kentucky',
  SC: 'South Carolina',
  SD: 'South Dakota',
  ONT: 'Ontario',
}

const coreStates = [
  { code: 'WI', name: 'Wisconsin' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'IL', name: 'Illinois' },
  { code: 'MI', name: 'Michigan' },
  { code: 'IN', name: 'Indiana' },
]

function formatNumber(value?: number | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatSurface(value?: string | null) {
  if (!value) return 'Not listed'
  return value.replaceAll('_', ' ')
}

function formatConfiguration(value?: string | null) {
  if (!value) return ''
  return value.replaceAll('_', ' ')
}

function formatLocation(track?: TrackRow | null) {
  if (!track) return ''
  return [track.city, track.state].filter(Boolean).join(', ')
}

function formatYears(track?: TrackRow | null) {
  if (!track) return 'Years being researched'
  const first = Number(track.first_event_year || track.first_year || 0)
  const last = Number(track.last_event_year || track.last_year || 0)
  if (first && last) return first === last ? String(first) : `${first}–${last}`
  if (first) return `${first}–Present`
  if (last) return `Through ${last}`
  return 'Years being researched'
}

function formatDate(value?: string | null) {
  if (!value) return 'Recent archive activity'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPhotoUrl(photo?: PhotoRow | null) {
  if (!photo?.file_name) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return ''
  const trackSlug = photo.track_slug || photo.slug.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks|ky|sc|sd|ont)$/i, '')
  const year = photo.year || 'unknown-year'
  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

function buildPageHref(
  state: string,
  page: number,
  filters: { q: string; surface: string; sort: string },
) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.surface) params.set('surface', filters.surface)
  if (filters.sort && filters.sort !== 'name') params.set('sort', filters.sort)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return `/tracks/state/${state.toLowerCase()}${query ? `?${query}` : ''}#state-directory`
}

export default async function StateTracksPage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string }>
  searchParams?: Promise<{ q?: string; surface?: string; sort?: string; page?: string }>
}) {
  const { state: rawState } = await params
  const state = rawState.toUpperCase()
  const stateName = stateNames[state]
  if (!stateName) notFound()

  const queryParams = (await searchParams) ?? {}
  const query = (queryParams.q ?? '').trim()
  const selectedSurface = (queryParams.surface ?? '').trim()
  const selectedSort = ['name', 'events', 'photos', 'oldest', 'recent'].includes(queryParams.sort || '')
    ? String(queryParams.sort)
    : 'name'

  const { data, error } = await supabase
    .from('track_landing_directory_view')
    .select('track_id,track_name,slug,city,state,surface_type,configuration,first_year,last_year,event_count,first_event_year,last_event_year,latest_event_date,photo_count')
    .eq('state', state)
    .order('track_name', { ascending: true })
    .range(0, 999)

  const tracks = ((data ?? []) as TrackRow[]).map((track) => ({
    ...track,
    event_count: Number(track.event_count || 0),
    photo_count: Number(track.photo_count || 0),
  }))

  const slugs = tracks.map((track) => track.slug)
  let photoRows: PhotoRow[] = []
  if (slugs.length > 0) {
    const photoResult = await supabase
      .from('track_card_photo_view')
      .select('slug,file_name,track_slug,year,sequence')
      .in('slug', slugs)
      .range(0, 999)
    photoRows = (photoResult.data ?? []) as PhotoRow[]
  }
  const photoBySlug = new Map(photoRows.map((photo) => [photo.slug, photo]))

  const byEvents = [...tracks].sort((a, b) => Number(b.event_count || 0) - Number(a.event_count || 0))
  const byPhotos = [...tracks].sort((a, b) => Number(b.photo_count || 0) - Number(a.photo_count || 0))
  const byOldest = [...tracks].sort((a, b) => {
    const ay = Number(a.first_event_year || a.first_year || 9999)
    const by = Number(b.first_event_year || b.first_year || 9999)
    return ay - by || a.track_name.localeCompare(b.track_name)
  })
  const byRecent = [...tracks]
    .filter((track) => Boolean(track.latest_event_date))
    .sort((a, b) => String(b.latest_event_date).localeCompare(String(a.latest_event_date)))

  const usedHighlights = new Set<string>()
  const pickHighlight = (list: TrackRow[]) => {
    const match = list.find((track) => !usedHighlights.has(track.slug)) || list[0] || null
    if (match) usedHighlights.add(match.slug)
    return match
  }

  const deepestTrack = pickHighlight(byEvents)
  const mostPhotographedTrack = pickHighlight(byPhotos)
  const historicTrack = pickHighlight(byOldest)
  const recentTrack = pickHighlight(byRecent)

  const highlightCards = [
    deepestTrack ? {
      label: 'Deepest Results Archive',
      track: deepestTrack,
      left: `${formatNumber(deepestTrack.event_count)} events`,
      right: formatYears(deepestTrack),
    } : null,
    mostPhotographedTrack ? {
      label: 'Largest Photo Collection',
      track: mostPhotographedTrack,
      left: `${formatNumber(mostPhotographedTrack.photo_count)} photos`,
      right: formatYears(mostPhotographedTrack),
    } : null,
    historicTrack ? {
      label: 'Historic Venue',
      track: historicTrack,
      left: formatYears(historicTrack),
      right: `${formatNumber(historicTrack.event_count)} events`,
    } : null,
    recentTrack ? {
      label: 'Recently Active Archive',
      track: recentTrack,
      left: formatDate(recentTrack.latest_event_date),
      right: `${formatNumber(recentTrack.event_count)} events`,
    } : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card))

  const heroTrack = highlightCards.find((card) => photoBySlug.has(card.track.slug))?.track || deepestTrack || tracks[0] || null
  const heroPhotoUrl = getPhotoUrl(heroTrack ? photoBySlug.get(heroTrack.slug) : null)

  const totalEvents = tracks.reduce((sum, track) => sum + Number(track.event_count || 0), 0)
  const totalPhotos = tracks.reduce((sum, track) => sum + Number(track.photo_count || 0), 0)
  const firstYears = tracks.map((track) => Number(track.first_event_year || track.first_year || 0)).filter(Boolean)
  const lastYears = tracks.map((track) => Number(track.last_event_year || track.last_year || 0)).filter(Boolean)
  const firstArchiveYear = firstYears.length ? Math.min(...firstYears) : 0
  const lastArchiveYear = lastYears.length ? Math.max(...lastYears) : 0
  const archiveSpan = firstArchiveYear && lastArchiveYear
    ? firstArchiveYear === lastArchiveYear
      ? String(firstArchiveYear)
      : `${firstArchiveYear}–${lastArchiveYear}`
    : 'Growing archive'

  const surfaces = Array.from(
    new Set(tracks.map((track) => track.surface_type).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b))

  let filteredTracks = tracks.filter((track) => {
    const haystack = `${track.track_name} ${track.city || ''} ${track.state || ''}`.toLowerCase()
    const matchesQuery = !query || haystack.includes(query.toLowerCase())
    const matchesSurface = !selectedSurface || track.surface_type === selectedSurface
    return matchesQuery && matchesSurface
  })

  if (selectedSort === 'events') {
    filteredTracks = filteredTracks.sort((a, b) => Number(b.event_count || 0) - Number(a.event_count || 0))
  } else if (selectedSort === 'photos') {
    filteredTracks = filteredTracks.sort((a, b) => Number(b.photo_count || 0) - Number(a.photo_count || 0))
  } else if (selectedSort === 'oldest') {
    filteredTracks = filteredTracks.sort((a, b) => {
      const ay = Number(a.first_event_year || a.first_year || 9999)
      const by = Number(b.first_event_year || b.first_year || 9999)
      return ay - by || a.track_name.localeCompare(b.track_name)
    })
  } else if (selectedSort === 'recent') {
    filteredTracks = filteredTracks.sort((a, b) => String(b.latest_event_date || '').localeCompare(String(a.latest_event_date || '')))
  } else {
    filteredTracks = filteredTracks.sort((a, b) => a.track_name.localeCompare(b.track_name))
  }

  const pageSize = 24
  const requestedPage = Math.max(1, Number.parseInt(queryParams.page || '1', 10) || 1)
  const pageCount = Math.max(1, Math.ceil(filteredTracks.length / pageSize))
  const currentPage = Math.min(requestedPage, pageCount)
  const pageTracks = filteredTracks.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const filters = { q: query, surface: selectedSurface, sort: selectedSort }
  const hasFilters = Boolean(query || selectedSurface || selectedSort !== 'name')

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroPhotoUrl ? (
          <img src={heroPhotoUrl} alt={`Racing history from ${stateName}`} className={styles.heroImage} />
        ) : (
          <div className={styles.heroFallback} aria-hidden="true" />
        )}

        <div className={styles.heroInner}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>›</span><Link href="/tracks">Tracks</Link><span>›</span><span>{stateName}</span>
          </nav>

          <div className={styles.heroGrid}>
            <div>
              <div className={styles.eyebrow}>Upper Midwest Track Archive</div>
              <h1 className={styles.title}>{stateName} Tracks</h1>
              <div className={styles.subtitle}>Explore {formatNumber(tracks.length)} racing venues</div>
              <p className={styles.intro}>
                Browse speedways, fairgrounds, short tracks, and historic racing venues documented by
                the museum in {stateName}. Open any track to explore its results, champions, feature
                winners, photographs, and growing research archive.
              </p>
            </div>
            <div className={styles.stateMark}>
              <StateMark code={state} className={styles.stateShape} fallbackClassName={styles.stateLetters} />
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}><div className={styles.statValue}>{formatNumber(tracks.length)}</div><div className={styles.statLabel}>Tracks Archived</div></div>
            <div className={styles.statCard}><div className={styles.statValue}>{formatNumber(totalEvents)}</div><div className={styles.statLabel}>Race Events Recorded</div></div>
            <div className={styles.statCard}><div className={styles.statValue}>{formatNumber(totalPhotos)}</div><div className={styles.statLabel}>Track & Racing Photos</div></div>
            <div className={styles.statCard}><div className={styles.statValue}>{archiveSpan}</div><div className={styles.statLabel}>Years of Racing</div></div>
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <form action={`/tracks/state/${state.toLowerCase()}`} method="get" className={styles.searchPanel}>
          <div className={styles.searchRow}>
            <input type="text" name="q" defaultValue={query} placeholder={`Search ${stateName} tracks by name or city...`} className={styles.searchInput} />
            <button type="submit" className={styles.searchButton}>Search Tracks</button>
          </div>
          <div className={styles.filterGrid}>
            <label className={styles.filterField}>
              <span>Surface</span>
              <select name="surface" defaultValue={selectedSurface}>
                <option value="">All Surfaces</option>
                {surfaces.map((surface) => <option key={surface} value={surface}>{formatSurface(surface)}</option>)}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Sort By</span>
              <select name="sort" defaultValue={selectedSort}>
                <option value="name">Track Name (A–Z)</option>
                <option value="events">Deepest Results Archive</option>
                <option value="photos">Largest Photo Collection</option>
                <option value="recent">Most Recently Updated</option>
                <option value="oldest">Oldest Documented Venue</option>
              </select>
            </label>
            <div className={styles.filterActions}>
              {hasFilters ? <Link href={`/tracks/state/${state.toLowerCase()}#state-directory`}>Clear Filters</Link> : <span>{formatNumber(tracks.length)} tracks in the {stateName} archive</span>}
            </div>
          </div>
        </form>

        <nav className={styles.stateSwitcher} aria-label="Switch state track archive">
          <span className={styles.stateSwitcherLabel}>Jump to state</span>
          <div className={styles.stateSwitcherLinks}>
            {coreStates.map((item) => (
              <Link
                key={item.code}
                href={`/tracks/state/${item.code.toLowerCase()}`}
                className={item.code === state ? styles.stateSwitcherActive : undefined}
                aria-current={item.code === state ? 'page' : undefined}
              >
                <strong>{item.code}</strong><span>{item.name}</span>
              </Link>
            ))}
            <Link href="/tracks" className={styles.stateSwitcherAll}>All States</Link>
          </div>
        </nav>

        {highlightCards.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div><div className={styles.sectionKicker}>State archive highlights</div><h2>Explore {stateName} Racing History</h2></div>
              <Link href="/tracks" className={styles.textLink}>Back to all states →</Link>
            </div>

            <div className={styles.highlightGrid}>
              {highlightCards.map((card) => {
                const imageUrl = getPhotoUrl(photoBySlug.get(card.track.slug))
                return (
                  <Link key={card.label} href={`/tracks/${card.track.slug}`} className={styles.highlightCard}>
                    <div className={styles.highlightCopy}>
                      <div className={styles.highlightLabel}>{card.label}</div>
                      <div className={styles.highlightName}>{card.track.track_name}</div>
                      <div className={styles.highlightLocation}>{formatLocation(card.track)}</div>
                    </div>
                    <div className={styles.highlightMedia}>
                      {imageUrl ? <img src={imageUrl} alt={`Racing at ${card.track.track_name}`} /> : <TrackLogo slug={card.track.slug} trackName={card.track.track_name} />}
                    </div>
                    <div className={styles.highlightMeta}><strong>{card.left}</strong><span>{card.right}</span></div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className={styles.section} id="state-directory">
          <div className={styles.sectionHeader}>
            <div><div className={styles.sectionKicker}>Track directory</div><h2>{stateName} Track Archive</h2></div>
            <div className={styles.sectionNote}>{formatNumber(filteredTracks.length)} track{filteredTracks.length === 1 ? '' : 's'}{hasFilters ? ' match the current filters' : ' available'}</div>
          </div>

          {error ? (
            <div className={styles.errorBox}>The {stateName} track directory could not be loaded right now.</div>
          ) : filteredTracks.length === 0 ? (
            <div className={styles.emptyBox}><strong>No tracks matched those filters.</strong><span>Try another track name, city, or surface.</span><Link href={`/tracks/state/${state.toLowerCase()}#state-directory`}>Clear all filters</Link></div>
          ) : (
            <>
              <div className={styles.trackGrid}>
                {pageTracks.map((track) => {
                  const imageUrl = getPhotoUrl(photoBySlug.get(track.slug))
                  return (
                    <Link key={track.slug} href={`/tracks/${track.slug}`} className={styles.trackCard}>
                      <div className={styles.trackMedia}>
                        {imageUrl ? <img src={imageUrl} alt={`Racing at ${track.track_name}`} /> : <TrackLogo slug={track.slug} trackName={track.track_name} />}
                      </div>
                      <div className={styles.trackBody}>
                        <div className={styles.trackName}>{track.track_name}</div>
                        <div className={styles.trackLocation}>{formatLocation(track)}</div>
                        <div className={styles.trackTags}>
                          {track.surface_type ? <span>{formatSurface(track.surface_type)}</span> : null}
                          {track.configuration ? <span>{formatConfiguration(track.configuration)}</span> : null}
                        </div>
                        <div className={styles.trackStats}>
                          <div><strong>{formatNumber(track.event_count)}</strong><span>events</span></div>
                          <div><strong>{formatNumber(track.photo_count)}</strong><span>photos</span></div>
                        </div>
                        <div className={styles.trackYears}>{formatYears(track)}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {pageCount > 1 ? (
                <div className={styles.pagination}>
                  {currentPage > 1 ? <Link href={buildPageHref(state, currentPage - 1, filters)}>← Previous</Link> : <span />}
                  <strong>Page {currentPage} of {pageCount}</strong>
                  {currentPage < pageCount ? <Link href={buildPageHref(state, currentPage + 1, filters)}>Next →</Link> : <span />}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className={styles.stateFooter}>
          <Link href="/tracks" className={styles.footerCard}><div className={styles.footerTitle}>All Track Archives</div><p>Return to the museum track landing page and browse every state in the collection.</p><span>Browse All Tracks →</span></Link>
          <Link href="/media/photos" className={styles.footerCard}><div className={styles.footerTitle}>Museum Photo Archive</div><p>Explore the larger collection of historic racing photography from across the region.</p><span>Browse Photos →</span></Link>
          <Link href="/stats/feature-winners" className={styles.footerCard}><div className={styles.footerTitle}>Research Center</div><p>Continue into feature winners, records, statistics, and deeper museum research tools.</p><span>Open Research Center →</span></Link>
        </section>
      </div>
    </main>
  )
}
