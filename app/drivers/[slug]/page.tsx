// app/drivers/[slug]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DriverCareerAccomplishments } from '@/components/DriverCareerAccomplishments'
import PhotoLightboxImage from '@/components/PhotoLightboxImage'
import styles from './driver-profile.module.css'

type Driver = {
  driver_id: number
  driver_name: string
  driver_slug?: string
  hometown: string | null
  state: string | null
  recorded_wins: number | null
  wisconsin_feature_wins: number | null
  recorded_top_3_finishes: number | null
  recorded_results: number | null
}

type Photo = {
  photo_id: string | number
  file_name: string
  year: string | number | null
  photographer_slug: string | null
  credit_type: string | null
  sequence: number | null
  track_slug?: string | null
}

type CareerHeadlineRow = {
  accomplishment_type: string
}

export const revalidate = 300

const SUPABASE_PHOTO_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master'

const COVERAGE_STATES = new Set(['WI', 'MN', 'MI', 'IL'])
const SERIES_CHAMPIONSHIP_TYPES = new Set([
  'SERIES_CHAMPIONSHIP',
  'REGIONAL_CHAMPIONSHIP',
  'NATIONAL_CHAMPIONSHIP',
])
const DISCOVERED_WIN_TYPES = new Set([
  'OUTSIDE_AREA_FEATURE_WIN',
  'MAJOR_EVENT_WIN',
])

function number(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-US')
}

