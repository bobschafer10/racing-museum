import Link from 'next/link'
import { getRacePrograms } from '@/lib/race-programs'
import { notFound } from 'next/navigation'
import SeriesLogo from './SeriesLogo'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
function getRelatedRacePrograms(seriesSlug: string) {
  const programs = [
    {
      slug: "1979-artgo-yearbook",
      title: "1979 Official Souvenir Yearbook",
      year: 1979,
      seriesName: "ARTGO Challenge Series",
      seriesSlug: "artgo-challenge-series",
      coverImageUrl: "/media/programs/1979-artgo-yearbook/front-cover.jpg",
    },
    {
      slug: "1980-artgo-yearbook",
      title: "1980 Official Souvenir Yearbook",
      year: 1980,
      seriesName: "ARTGO Challenge Series",
      seriesSlug: "artgo-challenge-series",
      coverImageUrl: "/media/programs/1980-artgo-yearbook/front-cover.jpg",
    },
    {
      slug: "1975-hales-corners-speedway-yearbook",
      title: "1975 Hales Corners Speedway Yearbook",
      year: 1975,
      trackName: "Hales Corners Speedway",
      trackSlug: "hales-corners-speedway-wi",
      coverImageUrl: "/media/programs/1975-hales-corners-speedway-yearbook/front-cover.jpg",
    },
  ]

  return programs
    .filter((p) => p.seriesSlug === seriesSlug)
    .sort((a, b) => a.year - b.year)
}
export default async function SeriesProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

 const { data: series, error: seriesError } = await supabase
  .from('Series')
  .select('*')
  .eq('slug', slug)
  .maybeSingle()

if (seriesError) {
  console.error('Series error:', seriesError)
}

if (!series) {
  notFound()
}

const { data: seasons, error: seasonsError } = await supabase
  .from('SeriesSeasons')
  .select('*')
  .eq('series_id', series.id)
  .order('year', { ascending: true })

console.log('SERIES ID:', series.id)
console.log('SEASONS:', seasons)
console.log('SEASONS ERROR:', seasonsError)

const { data: events, error: eventsError } = await supabase
  .from('SeriesEvents')
  .select('*')
  .eq('series_id', series.id)
  .order('race_date', { ascending: true })

console.log('EVENTS:', events)
console.log('EVENTS ERROR:', eventsError)

const trackIds = Array.from(
  new Set(
    (events || [])
      .map((event: any) => Number(event.track_id))
      .filter((id: number) => !Number.isNaN(id))
  )
)

const { data: tracks, error: tracksError } = await supabase
  .from('Tracks')
  .select('id, track_id, track_name, slug')
  .in('id', trackIds)

console.log('TRACK IDS:', trackIds)
console.log('TRACKS:', tracks)
console.log('TRACKS ERROR:', tracksError)

const trackSlugOverrides: Record<string, string> = {
  'Rockford Speedway': 'rockford-speedway-il',
}

const associatedTracks = Array.from(
  new Map(
    (events || [])
      .filter((event: any) => event.track_name)
      .map((event: any) => {
        const trackName = event.track_name
        const trackSlug =
          trackSlugOverrides[trackName] || `${slugify(trackName)}-wi`

        return [
          trackSlug,
          {
            track_name: trackName,
            track_slug: trackSlug,
          },
        ]
      })
  ).values()
)

const allPrograms = await getRacePrograms()

const relatedPrograms = allPrograms.filter((program) => {
  return (
    program.series_slug === slug ||
    program.track_slug === slug
  )
})

   return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/series" style={breadcrumbLink}>Series</Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>{series.series_name}</span>
          </div>

          <div style={heroGrid}>
            <div style={logoPanel}>
              <SeriesLogo slug={series.slug} seriesName={series.series_name} />
            </div>

            <div>
              <div style={eyebrow}>Series Profile</div>
              <h1 style={seriesTitle}>{series.series_name}</h1>

              <p style={metaLine}>
                {series.region || 'Region TBD'}
                {series.years_active ? ` • ${series.years_active}` : ''}
              </p>

              <p style={introText}>
                Historical series profile from the Upper Midwest archive. This page will grow over time
                with series history, notable winners, top champions, affiliated tracks, and event records.
              </p>

              <div style={buttonRow}>
                <Link href="/series" style={backButton}>Back to Series</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={mainGrid}>
          <div style={leftColumn}>
            <Panel title="Series Summary">
              <SummaryRow label="Series Name" value={series.series_name} />
              <SummaryRow label="Region" value={series.region || 'TBD'} />
              <SummaryRow label="Years Active" value={series.years_active || 'TBD'} />
              <SummaryRow label="Slug" value={series.slug || slug} />
