import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TrackLogo from './[slug]/TrackLogo'
import styles from './tracks-landing.module.css'

export const revalidate = 300

type TrackRow = {
  track_id?: number | null
  track_name: string
  slug: string
  city?: string | null
  state?: string | null
  surface_type?: string | null
  configuration?: string | null
  first_year?: number | null
  last_year?: number | null
  image_url?: string | null
  logo_url?: string | null
  event_count?: number | null
  first_event_year?: number | null
  last_event_year?: number | null
  latest_event_date?: string | null
  photo_count?: number | null
}

type PhotoRow = {
  file_name?: string | null
  track_slug?: string | null
  year?: string | null
  sequence?: number | null
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
  KY: 'Kentucky',
  SC: 'South Carolina',
  SD: 'South Dakota',
  ONT: 'Ontario',
}

const curatedFeaturedSlugs = [
  '141-speedway-wi',
  'wisconsin-international-raceway-wi',
  'cedar-lake-speedway-wi',
  'angell-park-speedway-wi',
  'milwaukee-mile-wi',
  'rockford-speedway-il',
]

function baseTrackSlug(slug: string) {
  return slug.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks|ky|sc|sd|ont)$/i, '')
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
  if (!value) return 'Not listed'
  return value.replaceAll('_', ' ')
}

function formatConfiguration(value?: string | null) {
  if (!value) return ''
  return value.replaceAll('_', ' ')
}