export default async function DriverProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: driver, error } = await supabase
    .from('driver_directory_alpha_view')
    .select('*')
    .eq('driver_slug', slug)
    .single<Driver>()

  if (error || !driver) notFound()

  const [
    { data: photos },
    { data: topTracks },
    { data: resultsByYear },
    { data: winsByClass },
    { data: recentResults },
    { data: championships },
    { data: winRows },
    { data: seriesChampionshipRows },
    { data: seriesWinRows },
    { data: lastWinRows },
    { data: careerHeadlineRows },
  ] = await Promise.all([
    supabase
      .from('photos')
      .select('photo_id, file_name, year, photographer_slug, credit_type, sequence, track_slug')
      .eq('driver_slug', slug)
      .order('year', { ascending: true, nullsFirst: false })
      .order('sequence', { ascending: true }),
    supabase
      .from('driver_wins_by_track_view')
      .select('track_name, track_slug, wins')
      .eq('driver_slug', slug)
      .order('wins', { ascending: false })
      .limit(10),
    supabase
      .from('driver_results_by_year_view')
      .select('result_year, results_count, wins, top_3s')
      .eq('driver_slug', slug)
      .order('result_year', { ascending: false })
      .limit(60),
    supabase
      .from('driver_wins_by_class_view')
      .select('class_name, wins')
      .eq('driver_slug', slug)
      .order('wins', { ascending: false })
      .limit(10),
    supabase
      .from('driver_recent_results_view')
      .select('race_date, track_name, track_slug, class_name, finishing_position')
      .eq('driver_slug', slug)
      .order('race_date', { ascending: false })
      .limit(10),
    supabase
      .from('driver_championships_view')
      .select('year, track_name, track_slug, class_name')
      .eq('driver_slug', slug)
      .order('year', { ascending: false }),
    supabase
      .from('driver_full_results_view')
      .select('track_slug, class_name, race_date')
      .eq('driver_slug', slug)
      .eq('finishing_position', 1),
    supabase
      .from('SeriesSeasons')
      .select('id, series_id, year')
      .eq('champion_driver_id', driver.driver_id),
    supabase
      .from('SeriesEvents')
      .select('series_id')
      .eq('winner_driver_id', driver.driver_id),
    supabase
      .from('driver_full_results_view')
      .select('race_date')
      .eq('driver_slug', slug)
      .eq('finishing_position', 1)
      .order('race_date', { ascending: false })
      .limit(1),
    supabase
      .from('DriverCareerAccomplishments')
      .select('accomplishment_type')
      .eq('driver_slug', slug)
      .eq('is_published', true),
  ])

  const safePhotos = (photos ?? []) as Photo[]
  const safeTopTracks = topTracks ?? []
  const flatResultsByYear = Array.isArray(resultsByYear ?? []) ? (resultsByYear ?? []) : []
  const safeWinsByClass = winsByClass ?? []
  const safeRecentResults = recentResults ?? []
  const safeChampionships = championships ?? []
  const safeWinRows = winRows ?? []
  const safeCareerHeadlineRows = (careerHeadlineRows ?? []) as CareerHeadlineRow[]

  const orderedPhotos = [...safePhotos].sort((a, b) => {
    const yearA = normalizedPhotoYear(a.year)
    const yearB = normalizedPhotoYear(b.year)
    if (yearA !== yearB) return yearA - yearB
    return (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER)
  })

  const datedPhotos = orderedPhotos.filter((p) => normalizedPhotoYear(p.year) !== Number.MAX_SAFE_INTEGER)
  const profilePhotoItem: Photo | null = datedPhotos[0] ?? orderedPhotos[0] ?? null
  const heroPhotoItem: Photo | null = datedPhotos[datedPhotos.length - 1] ?? orderedPhotos[orderedPhotos.length - 1] ?? null
  const galleryCandidates = orderedPhotos.filter((p) => p.file_name !== profilePhotoItem?.file_name)
  const displayPhotos = (
    heroPhotoItem && heroPhotoItem.file_name !== profilePhotoItem?.file_name && galleryCandidates.length > 1
      ? galleryCandidates.filter((p) => p.file_name !== heroPhotoItem.file_name)
      : galleryCandidates
  ).slice(0, 150)

  const lastRecordedYear = flatResultsByYear.length
    ? Number((flatResultsByYear[0] as any)?.result_year || 0)
    : null
  const firstRecordedYear = flatResultsByYear.length
    ? Number((flatResultsByYear[flatResultsByYear.length - 1] as any)?.result_year || 0)
    : null
  const careerSpanDisplay = firstRecordedYear && lastRecordedYear
    ? `${firstRecordedYear}–${lastRecordedYear}`
    : '—'

  const winningTrackSlugs = Array.from(new Set(
    safeWinRows.map((row: any) => row.track_slug).filter(Boolean),
  )) as string[]

  const { data: winningTrackRows } = winningTrackSlugs.length
    ? await supabase.from('Tracks').select('slug, state, logo_url').in('slug', winningTrackSlugs)
    : { data: [] as any[] }

  const stateByTrack = new Map<string, string>()
  const logoByTrack = new Map<string, string>()
  for (const row of winningTrackRows ?? []) {
    const trackSlug = String((row as any).slug)
    stateByTrack.set(trackSlug, String((row as any).state || '').trim())
    if ((row as any).logo_url) logoByTrack.set(trackSlug, String((row as any).logo_url))
  }

  const coverageAreaWins = safeWinRows.filter((row: any) =>
    COVERAGE_STATES.has(stateByTrack.get(String(row.track_slug || '')) || ''),
  ).length

  const museumDiscoveredWins = Math.max(
    safeWinRows.length,
    coverageAreaWins,
    driver.wisconsin_feature_wins ?? 0,
  )
  const discoveredOutsideWins = safeCareerHeadlineRows.filter((row) =>
    DISCOVERED_WIN_TYPES.has(row.accomplishment_type),
  ).length
  const totalDiscoveredWins = museumDiscoveredWins + discoveredOutsideWins

  const externalSeriesChampionships = safeCareerHeadlineRows.filter((row) =>
    SERIES_CHAMPIONSHIP_TYPES.has(row.accomplishment_type),
  ).length
  const seriesChampionships = (seriesChampionshipRows ?? []).length + externalSeriesChampionships

  const externalTrackChampionships = safeCareerHeadlineRows.filter((row) =>
    row.accomplishment_type === 'TRACK_CHAMPIONSHIP',
  ).length
  const trackChampionships = safeChampionships.length + externalTrackChampionships

  const tracksWonAt = winningTrackSlugs.length
  const classesWonIn = new Set(
    safeWinRows.map((row: any) => row.class_name).filter(Boolean),
  ).size
  const mostSuccessfulClass = safeWinsByClass[0]?.class_name || '—'
  const mostSuccessfulTrack = safeTopTracks[0]?.track_name || '—'
  const mostSuccessfulTrackSlug = safeTopTracks[0]?.track_slug || null
  const mostSuccessfulTrackLogo = mostSuccessfulTrackSlug
    ? (logoByTrack.get(String(mostSuccessfulTrackSlug)) || `/logos/tracks/${mostSuccessfulTrackSlug}.jpg`)
    : ''

  const seriesWinCounts = new Map<number, number>()
  for (const row of seriesWinRows ?? []) {
    const id = Number((row as any).series_id)
    if (id) seriesWinCounts.set(id, (seriesWinCounts.get(id) ?? 0) + 1)
  }
  const topSeriesId = Array.from(seriesWinCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const { data: topSeriesRow } = topSeriesId
    ? await supabase.from('Series').select('series_name, logo_url').eq('id', topSeriesId).maybeSingle()
    : { data: null as any }
  const mostSuccessfulSeries = (topSeriesRow as any)?.series_name || 'No series wins recorded'
  const mostSuccessfulSeriesLogo = (topSeriesRow as any)?.logo_url || ''
  const lastFeatureWinDate = (lastWinRows?.[0] as any)?.race_date
    ? formatRaceDate((lastWinRows?.[0] as any).race_date)
    : '—'

  const bestYear = flatResultsByYear.reduce<any | null>((best, row: any) => {
    if (!best || (row.wins ?? 0) > (best.wins ?? 0)) return row
    return best
  }, null)

  const careerHighlights = [
    firstRecordedYear ? { year: firstRecordedYear, text: 'First Recorded Feature Race' } : null,
    bestYear && bestYear.wins > 0 ? { year: bestYear.result_year, text: `${bestYear.wins} Feature Wins — Career High` } : null,
    ...safeChampionships.slice(0, 3).map((ch: any) => ({ year: ch.year, text: `${ch.track_name} Champion` })),
    lastRecordedYear && lastRecordedYear !== firstRecordedYear ? { year: lastRecordedYear, text: 'Latest Recorded Feature Season' } : null,
  ].filter(Boolean) as { year: number | string; text: string }[]

  const buildPhotoUrl = (photoObj: Photo | null | undefined) => {
    if (!photoObj?.file_name) return ''
    const track = String(photoObj.track_slug || 'unknown-track')
    const year = String(photoObj.year || 'unknown-year')
    return `${SUPABASE_PHOTO_BASE}/${track}/${year}/${encodeURIComponent(String(photoObj.file_name))}`
  }

  const heroUrl = buildPhotoUrl(heroPhotoItem)
  const profilePhotoUrl = buildPhotoUrl(profilePhotoItem)

  const primaryStats = [
    { value: number(driver.recorded_wins), label: 'Recorded Feature Wins' },
    { value: number(driver.recorded_results), label: 'Recorded Results' },
    { value: number(driver.recorded_top_3_finishes), label: 'Recorded Top-3 Finishes' },
    { value: number(trackChampionships), label: 'Track Championships' },
    { value: number(seriesChampionships), label: 'Series Championships' },
    { value: careerSpanDisplay, label: 'Recorded Career' },
  ]

  const broaderWinNote = totalDiscoveredWins > Number(driver.recorded_wins || 0)
    ? `${number(totalDiscoveredWins)} total discovered wins are documented when verified broader-career victories are included.`
    : null

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroUrl ? <img src={heroUrl} alt="" className={styles.heroImage} aria-hidden="true" /> : <div className={styles.heroFallback} />}
        <div className={styles.heroShade} />

        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span>
            <Link href="/drivers">Drivers</Link><span>›</span>
            <span>{driver.driver_name}</span>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.profileMedia}>
              {profilePhotoUrl ? (
                <PhotoLightboxImage
                  src={profilePhotoUrl}
                  alt={driver.driver_name}
                  caption={buildPhotoCaption(profilePhotoItem!)}
                  imageStyle={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div className={styles.profileFallback}>
                  <strong>{driverInitials(driver.driver_name)}</strong>
                  <span>Driver Archive</span>
                </div>
              )}
            </div>

            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>Upper Midwest Driver Archive</span>
              <h1>{driver.driver_name}</h1>
              <h2>{[driver.hometown, driver.state ? String(driver.state).trim() : null].filter(Boolean).join(', ') || 'Hometown not yet documented'}</h2>
              <p>
                Historical driver profile combining museum-recorded race results, feature wins,
                championships, photographs and verified broader-career accomplishments.
              </p>

              <div className={styles.heroActions}>
                <Link href={`/drivers/${slug}/results`} className={styles.primaryAction}>View Full Results →</Link>
                <a href="#photos" className={styles.secondaryAction}>Browse Photos</a>
              </div>

              {careerHighlights.length > 0 ? (
                <div className={styles.timeline}>
                  {careerHighlights.slice(0, 5).map((item, index) => (
                    <div key={`${item.year}-${item.text}-${index}`}>
                      <strong>{item.year}</strong>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.statsGrid}>
            {primaryStats.map((stat) => (
              <div className={styles.statCard} key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className={styles.profileNav} aria-label="Driver profile sections">
        <div>
          <a href="#overview" className={styles.activeNav}>Overview</a>
          <Link href={`/drivers/${slug}/results`}>Results</Link>
          <a href="#career">Career History</a>
          <a href="#photos">Photos</a>
        </div>
      </nav>

      <div className={styles.content}>
        <section className={styles.overviewSection} id="overview">
          <div className={styles.sectionHeading}>
            <div>
              <span>Career snapshot</span>
              <h2>Racing Lifetime Totals</h2>
            </div>
            <p>{broaderWinNote || 'Key museum-recorded and verified career indicators.'}</p>
          </div>

          <div className={styles.metricGrid}>
            <MetricCard label="Tracks Won At" value={String(tracksWonAt)} />
            <MetricCard label="Classes Won In" value={String(classesWonIn)} />
            <MetricCard label="Top Winning Class" value={mostSuccessfulClass} />
            <MetricCard label="Top Winning Track" value={mostSuccessfulTrack} logoSrc={mostSuccessfulTrackLogo} />
            <MetricCard label="Top Winning Series" value={mostSuccessfulSeries} logoSrc={mostSuccessfulSeriesLogo} />
            <MetricCard label="Last Feature Win" value={lastFeatureWinDate} />
          </div>
        </section>

        <section id="career" className={styles.careerWrap}>
          <DriverCareerAccomplishments slug={slug} />
        </section>

        <section className={styles.splitSection}>
          <div>
            <div className={styles.sectionHeading}>
              <div>
                <span>Latest archive activity</span>
                <h2>Recent Feature Results</h2>
              </div>
              <Link href={`/drivers/${slug}/results`}>View complete results →</Link>
            </div>
            <div className={styles.resultTable}>
              {safeRecentResults.length === 0 ? (
                <div className={styles.emptyState}>No recent feature results are available yet.</div>
              ) : safeRecentResults.map((result: any, index: number) => (
                <Link
                  href={result.track_slug ? `/tracks/${result.track_slug}` : '#'}
                  className={styles.resultRow}
                  key={`${result.race_date}-${result.track_slug}-${index}`}
                >
                  <span>{result.race_date ? formatRaceDate(result.race_date) : 'Date unknown'}</span>
                  <strong>{result.track_name || 'Track unknown'}</strong>
                  <span>{result.class_name || 'Division unknown'}</span>
                  <b>P{result.finishing_position}</b>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.sidePanels}>
            <RankPanel title="Feature Wins by Track" rows={safeTopTracks.map((track: any) => ({
              label: track.track_name,
              value: Number(track.wins || 0),
              href: track.track_slug ? `/tracks/${track.track_slug}` : undefined,
            }))} />
            <RankPanel title="Feature Wins by Class" rows={safeWinsByClass.map((row: any) => ({
              label: row.class_name || 'Unknown class',
              value: Number(row.wins || 0),
            }))} />
          </div>
        </section>

        <section className={styles.archiveGrid}>
          <div>
            <div className={styles.sectionHeading}>
              <div>
                <span>Season-by-season record</span>
                <h2>Results by Year</h2>
              </div>
            </div>
            <div className={styles.yearTable}>
              {flatResultsByYear.length === 0 ? (
                <div className={styles.emptyState}>No yearly result summary is available yet.</div>
              ) : flatResultsByYear.map((row: any) => (
                <div className={styles.yearRow} key={row.result_year}>
                  <strong>{row.result_year}</strong>
                  <span>{number(row.results_count)} Results</span>
                  <span>{number(row.wins)} Wins</span>
                  <span>{number(row.top_3s)} Top 3s</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={styles.sectionHeading}>
              <div>
                <span>Championship history</span>
                <h2>Track Championships</h2>
              </div>
            </div>
            <div className={styles.championshipList}>
              {safeChampionships.length === 0 ? (
                <div className={styles.emptyState}>No track championships are recorded yet.</div>
              ) : safeChampionships.map((ch: any, index: number) => (
                <Link
                  href={ch.track_slug ? `/tracks/${ch.track_slug}` : '#'}
                  key={`${ch.year}-${ch.track_slug}-${index}`}
                  className={styles.championshipRow}
                >
                  <strong>{ch.year}</strong>
                  <div>
                    <b>{ch.track_name}</b>
                    <span>{ch.class_name || 'Division not listed'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.photoSection} id="photos">
          <div className={styles.sectionHeading}>
            <div>
              <span>Museum photo collection</span>
              <h2>Photo Archive</h2>
            </div>
            <p>{displayPhotos.length.toLocaleString('en-US')} additional image{displayPhotos.length === 1 ? '' : 's'} connected to this driver</p>
          </div>

          {displayPhotos.length === 0 ? (
            <div className={styles.emptyState}>No additional photos are available yet.</div>
          ) : (
            <div className={styles.photoGrid}>
              {displayPhotos.map((photo) => {
                const trackLabel = formatTrackSlug(photo.track_slug)
                const yearLabel = photo.year && String(photo.year) !== 'unknown-year' ? String(photo.year) : 'Year Unknown'
                const creditLine = buildPhotoCreditLine(photo)
                return (
                  <article className={styles.photoCard} key={photo.photo_id}>
                    <PhotoLightboxImage
                      src={buildPhotoUrl(photo)}
                      alt={driver.driver_name}
                      caption={buildPhotoCaption(photo)}
                      imageStyle={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
                      showZoomBadge
                    />
                    <p>
                      <strong style={{ display: 'block', color: '#eee9df', fontSize: '0.67rem', lineHeight: 1.35 }}>
                        {[yearLabel, trackLabel].filter(Boolean).join(' • ')}
                      </strong>
                      <span style={{ display: 'block', marginTop: '4px', color: '#8e9599', fontSize: '0.58rem', lineHeight: 1.4 }}>
                        {creditLine}
                      </span>
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className={styles.researchGrid}>
          <Link href={`/drivers/${slug}/results`} className={styles.researchCard}>
            <span>01</span>
            <div><strong>Complete Results</strong><p>Open the full race-by-race archive for {driver.driver_name}.</p><b>Browse Results →</b></div>
          </Link>
          <Link href="/drivers" className={styles.researchCard}>
            <span>02</span>
            <div><strong>Driver Directory</strong><p>Return to the complete museum driver index.</p><b>Browse Drivers →</b></div>
          </Link>
          <Link href="/stats/feature-winners" className={styles.researchCard}>
            <span>03</span>
            <div><strong>Research Center</strong><p>Compare feature winners, championships and archive statistics.</p><b>Open Research Center →</b></div>
          </Link>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ label, value, logoSrc }: { label: string; value: string; logoSrc?: string }) {
  return (
    <div className={styles.metricCard}>
      {logoSrc ? <img src={logoSrc} alt="" /> : null}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function RankPanel({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; value: number; href?: string }>
}) {
  return (
    <div className={styles.rankPanel}>
      <h3>{title}</h3>
      {rows.length === 0 ? <div className={styles.emptyState}>No data recorded yet.</div> : rows.map((row, index) => {
        const content = (
          <>
            <span><small>{String(index + 1).padStart(2, '0')}</small>{row.label}</span>
            <strong>{number(row.value)}</strong>
          </>
        )
        return row.href ? (
          <Link href={row.href} className={styles.rankRow} key={`${row.label}-${index}`}>{content}</Link>
        ) : (
          <div className={styles.rankRow} key={`${row.label}-${index}`}>{content}</div>
        )
      })}
    </div>
  )
}

function buildPhotoCaption(photo: Photo) {
  const trackLabel = formatTrackSlug(photo.track_slug)
  const creditLine = buildPhotoCreditLine(photo)
  return [
    trackLabel,
    photo.year && String(photo.year) !== 'unknown-year' ? photo.year : 'Year Unknown',
    creditLine !== 'Museum archive photo' ? creditLine : null,
  ].filter(Boolean).join(' • ')
}

function buildPhotoCreditLine(photo: Photo) {
  const photographer = photo.photographer_slug && photo.photographer_slug !== 'unknown'
    ? formatName(photo.photographer_slug)
    : null
  const creditType = photo.credit_type && photo.credit_type !== 'unknown'
    ? formatCreditType(photo.credit_type)
    : null
  if (!photographer && !creditType) return 'Museum archive photo'
  if (photographer) return `${photographer}${creditType && creditType !== 'Photo' ? ` ${creditType}` : ''}`
  return creditType || 'Museum archive photo'
}

function normalizedPhotoYear(year: Photo['year']) {
  if (year === null || year === undefined) return Number.MAX_SAFE_INTEGER
  const value = String(year).trim().toLowerCase()
  if (!value || value === 'unknown-year' || value === 'unknown') return Number.MAX_SAFE_INTEGER
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function formatRaceDate(dateString: string) {
  const [year, month, day] = String(dateString).split('-').map(Number)
  if (!year || !month || !day) return dateString
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTrackSlug(trackSlug: string | null | undefined) {
  if (!trackSlug || ['unknown', 'unknown-track'].includes(trackSlug)) return null
  return trackSlug
    .replace(/-(wi|il|mn|mi)$/i, '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatName(name: string | null) {
  if (!name) return 'Unknown'
  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatCreditType(type: string | null) {
  if (!type || type.toLowerCase() === 'unknown') return 'Photo'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function driverInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'DR'
  return `${parts[0]?.[0] || ''}${parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''}`.toUpperCase()
}