<SummaryRow label="Series ID" value={String(series.id)} />
            </Panel>

            <Panel title="Series Seasons">
  {seasons && seasons.length > 0 ? (
    seasons.map((season: any) => (
      <Link
        key={season.id}
        href={`/series/${slug}/${season.year}`}
        style={seasonCard}
      >
        <span style={seasonYearStyle}>{season.year}</span>
        <span>{season.champion_name || 'Champion TBD'}</span>
        <span>{season.races ? `${season.races} races` : 'Race count TBD'}</span>
      </Link>
    ))
  ) : (
    <p style={panelText}>No seasons have been added yet.</p>
  )}
</Panel>

<Panel title="Recorded Series Events">
  {events && events.length > 0 ? (
    events.slice(0, 8).map((event: any) => (
      <div key={event.id} style={summaryRow}>
        <span style={summaryLabel}>
          {event.race_date} — {event.track_name}
        </span>
       <span style={summaryValue}>
  {event.winner_name
    ? `Winner: ${event.winner_name}`
    : 'Winner TBD'}
</span>
      </div>
    ))
  ) : (
    <p style={panelText}>No series events have been added yet.</p>
  )}
</Panel>

           

            <Panel title="Series Notes">
              <p style={panelText}>
                This series page is part of a growing historical archive of organizations,
                touring groups, weekly divisions, race results, and regional racing history.
              </p>
            </Panel>
          </div>

          <div style={rightColumn}>
            <Panel title="Quick View">
              <SummaryRow label="Status" value="In Progress" />
              <SummaryRow label="Archive Type" value="Series History" />
              <SummaryRow label="Coverage" value="Growing" />
            </Panel>

<Panel title="Associated Tracks">
  {associatedTracks.length > 0 ? (
    <div style={trackLogoGrid}>
      {associatedTracks.map((track: any) => (
        <Link
          key={track.track_slug}
          href={`/tracks/${track.track_slug}`}
          style={trackTile}
        >
          <img
            src={`/logos/tracks/${track.track_slug}.jpg`}
            alt={`${track.track_name} logo`}
            style={trackLogo}
          />

          <div style={trackTileName}>{track.track_name}</div>
        </Link>
      ))}
    </div>
  ) : (
    <p style={panelText}>No associated tracks yet.</p>
  )}
</Panel>

            <Panel title="Coming Next">
              <ul style={bulletList}>
                <li>Series logo</li>
                <li>Top winners</li>
                <li>Championship history</li>
                <li>Associated tracks</li>
                <li>Related events</li>
              </ul>
            </Panel>
          </div>
        </div>
      </section>
<section style={sectionStyle}>
  <h2 style={sectionTitle}>Related Race Programs</h2>
  <p style={sectionIntro}>
    Explore yearbooks and printed publications connected to this racing series.
  </p>

  {relatedPrograms.length === 0 ? (
    <div style={emptyPanel}>
      No related race programs have been linked to this series yet.
    </div>
  ) : (
    <div style={relatedProgramsGrid}>
      {relatedPrograms.map((program) => (
        <article key={program.slug} style={relatedProgramCard}>
          <div style={relatedProgramImageWrap}>
            <img
              src={program.coverImage || ''}
              alt={program.title}
              style={relatedProgramImage}
            />
          </div>

          <div style={relatedProgramBody}>
            <div style={relatedProgramMeta}>{program.year}</div>
            <h3 style={relatedProgramTitle}>{program.title}</h3>

            <Link
              href={`/media/race-programs/${program.slug}`}
              style={relatedProgramButton}
            >
              View Artifact
            </Link>
          </div>
        </article>
      ))}
    </div>
  )}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryRow}>
      <span style={summaryLabel}>{label}</span>
      <span style={summaryValue}>{value}</span>
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

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  color: '#2f2417',
  minHeight: '100vh',
  fontFamily: 'Georgia, serif',
  margin: 0,
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

const heroGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '260px 1fr',
  gap: '28px',
  alignItems: 'start',
}

const logoPanel: CSSProperties = {
  background: '#dcc7a1',
  border: '2px solid #b29364',
  padding: '10px',
}

const logoPlaceholder: CSSProperties = {
  width: '100%',
  height: '280px',
  border: '1px solid #b29364',
  background: '#f8f2e3',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '12px',
  textAlign: 'center',
}

const logoName: CSSProperties = {
  fontWeight: 700,
  fontSize: '26px',
  lineHeight: 1.15,
  color: '#3d2b16',
}

const logoSmall: CSSProperties = {
  fontSize: '14px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#6a4a1f',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const seasonCard: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '90px 1fr auto',
  gap: '12px',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid #ccb48a',
  color: '#3d2b16',
  textDecoration: 'none',
  transition: 'all 0.15s ease',
}

const seriesTitle: CSSProperties = {
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

const introText: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1.7,
  maxWidth: '760px',
  margin: '0 0 20px',
}

const buttonRow: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
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
}

const mainGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.5fr 1fr',
  gap: '20px',
}

const leftColumn: CSSProperties = {
  display: 'grid',
  gap: '20px',
}

const rightColumn: CSSProperties = {
  display: 'grid',
  gap: '20px',
}

const panel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px',
}

const seasonYearStyle: CSSProperties = {
  fontWeight: 700,
  color: '#5b3a1b',
  fontSize: '22px',
}

const panelHeader: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginBottom: '10px',
}

const panelBody: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
}

const summaryRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 0',
  borderBottom: '1px solid #ccb48a',
}

const summaryLabel: CSSProperties = {
  color: '#5a3a1b',
}

const summaryValue: CSSProperties = {
  fontWeight: 700,
  textAlign: 'right',
}

const inlineLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: 0,
}

const bulletList: CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
  lineHeight: 1.7,
  fontSize: '17px',
}
const relatedProgramsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 20,
}

const relatedProgramCard: React.CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.08)",
  display: "flex",
  flexDirection: "column",
}

const relatedProgramImageWrap: React.CSSProperties = {
  padding: 14,
  paddingBottom: 0,
}

const relatedProgramImage: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 10,
}

const relatedProgramBody: React.CSSProperties = {
  padding: 16,
}

const relatedProgramMeta: React.CSSProperties = {
  fontSize: 13,
  color: "#6a5641",
  marginBottom: 8,
}

const relatedProgramTitle: React.CSSProperties = {
  fontSize: 22,
  lineHeight: 1.2,
  color: "#2f2419",
  margin: "0 0 12px",
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
  transition: 'all 0.15s ease',
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
  marginBottom: '4px',
  color: '#3d2b16',
}

const trackTileMeta: CSSProperties = {
  fontSize: '14px',
  color: '#6a4a1f',
}

const relatedProgramButton: React.CSSProperties = {
  display: "inline-block",
  marginTop: 8,
  padding: "10px 14px",
  borderRadius: 999,
  textDecoration: "none",
  background: "#7b5c34",
  color: "#fff8ee",
  fontWeight: 700,
  border: "1px solid #7b5c34",
}
const sectionStyle: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 20px 40px',
}

const sectionTitle: CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#5b3a1b',
  margin: '0 0 10px',
}

const sectionIntro: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  color: '#5a3a1b',
  margin: '0 0 20px',
}

const emptyPanel: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '16px',
  fontSize: '17px',
  lineHeight: 1.7,
  color: '#5a3a1b',
}