function formatYears(track?: TrackRow | null) {
  if (!track) return 'Archive years vary'
  const first = track.first_event_year || track.first_year
  const last = track.last_event_year || track.last_year
  if (first && last) return first === last ? String(first) : `${first}–${last}`
  if (first) return `${first}–Present`
  if (last) return `Through ${last}`
  return 'Years being researched'
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

function StatIcon({ kind }: { kind: 'tracks' | 'events' | 'photos' | 'states' | 'years' }) {
  if (kind === 'tracks') {
    return <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true"><ellipse cx="16" cy="16" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="2.2" /><ellipse cx="16" cy="16" rx="8" ry="4.8" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  }
  if (kind === 'events') {
    return <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true"><path d="M7 27V5" stroke="currentColor" strokeWidth="2" /><path d="M9 6h16v12H9z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M9 6h8v6H9zm8 6h8v6h-8z" fill="currentColor" opacity=".8" /></svg>
  }
  if (kind === 'photos') {
    return <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true"><path d="M6 10h5l2-3h6l2 3h5v15H6z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="16" cy="17" r="5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
  }
  if (kind === 'states') {
    return <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true"><path d="M6 8h8v7H6zm12-2h8v9h-8zM6 19h8v7H6zm12 0h8v7h-8z" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
  }
  return <svg viewBox="0 0 32 32" className={styles.svgIcon} aria-hidden="true"><rect x="6" y="8" width="20" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M10 5v6M22 5v6M6 13h20" stroke="currentColor" strokeWidth="2" /></svg>
}

function StateShape({ code }: { code: string }) {
  const common = { fill: 'currentColor', stroke: 'rgba(255,255,255,.72)', strokeWidth: 1.1, strokeLinejoin: 'round' as const }

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

  return (
    <svg viewBox="0 0 51 80" className={styles.stateShape} aria-hidden="true">
      <path {...common} d="M46.24 2.16v-.8L21.2 1.28l-2.4 1.28-2.96.8-1.6-.32-.08-.88-.4.4-.88-.88L12 40.32l-1.12.56.16 1.92-.8 1.44 1.6 2.64-.24 1.36.48 2-2.08 2.96.08 1.28-1.52.48.08.56-1.12 2.08-.24-.32-.48.64-.48-.32-.72 1.12.72 1.04-1.2 1.04.8.32-.88.4v2.4l-1.04.24 1.04 1.04-.88.32 1.84.48.56-.72-.24-1.12.24-.4 1.44.56 1.6-.16v1.12h.64l.48-.96-.08-1.28.48.88 1.92-.4 3.36 1.76.48.8 1.36-2.16 2.56-1.2.48 1.2 1.6.4-.08.48.4.4.48-1.04.88-.32.08-1.84.8-.4-.08-1.28.48.72 1.28-.8-.88-.64 1.36.56.32 1.52 2.72 1.76 1.52-1.12.32-2.48 1.04-1.76.8.32 1.44-.72.8-2.4.96-.16 1.28-1.52-.48-2.64 2.48-.24 1.04.64 3.04-1.68h1.76l.16-1.52-1.12-.32.72-1.12-.72-1.36.72-.56z" />
    </svg>
  )
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
  const selectedSort = ['name', 'events', 'photos', 'oldest', 'recent'].includes(params.sort || '')
    ? String(params.sort)
    : 'name'

  const [landingResult, photosCountResult] = await Promise.all([
    supabase
      .from('track_landing_directory_view')
      .select('track_id,track_name,slug,city,state,surface_type,configuration,first_year,last_year,image_url,logo_url,event_count,first_event_year,last_event_year,latest_event_date,photo_count')
      .order('track_name', { ascending: true })
      .range(0, 999),
    supabase
      .from('photos')
      .select('photo_id', { count: 'exact', head: true })
      .neq('credit_type', 'unknown'),
  ])

  const allTracks = ((landingResult.data ?? []) as TrackRow[]).map((track) => ({
    ...track,
    event_count: Number(track.event_count || 0),
    photo_count: Number(track.photo_count || 0),
  }))

  const stateCounts = allTracks.reduce<Record<string, number>>((acc, track) => {
    const code = (track.state || '').trim().toUpperCase()
    if (code) acc[code] = (acc[code] || 0) + 1
    return acc
  }, {})

  const surfaces = Array.from(
    new Set(allTracks.map((track) => track.surface_type).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b))

  const byEvents = [...allTracks].sort((a, b) => Number(b.event_count || 0) - Number(a.event_count || 0))
  const byRecent = [...allTracks]
    .filter((track) => Boolean(track.latest_event_date))
    .sort((a, b) => String(b.latest_event_date).localeCompare(String(a.latest_event_date)))

  const featuredTrack = allTracks.find((track) => track.slug === '141-speedway-wi') || byEvents[0] || null
  const historicTrack = allTracks.find((track) => track.slug === 'milwaukee-mile-wi') || null
  const recentTrack = byRecent[0] || null
  const deepestTrack = byEvents[0] || null

  const stateLeaders = primaryStates.map(
    (state) => byEvents.find((track) => track.state?.toUpperCase() === state.code) || null,
  )

  const curatedTracks = curatedFeaturedSlugs
    .map((slug) => allTracks.find((track) => track.slug === slug) || null)
  const featuredGrid = uniqueTracks([...curatedTracks, ...byEvents]).slice(0, 6)
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
      .limit(220)
    photoRows = (photoResult.data ?? []) as PhotoRow[]
  }

  const photoForTrack = (track?: TrackRow | null) => {
    if (!track) return null
    return photoRows.find((photo) => trackMatchesPhoto(track, photo)) || null
  }

  const heroPhotoUrl = getPhotoUrl(photoForTrack(featuredTrack))
  const totalEvents = allTracks.reduce((sum, track) => sum + Number(track.event_count || 0), 0)
  const firstArchiveYear = Math.min(
    ...allTracks.map((track) => Number(track.first_event_year || 9999)).filter((year) => year < 9999),
  )
  const lastArchiveYear = Math.max(
    ...allTracks.map((track) => Number(track.last_event_year || 0)),
  )
  const archiveYears = firstArchiveYear < 9999 && lastArchiveYear
    ? `${firstArchiveYear}–${lastArchiveYear}`
    : 'Growing archive'

  let filteredTracks = allTracks.filter((track) => {
    const haystack = `${track.track_name} ${track.city || ''} ${track.state || ''}`.toLowerCase()
    const matchesQuery = !query || haystack.includes(query.toLowerCase())
    const matchesState = !selectedState || track.state?.toUpperCase() === selectedState
    const matchesSurface = !selectedSurface || track.surface_type === selectedSurface
    return matchesQuery && matchesState && matchesSurface
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

  const pageSize = 15
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
    { kind: 'tracks' as const, value: formatNumber(allTracks.length), label: 'Tracks Archived' },
    { kind: 'events' as const, value: formatNumber(totalEvents), label: 'Race Events Recorded' },
    { kind: 'photos' as const, value: formatNumber(photosCountResult.count), label: 'Track & Racing Photos' },
    { kind: 'states' as const, value: String(primaryStates.length), label: 'Primary States' },
    { kind: 'years' as const, value: archiveYears, label: 'Years of Racing' },
  ]

  const discoveryCards = [
    {
      label: 'Featured Track',
      track: featuredTrack,
      note: featuredTrack ? `${formatNumber(featuredTrack.event_count)} recorded events` : 'Museum feature',
    },
    {
      label: 'Recently Updated',
      track: recentTrack,
      note: recentTrack?.latest_event_date ? `Latest archive activity · ${formatDate(recentTrack.latest_event_date)}` : 'Newest results in the archive',
    },
    {
      label: 'Historic Venue',
      track: historicTrack,
      note: historicTrack ? `${formatYears(historicTrack)} · ${formatNumber(historicTrack.photo_count)} photos` : 'Historic racing venue',
    },
    {
      label: 'Deepest Results Archive',
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
                <div className={styles.statIcon}><StatIcon kind={stat.kind} /></div>
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
                  <option value="photos">Largest Photo Collection</option>
                  <option value="recent">Most Recently Updated</option>
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
              <div className={styles.sectionKicker}>Browse the region</div>
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
                  <div className={styles.stateShapeWrap}><StateShape code={state.code} /></div>
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
                <div className={styles.discoveryLabel}>{card.label}</div>
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
              <div className={styles.sectionKicker}>Museum highlights</div>
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
                    <div className={styles.trackCardStats}>
                      <div><strong>{formatNumber(track.event_count)}</strong><span>events</span></div>
                      <div><strong>{formatNumber(track.photo_count)}</strong><span>photos</span></div>
                    </div>
                    <div className={styles.trackCardYears}>{formatYears(track)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className={styles.section} id="directory">
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>Research directory</div>
              <h2>Complete Track Directory</h2>
            </div>
            <div className={styles.directorySummary}>
              {formatNumber(filteredTracks.length)} track{filteredTracks.length === 1 ? '' : 's'}
              {hasFilters ? ' match the current filters' : ' in the museum archive'}
            </div>
          </div>

          {landingResult.error ? (
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
                      <th>Photos</th>
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
                        <td>{formatNumber(track.photo_count)}</td>
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
            <div className={styles.researchIcon}>01</div>
            <div>
              <div className={styles.researchTitle}>Track Photo Gallery</div>
              <p>Explore the museum&apos;s growing collection of track and racing photography.</p>
              <span>Browse Photos →</span>
            </div>
          </Link>
          <Link href="/media/newspapers" className={styles.researchCard}>
            <div className={styles.researchIcon}>02</div>
            <div>
              <div className={styles.researchTitle}>OCR / Newspaper Archive</div>
              <p>Search digitized racing papers, clippings, results, and local coverage.</p>
              <span>Search Archive →</span>
            </div>
          </Link>
          <Link href="/stats/feature-winners" className={styles.researchCard}>
            <div className={styles.researchIcon}>03</div>
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
