import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export default async function SeriesSeasonPage({
  params,
}: {
  params: Promise<{ slug: string; year: string }>
}) {
  const { slug, year } = await params
  const seasonYear = Number(year)

  const { data: series } = await supabase
    .from('Series')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!series || Number.isNaN(seasonYear)) {
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

  const { data: events } = await supabase
    .from('SeriesEvents')
    .select('*')
    .eq('season_id', season.id)
    .order('race_number', { ascending: true })

  const { data: standings } = await supabase
    .from('SeriesStandings')
    .select('*')
    .eq('season_id', season.id)
    .order('finishing_position', { ascending: true })

const associatedTracks = Array.from(
  new Map(
    (events || [])
      .filter((event: any) => event.track_name)
      .map((event: any) => [event.track_name, event])
  ).values()
)

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
            <span style={breadcrumbCurrent}>{seasonYear}</span>
          </div>

<div style={heroTopRow}>
  <div style={heroTextBlock}>
    <div style={eyebrow}>Series Season</div>
    <h1 style={pageTitle}>{seasonYear} {series.series_name}</h1>

    <p style={metaLine}>
      Champion: {season.champion_name || 'TBD'}
      {season.races ? ` • ${season.races} races` : ''}
      {season.margin ? ` • Margin: ${season.margin}` : ''}
    </p>

    <Link href={`/series/${slug}`} style={backButton}>
      Back to Series Profile
    </Link>
  </div>

  <img
    src={`/logos/series/${series.slug}.jpg`}
    alt={`${series.series_name} logo`}
    style={seasonSeriesLogo}
  />
</div>

          
        </div>
      </section>

      <section style={contentWrap}>
        <div style={mainGrid}>
          <Panel title="Race Schedule">
            {events && events.length > 0 ? (
              <div>
                {events.map((event: any) => (
                  <Link
  key={event.id}
  href={`/series/${slug}/${seasonYear}/${event.race_number}`}
  style={scheduleRow}
>
                    <span style={raceNumber}>#{event.race_number}</span>
                    <span>{formatDate(event.race_date)}</span>
                    <span>{event.track_name}</span>
                    <strong>{event.winner_name || 'Winner TBD'}</strong>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={panelText}>No race schedule has been added yet.</p>
            )}
          </Panel>

          <Panel title="Final Point Standings">
            {standings && standings.length > 0 ? (
              <div>
                {standings.map((row: any) => (
                  <div key={row.id} style={standingsRow}>
                    <span style={raceNumber}>{row.finishing_position}</span>
                    <Link
  href={`/drivers/${slugify(row.driver_name)}`}
  style={driverLink}
>
  {row.driver_name}
</Link>
                    <span style={pointsText}>{row.points || ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={panelText}>No standings have been added yet.</p>
            )}
          </Panel>
        </div>

<Panel title="Associated Tracks">
  <div style={trackLogoGrid}>
    {associatedTracks.map((track: any) => (
      <Link
        key={track.track_name}
        href={`/tracks/${slugify(track.track_name)}-wi`}
        style={trackTile}
      >
        <img
          src={`/logos/tracks/${slugify(track.track_name)}-wi.jpg`}
          alt={`${track.track_name} logo`}
          style={trackLogo}
        />

        <div style={trackTileName}>
          {track.track_name}
        </div>
      </Link>
    ))}
  </div>
</Panel>

        <Panel title="Source Attribution">
          <p style={panelText}>
            {series.attribution_text ||
              'Historical series data is being compiled from archival sources and museum research.'}
          </p>
          {season.source_url && (
            <p style={panelText}>
              Source:{' '}
              <a href={season.source_url} style={inlineLink}>
                The Third Turn season page
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

function slugify(value?: string | null) {
  if (!value) return ''

  return value
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
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

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  color: '#2f2417',
  minHeight: '100vh',
  fontFamily: 'Georgia, serif',
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
  fontSize: '52px',
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
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 40px',
  display: 'grid',
  gap: '20px',
}

const mainGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
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
}

const scheduleRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '60px 170px 1fr 1fr',
  gap: '12px',
  padding: '10px 0',
  borderBottom: '1px solid #ccb48a',
  alignItems: 'center',
textDecoration: 'none',
color: '#2f2417',
}

const standingsRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '60px 1fr 100px',
  gap: '12px',
  padding: '10px 0',
  borderBottom: '1px solid #ccb48a',
  alignItems: 'center',
}

const raceNumber: CSSProperties = {
  fontWeight: 700,
  color: '#5b3a1b',
}

const pointsText: CSSProperties = {
  textAlign: 'right',
  fontWeight: 700,
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: '0 0 10px',
}

const seasonYearStyle: CSSProperties = {
  fontWeight: 700,
  color: '#5b3a1b',
  fontSize: '22px',
}

const driverLink: CSSProperties = {
  color: '#2f2417',
  textDecoration: 'none',
  fontWeight: 700,
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

const seasonSeriesLogo: CSSProperties = {
  width: '220px',
  maxHeight: '140px',
  objectFit: 'contain',
  flexShrink: 0,
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '10px',
}

const trackLogoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
}

const trackTile: CSSProperties = {
  background: '#eadfc7',
  border: '1px solid #c2a97d',
  padding: '14px',
  textAlign: 'center',
  textDecoration: 'none',
  color: '#2f2417',
}

const trackLogo: CSSProperties = {
  width: '100%',
  height: '90px',
  objectFit: 'contain',
  marginBottom: '10px',
}

const trackTileName: CSSProperties = {
  fontWeight: 700,
  fontSize: '16px',
  color: '#3d2b16',
}

const inlineLink: CSSProperties = {
  color: '#7a5827',
  fontWeight: 700,
}