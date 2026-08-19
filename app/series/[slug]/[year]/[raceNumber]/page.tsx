import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

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

  if (!series || Number.isNaN(seasonYear) || Number.isNaN(raceNo)) {
    notFound()
  }

  const { data: season } = await supabase
    .from('SeriesSeasons')
    .select('*')
    .eq('series_id', series.id)
    .eq('year', seasonYear)
    .maybeSingle()

  if (!season) {
    notFound()
  }

  const { data: event } = await supabase
    .from('SeriesEvents')
    .select('*')
    .eq('season_id', season.id)
    .eq('race_number', raceNo)
    .maybeSingle()

  if (!event) {
    notFound()
  }

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

    if (track?.slug) {
      trackSlug = track.slug
    }
  }

  const featureResults =
    results?.filter((row: any) => row.result_section !== 'DNQ') ?? []

  const dnqResults =
    results?.filter((row: any) => row.result_section === 'DNQ') ?? []

  const hasDnqs = dnqResults.length > 0

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/series" style={breadcrumbLink}>Series</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href={`/series/${slug}`} style={breadcrumbLink}>{series.series_name}</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href={`/series/${slug}/${seasonYear}`} style={breadcrumbLink}>{seasonYear}</Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>Race #{raceNo}</span>
          </div>

          <div style={heroTopRow}>
            <div style={heroTextBlock}>
              <div style={eyebrow}>Series Event</div>

              <h1 style={pageTitle}>
                Race #{raceNo} — {event.track_name}
              </h1>

              <p style={metaLine}>
                {formatDate(event.race_date)}
                {event.winner_name ? ` • Winner: ${event.winner_name}` : ''}
              </p>

              <Link href={`/series/${slug}/${seasonYear}`} style={backButton}>
                Back to {seasonYear} Season
              </Link>
            </div>

            <div style={heroLogoRow}>
              {event.track_name && trackSlug && (
                <Link href={`/tracks/${trackSlug}`} style={heroTrackLogoLink}>
                  <img
                    src={`/logos/tracks/${trackSlug}.jpg`}
                    alt={`${event.track_name} logo`}
                    style={heroTrackLogo}
                  />
                </Link>
              )}

              <img
                src={`/logos/series/${series.slug}.jpg`}
                alt={`${series.series_name} logo`}
                style={heroSeriesLogo}
              />
            </div>
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <Panel title="Feature Results">
          <div style={hasDnqs ? resultsLayout : resultsLayoutFullWidth}>
            <div>
              {featureResults.length > 0 ? (
                <div>
                  <div style={featureHeader}>
                    <span>Fin</span>
                    <span>#</span>
                    <span>Driver</span>
                  </div>

                  {featureResults.map((row: any) => {
                    const driverSlug =
                      driverSlugById.get(Number(row.driver_id)) || slugify(row.driver_name)

                    return (
                      <div key={row.id} style={featureRow}>
                        <span>{row.finishing_position || ''}</span>
                        <span>{row.car_number || ''}</span>
                        <Link href={`/drivers/${driverSlug}`} style={driverLink}>
                          {row.driver_name || ''}
                        </Link>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={panelText}>
                  Full rundown has not been added yet for this series event.
                </p>
              )}
            </div>

            {hasDnqs && (
              <aside style={dnqBox}>
                <h3 style={dnqTitle}>Did Not Qualify</h3>
                <div>
                  {dnqResults.map((row: any) => {
                    const driverSlug =
                      driverSlugById.get(Number(row.driver_id)) || slugify(row.driver_name)

                    return (
                      <div key={row.id} style={dnqInlineRow}>
                        <span style={dnqTag}>DNQ</span>
                        <Link href={`/drivers/${driverSlug}`} style={driverLink}>
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
          <p style={panelText}>
            {series.attribution_text ||
              'Historical series data is being compiled from archival sources and museum research.'}
          </p>
          {event.source_url && (
            <p style={panelText}>
              Source:{' '}
              <a href={event.source_url} style={inlineLink}>
                The Third Turn event page
              </a>
            </p>
          )}
        </Panel>
      </section>
    </main>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={panel}>
      <div style={panelHeader}>{title}</div>
      <div style={panelBody}>{children}</div>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBD'

  const date = new Date(`${value}T00:00:00`)

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function slugify(value?: string | null) {
  if (!value) return ''

  return value
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
}

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  color: '#2f2417',
  minHeight: '100vh',
  fontFamily: 'Georgia, serif',
}

const driverLink: CSSProperties = {
  color: '#2f2417',
  textDecoration: 'none',
  fontWeight: 700,
}

const heroSection: CSSProperties = {
  background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const heroInner: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 30px',
}

const breadcrumbRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  fontSize: '15px',
  marginBottom: '22px',
  color: '#6b4a22',
}

const breadcrumbLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
}

const breadcrumbSep: CSSProperties = {
  color: '#8d7049',
}

const breadcrumbCurrent: CSSProperties = {
  color: '#4b351d',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const pageTitle: CSSProperties = {
  fontSize: '48px',
  margin: '0 0 10px',
  color: '#3d2b16',
  lineHeight: 1.05,
}

const metaLine: CSSProperties = {
  fontSize: '22px',
  margin: '0 0 18px',
  color: '#5a3a1b',
}

const backButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '12px 18px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
}

const contentWrap: CSSProperties = {
  maxWidth: '1300px',
  margin: '0 auto',
  padding: '28px 20px 40px',
  display: 'grid',
  gap: '20px',
}

const panel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px',
}

const panelHeader: CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginBottom: '10px',
}

const panelBody: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
  overflowX: 'auto',
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: '0 0 10px',
}

const inlineLink: CSSProperties = {
  color: '#7a5827',
  fontWeight: 700,
}

const resultsLayout: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.35fr 1fr',
  gap: '22px',
  alignItems: 'start',
  minWidth: '760px',
}

const resultsLayoutFullWidth: CSSProperties = {
  display: 'block',
  width: '100%',
}

const featureHeader: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '55px 70px 1fr',
  gap: '10px',
  padding: '10px 0',
  borderBottom: '2px solid #b29364',
  fontWeight: 700,
  color: '#5b3a1b',
}

const featureRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '55px 70px 1fr',
  gap: '10px',
  padding: '9px 0',
  borderBottom: '1px solid #ccb48a',
  alignItems: 'center',
}

const dnqBox: CSSProperties = {
  borderLeft: '1px solid #ccb48a',
  paddingLeft: '18px',
}

const dnqTitle: CSSProperties = {
  fontSize: '26px',
  color: '#5b3a1b',
  margin: '0 0 8px',
}

const dnqInlineRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '70px 1fr',
  gap: '10px',
  padding: '9px 0',
  borderBottom: '1px solid #ccb48a',
  alignItems: 'center',
}

const dnqTag: CSSProperties = {
  fontWeight: 700,
  color: '#5b3a1b',
}

const heroTopRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '40px',
}

const heroTextBlock: CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const heroLogoRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
}

const heroTrackLogoLink: CSSProperties = {
  display: 'block',
  textDecoration: 'none',
}

const heroTrackLogo: CSSProperties = {
  width: '170px',
  maxHeight: '100px',
  objectFit: 'contain',
}

const heroSeriesLogo: CSSProperties = {
  width: '170px',
  maxHeight: '100px',
  objectFit: 'contain',
}
