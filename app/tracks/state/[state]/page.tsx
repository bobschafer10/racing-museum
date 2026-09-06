import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TrackLogo from '../../[slug]/TrackLogo'
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

function StateMark({ code }: { code: string }) {
  const common = {
    fill: 'currentColor',
    stroke: 'rgba(255,255,255,.75)',
    strokeWidth: 1.1,
    strokeLinejoin: 'round' as const,
  }

  if (code === 'WI') return (
    <svg viewBox="0 0 67 80" className={styles.stateShape} aria-hidden="true">
      <path {...common} d="M61.6 24.48l-.88 1.36-1.2.48-.24 1.68-1.04 1.28-.08 1.04.72.96 1.52-1.84-.08-.56 1.36-1.84-.56-.56.56.16-.08-1.44.64-.16-.16-.56h-.48zM62.56 22.8l-.32.96h1.04l.08-.88zM25.28 4.08l1.44-.8-.16-.48-2 1.6zM27.04 2l.24-.32-1.28.48 1.04.24V2zM24.48 1.84l-.64-.4-.8.4-1.44 1.12-.96-.4L18.72 4l-3.68 1.12-1.68.16L12.08 4l-1.2 1.52h-.64l-.16 8.16-.72.64h-.72l-2.88 1.6L4 18.8v1.84l1.28.08.8 2.08-1.12 1.76v2.32l-.48.72.48 2.08-.72 2.48 2.16 2 1.92.4 1.04 1.52 1.84.64 1.6 1.44 1.28 2.56 1.52 1.36 2.48.72 1.12 1.28.4 2.72v3.68l.4 1.44 1.12.8-.8 2.16.8 5.12.8 1.2 3.2.8.48 2h29.6l.08-4.08-1.36-3.36-.16-3.36 1.92-6.24-.4-3.28.88-2.32 1.44-1.44-.64-1.76 1.92-6.72-1.12-1.12-1.28.56-1.76 2.64-1.6 1.6-.64.16-.64-.48 1.92-4.8 1.92-1.12.48-1.6-1.28-1.12.4-2.72-2 .16.72-1.68-.08-2.72-.88-.88-2.16-.56.16-1.12-.96-1.04-3.44-.96-2.96-.16-2.72-1.44-9.84-2.64-1.04-2.48-1.52-.4-.24-.72-1.6-.16-1.76-1.36-.24.88-1.52.4 1.76-4z" />
    </svg>
  )

  if (code === 'MN') return (
    <svg viewBox="0 0 64 80" className={styles.stateShape} aria-hidden="true">
      <path {...common} d="M18.24 4.48 18 3.04 4 2.56l.8 4-.4 1.28v4.32l1.76 5.92L6 24.8l.4.8-.24 3.12 1.44 5.44-.32 3.44-2.24 2.64L6.16 42l1.12.56.64.96-.8 20 20.8.48 21.04-.08-.48-4.4-.8-1.28-2.16-.64L42 53.68l-1.6-.4-.72-1.12-1.52-.4L36.32 50l.48-1.76-.4-1.52.4-.72v-1.52l.64-1.68-.64-1.52-1.04-.08-.24-1.36 1.68-2.32 3.12-2.08v-6.4h.48l.96-1.6 4.4-3.52 4.96-5.6 9.12-4.48-1.68-.24-.96.32-1.6-1.28-4.48.64-1.04-1.68-2.8 2h-2.4l-.8-.4-.32-.96-1.84-.56-.64-1.2-1.52.24-.16.88-.48.24-.96-2.32-1.52-.16.4-.88-2.24-.8-2.16-.24-1.44.4-.4.64-1.92.08-.88-1.2-5.36-1.12-.72-.64v-.96h-.96l-1.04-1.2z" />
    </svg>
  )

  if (code === 'IL') return (
    <svg viewBox="0 0 44 80" className={styles.stateShape} aria-hidden="true">
      <path {...common} d="M37.04.72 12.64.32l1.68 1.76.16 1.36 2.08 1.68-.32 3.12-2.32 3.44-2.24 1.12-2.96.16-.64 2.08 1.04 1.36.24 1.68-2 3.44-2.16 1.12.08 2.16-.96.4-.32 1.12.16 2.96.96 3.36 5.2 5.28.96 4.32.64.4 1.44-.88 2.56 1.28-.4 2.56-1.76 3.52.08 1.36 2.16 2.4 1.76.72 3.76 3.36v1.68l.48 1.6-.48 1.44.96 2.48 1.12.64-.32-.72.4-.16.96 1.2h.4l-.48-1.04 1.68-1.84 4.4 1.84.72-.24-.32-3.52 3.6-1.2-.64-1.68 1.04-1.52-.48-.72h.48l-.48-.8h.48v-1.84l.88-.32-.64-.16.88-.88-.72-.72.56-.88.72.32.96-2.08 1.04-.48-.16-.72 1.44-2.4-.24-2.16-1.36-1.92.8-1.04-.32-1.36.88-.32-.08-27.76-2.64-5.92V.72z" />
    </svg>
  )

  if (code === 'MI') return (
    <svg viewBox="0 0 72 80" className={styles.stateShape} aria-hidden="true">
      <path {...common} d="M48.32 18.72l-2.24.32.32.24-1.2 1.2v1.36l.64.88.8.24-3.44 1.44-.32 3.12-1.04 2.8.32-2.8-.88 2.56-.32-.8.56-4.08-2 2.88-.88-.24-1.04.88-.32 1.6-1.44.88.32 3.44-2.32 3.12.88 3.12-.88 2 1.44 4.32.88-.32-.64.56.64 2.56.24 3.36-1.44 4.88-2.24 4.24-1.68 1.44h17.28v.56l11.12-.56 2.24-3.36-.32-.88.64-2.08 2-1.36v-1.68l.88-.64-.32-.56 1.36-.24v1.44l.88-.88.88-4.56-2.24-8.8-.88-1.68-1.68-1.12-2.56 1.12-1.12.8h.56l-1.2 2.32-.56-.32-1.12 1.44-2-1.12.64-3.12 1.92-.88.56-2.32 1.44-.8.32-5.12-1.44-2.24.24-.88 1.2.56-.88-2.8-4.56-2.32h-1.44l-.8-1.36-2.32-.56zM18.8 4.48l.32-.88-.88-.24h-.32v-1.2l-2.56 2.32-1.12.32-2.32 1.44-2.8.32L4 9.36l1.44.56.8 1.92L14 14.48l1.92 1.12 2.56.24 3.12 1.12v1.44l2.32 1.52-.56 3.36h1.68l-.64 1.92.88 1.2v-.88l4.24-5.6.88-2.64v2.64l.88-.64.88-1.44h1.68v1.2l-.56-.32-.8 1.44.8.48.8-1.6 1.2-.64.88-1.44 2.48.32.32-.56 2-.32.88-1.04 4 .72 2.16 1.76.64-2 .88.56.56-.32 4.56.32v-.32l-1.44-1.04.24-.56-1.6-.56.48-.32-1.36-2.8-1.76.8-.56-.8-1.36.48-1.76-.48.56-3.2-4.24 1.12h-4.88l-3.92 2.88-.88-.8-.88.48-.88-1.04-1.6.56-1.2-.32-2-3.44-1.2-.8-2.48-.32-1.44.8 1.12-1.36-1.92 1.2-.56 1.04.24-2.56z" />
    </svg>
  )

  if (code === 'IN') return (
    <svg viewBox="0 0 51 80" className={styles.stateShape} aria-hidden="true">
      <path {...common} d="M46.24 2.16v-.8L21.2 1.28l-2.4 1.28-2.96.8-1.6-.32-.08-.88-.4.4-.88-.88L12 40.32l-1.12.56.16 1.92-.8 1.44 1.6 2.64-.24 1.36.48 2-2.08 2.96.08 1.28-1.52.48.08.56-1.12 2.08-.24-.32-.48.64-.48-.32-.72 1.12.72 1.04-1.2 1.04.8.32-.88.4v2.4l-1.04.24 1.04 1.04-.88.32 1.84.48.56-.72-.24-1.12.24-.4 1.44.56 1.6-.16v1.12h.64l.48-.96-.08-1.28.48.88 1.92-.4 3.36 1.76.48.8 1.36-2.16 2.56-1.2.48 1.2 1.6.4-.08.48.4.4.48-1.04.88-.32.08-1.84.8-.4-.08-1.28.48.72 1.28-.8-.88-.64 1.36.56.32 1.52 2.72 1.76 1.52-1.12.32-2.48 1.04-1.76.8.32 1.44-.72.8-2.4.96-.16 1.28-1.52-.48-2.64 2.48-.24 1.04.64 3.04-1.68h1.76l.16-1.52-1.12-.32.72-1.12-.72-1.36.72-.56z" />
    </svg>
  )

  return <div className={styles.stateLetters}>{code}</div>
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
  const firstYears = tracks
    .map((track) => Number(track.first_event_year || track.first_year || 0))
    .filter(Boolean)
  const lastYears = tracks
    .map((track) => Number(track.last_event_year || track.last_year || 0))
    .filter(Boolean)
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
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href="/tracks">Tracks</Link>
            <span>›</span>
            <span>{stateName}</span>
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
            <div className={styles.stateMark}><StateMark code={state} /></div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatNumber(tracks.length)}</div>
              <div className={styles.statLabel}>Tracks Archived</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatNumber(totalEvents)}</div>
              <div className={styles.statLabel}>Race Events Recorded</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatNumber(totalPhotos)}</div>
              <div className={styles.statLabel}>Track & Racing Photos</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{archiveSpan}</div>
              <div className={styles.statLabel}>Years of Racing</div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <form action={`/tracks/state/${state.toLowerCase()}`} method="get" className={styles.searchPanel}>
          <div className={styles.searchRow}>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder={`Search ${stateName} tracks by name or city...`}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>Search Tracks</button>
          </div>
          <div className={styles.filterGrid}>
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
                <option value="photos">Largest Photo Collection</option>
                <option value="recent">Most Recently Updated</option>
                <option value="oldest">Oldest Documented Venue</option>
              </select>
            </label>
            <div className={styles.filterActions}>
              {hasFilters ? (
                <Link href={`/tracks/state/${state.toLowerCase()}#state-directory`}>Clear Filters</Link>
              ) : (
                <span>{formatNumber(tracks.length)} tracks in the {stateName} archive</span>
              )}
            </div>
          </div>
        </form>

        {highlightCards.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionKicker}>State archive highlights</div>
                <h2>Explore {stateName} Racing History</h2>
              </div>
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
                      {imageUrl ? (
                        <img src={imageUrl} alt={`Racing at ${card.track.track_name}`} />
                      ) : (
                        <TrackLogo slug={card.track.slug} trackName={card.track.track_name} />
                      )}
                    </div>
                    <div className={styles.highlightMeta}>
                      <strong>{card.left}</strong>
                      <span>{card.right}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className={styles.section} id="state-directory">
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>Track directory</div>
              <h2>{stateName} Track Archive</h2>
            </div>
            <div className={styles.sectionNote}>
              {formatNumber(filteredTracks.length)} track{filteredTracks.length === 1 ? '' : 's'}
              {hasFilters ? ' match the current filters' : ' available'}
            </div>
          </div>

          {error ? (
            <div className={styles.errorBox}>The {stateName} track directory could not be loaded right now.</div>
          ) : filteredTracks.length === 0 ? (
            <div className={styles.emptyBox}>
              <strong>No tracks matched those filters.</strong>
              <span>Try another track name, city, or surface.</span>
              <Link href={`/tracks/state/${state.toLowerCase()}#state-directory`}>Clear all filters</Link>
            </div>
          ) : (
            <>
              <div className={styles.trackGrid}>
                {pageTracks.map((track) => {
                  const imageUrl = getPhotoUrl(photoBySlug.get(track.slug))
                  return (
                    <Link key={track.slug} href={`/tracks/${track.slug}`} className={styles.trackCard}>
                      <div className={styles.trackMedia}>
                        {imageUrl ? (
                          <img src={imageUrl} alt={`Racing at ${track.track_name}`} />
                        ) : (
                          <TrackLogo slug={track.slug} trackName={track.track_name} />
                        )}
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
                  {currentPage > 1 ? (
                    <Link href={buildPageHref(state, currentPage - 1, filters)}>← Previous</Link>
                  ) : <span />}
                  <strong>Page {currentPage} of {pageCount}</strong>
                  {currentPage < pageCount ? (
                    <Link href={buildPageHref(state, currentPage + 1, filters)}>Next →</Link>
                  ) : <span />}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className={styles.stateFooter}>
          <Link href="/tracks" className={styles.footerCard}>
            <div className={styles.footerTitle}>All Track Archives</div>
            <p>Return to the museum track landing page and browse every state in the collection.</p>
            <span>Browse All Tracks →</span>
          </Link>
          <Link href="/media/photos" className={styles.footerCard}>
            <div className={styles.footerTitle}>Museum Photo Archive</div>
            <p>Explore the larger collection of historic racing photography from across the region.</p>
            <span>Browse Photos →</span>
          </Link>
          <Link href="/stats/feature-winners" className={styles.footerCard}>
            <div className={styles.footerTitle}>Research Center</div>
            <p>Continue into feature winners, records, statistics, and deeper museum research tools.</p>
            <span>Open Research Center →</span>
          </Link>
        </section>
      </div>
    </main>
  )
}
