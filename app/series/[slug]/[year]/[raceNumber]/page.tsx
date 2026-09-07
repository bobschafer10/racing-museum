import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SeriesLogo from '../../SeriesLogo'
import TrackLogo from '../../../../tracks/[slug]/TrackLogo'
import styles from './eventPage.module.css'

export const revalidate = 300

type PhotoRow = {
  file_name?: string | null
  track_slug?: string | null
  year?: string | number | null
}

export default async function SeriesEventPage({
  params,
}: {
  params: Promise<{ slug: string; year: string; raceNumber: string }>
}) {
  const { slug, year, raceNumber } = await params
  const seasonYear = Number(year)
  const raceNo = Number(raceNumber)

  const { data: series } = await supabase
    .from('Series')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!series || Number.isNaN(seasonYear) || Number.isNaN(raceNo)) notFound()

  const { data: season } = await supabase
    .from('SeriesSeasons')
    .select('*')
    .eq('series_id', series.id)
    .eq('year', seasonYear)
    .maybeSingle()

  if (!season) notFound()

  const { data: event } = await supabase
    .from('SeriesEvents')
    .select('*')
    .eq('season_id', season.id)
    .eq('race_number', raceNo)
    .maybeSingle()

  if (!event) notFound()

  const [{ data: results }, { data: mediaLinks }, { data: seasonEvents }] = await Promise.all([
    supabase
      .from('SeriesEventResults')
      .select('*')
      .eq('series_event_id', event.id)
      .order('result_section', { ascending: true })
      .order('finishing_position', { ascending: true }),
    supabase
      .from('SeriesEventMediaLinks')
      .select('media_id, relationship_type, display_order, is_featured')
      .eq('series_event_id', event.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('SeriesEvents')
      .select('id, race_number, race_date, track_name')
      .eq('season_id', season.id)
      .order('race_number', { ascending: true }),
  ])

  const mediaIds = Array.from(
    new Set((mediaLinks || []).map((link: any) => Number(link.media_id)).filter(Number.isFinite)),
  )

  let mediaAssets: any[] = []
  if (mediaIds.length > 0) {
    const { data } = await supabase
      .from('SeriesEventMedia')
      .select('*')
      .in('id', mediaIds)
    mediaAssets = data || []
  }

  const mediaById = new Map(mediaAssets.map((media: any) => [Number(media.id), media]))
  const eventMedia = (mediaLinks || [])
    .map((link: any) => {
      const media = mediaById.get(Number(link.media_id))
      return media ? { ...media, ...link } : null
    })
    .filter(Boolean)

  const coverageGroupMap = new Map<string, any>()
  eventMedia.forEach((media: any) => {
    const publication = media.publication_name || media.publication_code?.toUpperCase() || 'Archival Source'
    const issueDate = media.issue_date || ''
    const key = `${publication}::${issueDate}`
    if (!coverageGroupMap.has(key)) {
      coverageGroupMap.set(key, {
        publication,
        publicationCode: media.publication_code || '',
        issueDate,
        pages: [],
      })
    }
    coverageGroupMap.get(key).pages.push(media)
  })

  const coverageGroups = Array.from(coverageGroupMap.values()).map((group: any) => ({
    ...group,
    pages: group.pages.sort((a: any, b: any) => Number(a.page_number ?? 9999) - Number(b.page_number ?? 9999)),
  }))

  const resultRows = results || []
  const resultDriverIds = Array.from(
    new Set(
      resultRows
        .map((row: any) => Number(row.driver_id))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    ),
  )

  const { data: resultDrivers } = resultDriverIds.length
    ? await supabase
        .from('Drivers')
        .select('driver_id, slug')
        .in('driver_id', resultDriverIds)
    : { data: [] }

  const driverSlugById = new Map(
    (resultDrivers || []).map((driver: any) => [Number(driver.driver_id), driver.slug]),
  )

  let canonicalTrack: any = null
  if (event.track_id) {
    const { data } = await supabase
      .from('Tracks')
      .select('id, track_id, track_name, slug')
      .eq('track_id', event.track_id)
      .maybeSingle()
    canonicalTrack = data

    if (!canonicalTrack) {
      const { data: byId } = await supabase
        .from('Tracks')
        .select('id, track_id, track_name, slug')
        .eq('id', event.track_id)
        .maybeSingle()
      canonicalTrack = byId
    }
  }

  if (!canonicalTrack && event.track_name) {
    const { data } = await supabase
      .from('Tracks')
      .select('id, track_id, track_name, slug')
      .eq('track_name', event.track_name)
      .maybeSingle()
    canonicalTrack = data
  }

  const trackSlug = canonicalTrack?.slug || event.track_slug || slugify(event.track_name)
  const trackName = event.track_name || canonicalTrack?.track_name || 'Track TBD'

  let heroPhoto = ''
  if (trackSlug) {
    const trackSlugs = Array.from(new Set([trackSlug, baseTrackSlug(trackSlug), event.track_slug].filter(Boolean)))
    const { data: exactPhotos } = await supabase
      .from('photos')
      .select('file_name, track_slug, year, sequence, needs_review')
      .in('track_slug', trackSlugs)
      .eq('year', String(seasonYear))
      .eq('needs_review', false)
      .order('sequence', { ascending: true, nullsFirst: false })
      .limit(1)

    let selectedPhoto = (exactPhotos || [])[0] as PhotoRow | undefined
    if (!selectedPhoto) {
      const { data: fallbackPhotos } = await supabase
        .from('photos')
        .select('file_name, track_slug, year, sequence, needs_review')
        .in('track_slug', trackSlugs)
        .eq('needs_review', false)
        .order('year', { ascending: false, nullsFirst: false })
        .order('sequence', { ascending: true, nullsFirst: false })
        .limit(1)
      selectedPhoto = (fallbackPhotos || [])[0] as PhotoRow | undefined
    }
    heroPhoto = photoUrl(selectedPhoto)
  }

  const featureResults = resultRows.filter((row: any) => row.result_section !== 'DNQ')
  const dnqResults = resultRows.filter((row: any) => row.result_section === 'DNQ')
  const hasDnqs = dnqResults.length > 0
  const winnerResult = featureResults.find((row: any) => Number(row.finishing_position) === 1) || featureResults[0]
  const raceDistance = winnerResult?.laps || '—'

  const orderedSeasonEvents = seasonEvents || []
  const currentIndex = orderedSeasonEvents.findIndex((row: any) => Number(row.race_number) === raceNo)
  const previousEvent = currentIndex > 0 ? orderedSeasonEvents[currentIndex - 1] : null
  const nextEvent = currentIndex >= 0 && currentIndex < orderedSeasonEvents.length - 1 ? orderedSeasonEvents[currentIndex + 1] : null

  return (
    <main className={styles.page}>
      <section className={styles.heroSection}>
        {heroPhoto ? <img src={heroPhoto} alt={`Racing at ${trackName}`} className={styles.heroImage} /> : <div className={styles.heroFallback} />}
        <div className={styles.heroShade} />

        <div className={styles.heroInner}>
          <div className={styles.breadcrumbRow}>
            <Link href="/" className={styles.breadcrumbLink}>Home</Link><span className={styles.breadcrumbSep}>›</span>
            <Link href="/series" className={styles.breadcrumbLink}>Series</Link><span className={styles.breadcrumbSep}>›</span>
            <Link href={`/series/${slug}`} className={styles.breadcrumbLink}>{series.series_name}</Link><span className={styles.breadcrumbSep}>›</span>
            <Link href={`/series/${slug}/${seasonYear}`} className={styles.breadcrumbLink}>{seasonYear}</Link><span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbCurrent}>Race #{raceNo}</span>
          </div>

          <div className={styles.heroTopRow}>
            <div className={styles.heroTextBlock}>
              <div className={styles.eyebrow}>Series Event Archive</div>
              <h1 className={styles.pageTitle}>Race #{raceNo} — {trackName}</h1>
              <p className={styles.metaLine}>{formatDate(event.race_date)}{event.winner_name ? ` • Winner: ${event.winner_name}` : ''}</p>
              <p className={styles.heroDescription}>
                Full-field race results and preserved archive material from the {seasonYear} {series.series_name} event at {trackName}.
              </p>
              <Link href={`/series/${slug}/${seasonYear}`} className={styles.backButton}>Back to {seasonYear} Season</Link>
            </div>

            <div className={styles.heroLogoRow}>
              {trackSlug && (
                <Link href={`/tracks/${trackSlug}`} className={styles.heroTrackLogoLink}>
                  <TrackLogo slug={trackSlug} trackName={trackName} />
                </Link>
              )}
              <div className={styles.heroLogoCard}>
                <SeriesLogo slug={series.slug} seriesName={series.series_name} />
              </div>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <Stat value={`#${raceNo}`} label="Season Race" />
            <Stat value={String(featureResults.length)} label="Feature Starters" />
            <Stat value={raceDistance === '—' ? '—' : `${raceDistance}`} label="Winner Laps" />
            <Stat value={event.winner_name || 'TBD'} label="Feature Winner" />
            <Stat value={winnerResult?.car_number || '—'} label="Winning Car" />
          </div>
        </div>
      </section>

      <nav className={styles.profileNav} aria-label="Event archive navigation">
        <div className={styles.navInner}>
          <a href="#results">Results</a>
          {coverageGroups.length > 0 && <a href="#coverage">Event Coverage</a>}
          <a href="#sources">Sources</a>
          <Link href={`/series/${slug}/${seasonYear}`}>Season Archive</Link>
          {trackSlug && <Link href={`/tracks/${trackSlug}`}>Track Archive</Link>}
        </div>
      </nav>

      <section className={styles.contentWrap}>
        <div className={styles.raceNavigator}>
          {previousEvent ? (
            <Link href={`/series/${slug}/${seasonYear}/${previousEvent.race_number}`}>
              <small>← Previous Race</small><strong>#{previousEvent.race_number} — {previousEvent.track_name}</strong>
            </Link>
          ) : <div className={styles.navPlaceholder} />}
          <Link href={`/series/${slug}/${seasonYear}`}>
            <small>{seasonYear} Season</small><strong>View full season archive</strong>
          </Link>
          {nextEvent ? (
            <Link href={`/series/${slug}/${seasonYear}/${nextEvent.race_number}`}>
              <small>Next Race →</small><strong>#{nextEvent.race_number} — {nextEvent.track_name}</strong>
            </Link>
          ) : <div className={styles.navPlaceholder} />}
        </div>

        <Panel id="results" title="Feature Results">
          <div className={hasDnqs ? styles.resultsLayout : styles.resultsLayoutFullWidth}>
            <div className={styles.featureTable}>
              {featureResults.length > 0 ? (
                <div>
                  <div className={styles.featureHeader}>
                    <span>Fin</span><span>Start</span><span>No.</span><span>Driver</span><span>Make</span><span>Laps</span><span>Status</span>
                  </div>
                  {featureResults.map((row: any) => {
                    const driverSlug = driverSlugById.get(Number(row.driver_id)) || row.driver_slug || slugify(row.driver_name)
                    const position = Number(row.finishing_position)
                    const rowClass = position === 1
                      ? `${styles.featureRow} ${styles.winnerRow}`
                      : position > 1 && position <= 3
                        ? `${styles.featureRow} ${styles.podiumRow}`
                        : styles.featureRow
                    return (
                      <div key={row.id} className={rowClass}>
                        <span className={styles.finishPos}>{row.finishing_position || '—'}</span>
                        <span>{row.starting_position || '—'}</span>
                        <span className={styles.carNumber}>{row.car_number || '—'}</span>
                        <Link href={`/drivers/${driverSlug}`} className={styles.driverLink}>{row.driver_name || 'Unknown driver'}</Link>
                        <span>{row.make || '—'}</span>
                        <span>{row.laps || '—'}</span>
                        <span>{row.status || (position === 1 ? 'Winner' : '—')}</span>
                      </div>
                    )
                  })}
                </div>
              ) : <p className={styles.panelText}>Full rundown has not been added yet for this series event.</p>}
            </div>

            {hasDnqs && (
              <aside className={styles.dnqBox}>
                <h3 className={styles.dnqTitle}>Did Not Qualify</h3>
                {dnqResults.map((row: any) => {
                  const driverSlug = driverSlugById.get(Number(row.driver_id)) || row.driver_slug || slugify(row.driver_name)
                  return (
                    <div key={row.id} className={styles.dnqInlineRow}>
                      <span className={styles.dnqTag}>DNQ</span>
                      <span className={styles.carNumber}>{row.car_number || '—'}</span>
                      <Link href={`/drivers/${driverSlug}`} className={styles.driverLink}>{row.driver_name || 'Unknown driver'}</Link>
                    </div>
                  )
                })}
              </aside>
            )}
          </div>
        </Panel>

        {coverageGroups.length > 0 && (
          <Panel id="coverage" title="Event Coverage">
            <div className={styles.coverageIntro}>
              <span className={styles.coverageKicker}>From the Museum Archive</span>
              <span>Original contemporary race coverage. Select any newspaper page to open the full-size scan.</span>
            </div>
            <div className={styles.coverageGroups}>
              {coverageGroups.map((group: any) => (
                <section key={`${group.publication}-${group.issueDate}`} className={styles.publicationGroup}>
                  <header className={styles.publicationHeader}>
                    <div className={styles.publicationCode}>{group.publicationCode ? group.publicationCode.toUpperCase() : 'ARCHIVE'}</div>
                    <h3 className={styles.publicationTitle}>{group.publication}</h3>
                    <div className={styles.publicationDate}>{group.issueDate ? formatDate(group.issueDate) : 'Issue date unknown'}</div>
                    <div className={styles.publicationCount}>{group.pages.length} {group.pages.length === 1 ? 'page' : 'pages'} preserved</div>
                  </header>
                  <div className={styles.publicationPages}>
                    {group.pages.map((media: any) => {
                      const mediaPath = media.public_path || media.storage_path
                      if (!mediaPath) return null
                      const pageLabel = media.page_number ? `Page ${media.page_number}` : 'Page'
                      const alt = media.headline || `${group.publication} ${pageLabel}`
                      return (
                        <a key={`${media.id}-${media.series_event_id}`} href={mediaPath} target="_blank" rel="noreferrer" className={styles.pageTile} title={`Open ${group.publication} ${pageLabel}`}>
                          <div className={styles.pageImageFrame}>
                            <img src={mediaPath} alt={alt} className={styles.pageImage} />
                            <span className={styles.pageBadge}>{pageLabel}</span>
                          </div>
                          {media.headline && <div className={styles.pageHeadline}>{media.headline}</div>}
                        </a>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </Panel>
        )}

        <Panel id="sources" title="Source Attribution">
          <div className={styles.sourcePanel}>
            <p className={styles.panelText}>{series.attribution_text || 'Historical series data is being compiled from archival sources and museum research.'}</p>
            {event.source_url && <p className={styles.panelText}>Source: <a href={event.source_url} className={styles.inlineLink}>The Third Turn event page</a></p>}
          </div>
        </Panel>

        <div className={styles.footerLinks}>
          <Link href={`/series/${slug}/${seasonYear}`}><strong>{seasonYear} Season</strong><span>Return to season archive →</span></Link>
          <Link href={`/series/${slug}`}><strong>Series Overview</strong><span>Open full series history →</span></Link>
          {trackSlug ? <Link href={`/tracks/${trackSlug}`}><strong>{trackName}</strong><span>Open track archive →</span></Link> : <Link href="/tracks"><strong>Track Directory</strong><span>Browse track archives →</span></Link>}
        </div>
      </section>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className={styles.statCard}><strong>{value}</strong><span>{label}</span></div>
}

function Panel({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className={styles.panel}>
      <div className={styles.panelHeader}>{title}</div>
      <div className={styles.panelBody}>{children}</div>
    </div>
  )
}

function photoUrl(photo?: PhotoRow) {
  if (!photo?.file_name || !photo.track_slug) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return ''
  const photoYear = String(photo.year || 'unknown-year')
  return `${baseUrl}/storage/v1/object/public/media/photos/master/${photo.track_slug}/${photoYear}/${encodeURIComponent(photo.file_name)}`
}

function baseTrackSlug(value: string) {
  return value.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks|ky|sc|sd|ont)$/i, '')
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBD'
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function slugify(value?: string | null) {
  if (!value) return ''
  return value.toLowerCase().replace(/,/g, '').replace(/\./g, '').replace(/\s+/g, '-')
}
