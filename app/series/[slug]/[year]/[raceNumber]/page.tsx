import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Buffer } from 'node:buffer'
import { supabase } from '@/lib/supabase'
import styles from './eventPage.module.css'

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

  const { data: results } = await supabase
    .from('SeriesEventResults')
    .select('*')
    .eq('series_event_id', event.id)
    .order('result_section', { ascending: true })
    .order('finishing_position', { ascending: true })

  const resultDriverIds = Array.from(
    new Set(
      (results || [])
        .map((row: any) => Number(row.driver_id))
        .filter((id: number) => Number.isFinite(id))
    )
  )

  let resultDrivers: any[] = []
  if (resultDriverIds.length > 0) {
    const { data } = await supabase
      .from('Drivers')
      .select('driver_id, slug')
      .in('driver_id', resultDriverIds)
    resultDrivers = data || []
  }

  const driverSlugById = new Map(
    resultDrivers.map((driver: any) => [Number(driver.driver_id), driver.slug])
  )

  let trackSlug = event.track_name ? slugify(event.track_name) : ''
  if (event.track_id) {
    const { data: track } = await supabase
      .from('Tracks')
      .select('slug')
      .eq('track_id', event.track_id)
      .maybeSingle()

    if (track?.slug) trackSlug = track.slug
  }

  const trackLogoSrc = trackSlug ? await getTrackLogoDataUrl(trackSlug) : null

  const featureResults = results?.filter((row: any) => row.result_section !== 'DNQ') ?? []
  const dnqResults = results?.filter((row: any) => row.result_section === 'DNQ') ?? []
  const hasDnqs = dnqResults.length > 0

  return (
    <main className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbRow}>
            <Link href="/" className={styles.breadcrumbLink}>Home</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link href="/series" className={styles.breadcrumbLink}>Series</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link href={`/series/${slug}`} className={styles.breadcrumbLink}>{series.series_name}</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link href={`/series/${slug}/${seasonYear}`} className={styles.breadcrumbLink}>{seasonYear}</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Race #{raceNo}</span>
          </div>

          <div className={styles.heroTopRow}>
            <div className={styles.heroTextBlock}>
              <div className={styles.eyebrow}>Series Event</div>
              <h1 className={styles.pageTitle}>Race #{raceNo} — {event.track_name}</h1>
              <p className={styles.metaLine}>
                {formatDate(event.race_date)}
                {event.winner_name ? ` • Winner: ${event.winner_name}` : ''}
              </p>
              <Link href={`/series/${slug}/${seasonYear}`} className={styles.backButton}>
                Back to {seasonYear} Season
              </Link>
            </div>

            <div className={styles.heroLogoRow}>
              {event.track_name && trackSlug && trackLogoSrc && (
                <Link href={`/tracks/${trackSlug}`} className={styles.heroTrackLogoLink}>
                  <img src={trackLogoSrc} alt={`${event.track_name} logo`} className={styles.heroTrackLogo} />
                </Link>
              )}
              <img
                src={`/logos/series/${series.slug}.jpg`}
                alt={`${series.series_name} logo`}
                className={styles.heroSeriesLogo}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.contentWrap}>
        <Panel title="Feature Results">
          <div className={hasDnqs ? styles.resultsLayout : styles.resultsLayoutFullWidth}>
            <div>
              {featureResults.length > 0 ? (
                <div>
                  <div className={styles.featureHeader}>
                    <span>Fin</span><span>#</span><span>Driver</span>
                  </div>
                  {featureResults.map((row: any) => {
                    const driverSlug = driverSlugById.get(Number(row.driver_id)) || slugify(row.driver_name)
                    return (
                      <div key={row.id} className={styles.featureRow}>
                        <span>{row.finishing_position || ''}</span>
                        <span>{row.car_number || ''}</span>
                        <Link href={`/drivers/${driverSlug}`} className={styles.driverLink}>
                          {row.driver_name || ''}
                        </Link>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className={styles.panelText}>Full rundown has not been added yet for this series event.</p>
              )}
            </div>

            {hasDnqs && (
              <aside className={styles.dnqBox}>
                <h3 className={styles.dnqTitle}>Did Not Qualify</h3>
                <div>
                  {dnqResults.map((row: any) => {
                    const driverSlug = driverSlugById.get(Number(row.driver_id)) || slugify(row.driver_name)
                    return (
                      <div key={row.id} className={styles.dnqInlineRow}>
                        <span className={styles.dnqTag}>DNQ</span>
                        <Link href={`/drivers/${driverSlug}`} className={styles.driverLink}>
                          {row.driver_name || ''}
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </aside>
            )}
          </div>
        </Panel>

        <Panel title="Source Attribution">
          <p className={styles.panelText}>
            {series.attribution_text || 'Historical series data is being compiled from archival sources and museum research.'}
          </p>
          {event.source_url && (
            <p className={styles.panelText}>
              Source:{' '}
              <a href={event.source_url} className={styles.inlineLink}>The Third Turn event page</a>
            </p>
          )}
        </Panel>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>{title}</div>
      <div className={styles.panelBody}>{children}</div>
    </div>
  )
}

async function getTrackLogoDataUrl(trackSlug: string) {
  const extensions = ['jpg', 'png']
  for (const ext of extensions) {
    try {
      const url = `https://raw.githubusercontent.com/bobschafer10/racing-museum/main/public/logos/tracks/${trackSlug}.${ext}`
      const response = await fetch(url, { next: { revalidate: 86400 } })
      if (!response.ok) continue
      const mime = response.headers.get('content-type') || (ext === 'png' ? 'image/png' : 'image/jpeg')
      const bytes = Buffer.from(await response.arrayBuffer())
      return `data:${mime};base64,${bytes.toString('base64')}`
    } catch {
      // Try the next extension.
    }
  }
  return null
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
