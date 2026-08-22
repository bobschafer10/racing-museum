import Link from 'next/link'
import { getRacePrograms } from '@/lib/race-programs'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import SeriesLogo from './SeriesLogo'
import SeriesHeroPhoto from './SeriesHeroPhoto'
import { supabase } from '@/lib/supabase'

const SUPABASE_PHOTO_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master'

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

  if (seriesError) console.error('Series error:', seriesError)
  if (!series) notFound()

  const { data: seasons, error: seasonsError } = await supabase
    .from('SeriesSeasons')
    .select('*')
    .eq('series_id', series.id)
    .order('year', { ascending: false })

  if (seasonsError) console.error('Seasons error:', seasonsError)

  const { data: events, error: eventsError } = await supabase
    .from('SeriesEvents')
    .select('*')
    .eq('series_id', series.id)
    .order('race_date', { ascending: false })

  if (eventsError) console.error('Events error:', eventsError)

  const seasonRows = seasons || []
  const eventRows = events || []
  const latestSeason = seasonRows[0] || null

  const latestSeasonEvents = latestSeason
    ? eventRows
        .filter((event: any) => Number(event.season_id) === Number(latestSeason.id))
        .sort((a: any, b: any) =>
          String(a.race_date || '').localeCompare(String(b.race_date || ''))
        )
    : []

  const { data: latestStandings, error: standingsError } = latestSeason
    ? await supabase
        .from('SeriesStandings')
        .select('*')
        .eq('season_id', latestSeason.id)
        .order('finishing_position', { ascending: true })
        .limit(10)
    : { data: [], error: null }

  if (standingsError) console.error('Standings error:', standingsError)

  const standingRows = latestStandings || []

  const heroDriverIds = Array.from(
    new Set(
      [
        ...standingRows.map((row: any) => Number(row.driver_id)),
        ...latestSeasonEvents.map((event: any) => Number(event.winner_driver_id)),
      ].filter((id) => Number.isFinite(id) && id > 0)
    )
  )

  const { data: heroDrivers } = heroDriverIds.length
    ? await supabase
        .from('Drivers')
        .select('driver_id, driver_name, slug')
        .in('driver_id', heroDriverIds)
    : { data: [] }

  const heroDriverRows = heroDrivers || []
  const heroDriverSlugs = heroDriverRows.map((driver: any) => driver.slug).filter(Boolean)
  const heroDriverBySlug = new Map(
    heroDriverRows.map((driver: any) => [driver.slug, driver])
  )

  const { data: heroPhotoRows } = heroDriverSlugs.length
    ? await supabase
        .from('photos')
        .select('photo_id, file_name, track_slug, driver_slug, year, photographer_slug, sequence, needs_review')
        .in('driver_slug', heroDriverSlugs)
        .eq('needs_review', false)
        .limit(100)
    : { data: [] }

  const heroPhotos = buildHeroPhotos(heroPhotoRows || [], heroDriverBySlug, latestSeason?.year)

  const trackIds = Array.from(
    new Set(
      eventRows
        .map((event: any) => Number(event.track_id))
        .filter((id: number) => !Number.isNaN(id) && id > 0)
    )
  )

  const { data: tracks, error: tracksError } = trackIds.length
    ? await supabase
        .from('Tracks')
        .select('id, track_id, track_name, slug')
        .in('id', trackIds)
    : { data: [], error: null }

  if (tracksError) console.error('Tracks error:', tracksError)

  const trackById = new Map(
    (tracks || []).map((track: any) => [Number(track.id), track])
  )

  const associatedTracks = Array.from(
    new Map(
      eventRows
        .filter((event: any) => event.track_name)
        .map((event: any) => {
          const matched = trackById.get(Number(event.track_id))
          const trackName = matched?.track_name || event.track_name
          const trackSlug = matched?.slug || `${slugify(trackName)}-wi`
          return [trackSlug, { track_name: trackName, track_slug: trackSlug }]
        })
    ).values()
  ).sort((a: any, b: any) => a.track_name.localeCompare(b.track_name))

  const winnerCounts = new Map<string, number>()
  for (const event of eventRows) {
    if (!event.winner_name) continue
    winnerCounts.set(event.winner_name, (winnerCounts.get(event.winner_name) || 0) + 1)
  }

  const winnerLeaders = Array.from(winnerCounts.entries()).sort((a, b) => b[1] - a[1])
  const topWinner = winnerLeaders[0] || null

  const eventCountBySeason = new Map<number, number>()
  for (const event of eventRows) {
    const seasonId = Number(event.season_id)
    eventCountBySeason.set(seasonId, (eventCountBySeason.get(seasonId) || 0) + 1)
  }

  const decadeGroups = groupSeasonsByDecade(seasonRows)

  const regionOverrides: Record<string, string> = {
    'badger-stock-car-tour': 'Upper Midwest',
  }
  const statusOverrides: Record<string, string> = {
    'badger-stock-car-tour': 'Final',
  }
  const coverageOverrides: Record<string, string> = {
    'badger-stock-car-tour': 'Complete',
  }

  const region = series.region || regionOverrides[slug] || 'Region TBD'
  const archiveStatus = series.status || statusOverrides[slug] || 'In Progress'
  const coverage = series.coverage || coverageOverrides[slug] || 'Growing'

  const allPrograms = await getRacePrograms()
  const relatedPrograms = allPrograms.filter((program) => {
    return program.series_slug === slug || program.track_slug === slug
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

          <div style={heroPhotos.length ? heroGridWithPhoto : heroGrid}>
            <div style={logoPanel}>
              <SeriesLogo slug={series.slug} seriesName={series.series_name} />
            </div>

            <div style={heroText}>
              <div style={eyebrow}>Series Archive</div>
              <h1 style={seriesTitle}>{series.series_name}</h1>
              <p style={metaLine}>
                {region}
                {series.years_active ? ` • ${series.years_active}` : ''}
                {archiveStatus ? ` • ${archiveStatus}` : ''}
              </p>

              <p style={introText}>
                {series.description ||
                  'Explore season-by-season championship history, race results, drivers, tracks, and preserved material from this racing series.'}
              </p>

              <div style={buttonRow}>
                <Link href="/series" style={backButton}>Back to Series</Link>
                {latestSeason && (
                  <Link href={`/series/${slug}/${latestSeason.year}`} style={primaryButton}>
                    Explore {latestSeason.year} Season
                  </Link>
                )}
              </div>
            </div>

            {heroPhotos.length > 0 && <SeriesHeroPhoto photos={heroPhotos} />}
          </div>

          <div style={statStrip}>
            <HeroStat label="Seasons" value={String(seasonRows.length)} />
            <HeroStat label="Recorded Events" value={String(eventRows.length)} />
            <HeroStat label="Tracks" value={String(associatedTracks.length)} />
            <HeroStat label="Feature Winners" value={String(winnerCounts.size)} />
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={mainGrid}>
          <div style={leftColumn}>
            <Panel title="Series Seasons">
              <p style={instructionText}>
                Click a year for season details, race results, and final standings.
              </p>

              {seasonRows.length === 0 ? (
                <p style={panelText}>No seasons have been added yet.</p>
              ) : seasonRows.length <= 12 ? (
                <div>
                  {seasonRows.map((season: any) => (
                    <SeasonRow
                      key={season.id}
                      slug={slug}
                      season={season}
                      raceCount={season.races || eventCountBySeason.get(Number(season.id)) || 0}
                    />
                  ))}
                </div>
              ) : (
                <div style={decadeGrid}>
                  {decadeGroups.map((group) => (
                    <div key={group.decade} style={decadeCard}>
                      <div style={decadeTitle}>{group.decade}s</div>
                      <div style={yearChipGrid}>
                        {group.seasons.map((season: any) => (
                          <Link
                            key={season.id}
                            href={`/series/${slug}/${season.year}`}
                            style={yearChip}
                            title={`${season.year}${season.champion_name ? ` — Champion: ${season.champion_name}` : ''}`}
                          >
                            {season.year}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {latestSeason && (
              <Panel title={`${latestSeason.year} Season Snapshot`}>
                <div style={seasonSnapshotHeader}>
                  <div>
                    <div style={snapshotChampionLabel}>Champion</div>
                    <div style={snapshotChampion}>
                      {latestSeason.champion_name || 'Champion TBD'}
                    </div>
                  </div>
                  <div style={snapshotMeta}>
                    {latestSeason.races || latestSeasonEvents.length || 0} recorded races
                  </div>
                </div>

                {latestSeasonEvents.length > 0 ? (
                  <div style={eventCardGrid}>
                    {latestSeasonEvents.slice(0, 6).map((event: any) => (
                      <Link
                        key={event.id}
                        href={`/series/${slug}/${latestSeason.year}/${event.race_number}`}
                        style={eventCard}
                      >
                        <div style={eventRaceNo}>Race #{event.race_number}</div>
                        <div style={eventTrack}>{event.track_name || 'Track TBD'}</div>
                        <div style={eventDate}>{formatShortDate(event.race_date)}</div>
                        <div style={eventWinner}>
                          {event.winner_name ? `Winner: ${event.winner_name}` : 'Winner TBD'}
                        </div>
                        <div style={viewDetails}>View Full Results →</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={panelText}>No events have been added for this season yet.</p>
                )}

                <div style={panelActionRow}>
                  <Link href={`/series/${slug}/${latestSeason.year}`} style={textButton}>
                    View Full {latestSeason.year} Season →
                  </Link>
                </div>
              </Panel>
            )}

            {latestSeason && standingRows.length > 0 && (
              <Panel title={`${latestSeason.year} Final Standings Preview`}>
                <div style={standingsHeader}>
                  <span>Pos</span>
                  <span>Driver</span>
                  <span>Pts</span>
                  <span>Wins</span>
                </div>
                {standingRows.slice(0, 5).map((row: any) => (
                  <div key={row.id} style={standingsRow}>
                    <span>{row.finishing_position}</span>
                    <span style={standingsDriver}>{row.driver_name}</span>
                    <span>{row.points || ''}</span>
                    <span>{row.wins || '0'}</span>
                  </div>
                ))}
                <div style={panelActionRow}>
                  <Link href={`/series/${slug}/${latestSeason.year}`} style={textButton}>
                    View Complete Standings →
                  </Link>
                </div>
              </Panel>
            )}
          </div>

          <div style={rightColumn}>
            <Panel title="Series Highlights">
              <SummaryRow label="Archive Status" value={archiveStatus} />
              <SummaryRow label="Coverage" value={coverage} />
              <SummaryRow label="Seasons" value={String(seasonRows.length)} />
              <SummaryRow label="Recorded Events" value={String(eventRows.length)} />
              <SummaryRow label="Tracks Visited" value={String(associatedTracks.length)} />
              <SummaryRow label="Different Winners" value={String(winnerCounts.size)} />
              {topWinner && (
                <SummaryRow label="Most Recorded Wins" value={`${topWinner[0]} — ${topWinner[1]}`} />
              )}
              {latestSeason?.champion_name && (
                <SummaryRow
                  label={`${latestSeason.year} Champion`}
                  value={latestSeason.champion_name}
                />
              )}
            </Panel>

            <Panel title="Associated Tracks">
              {associatedTracks.length > 0 ? (
                <>
                  <div style={trackLogoGrid}>
                    {associatedTracks.slice(0, 12).map((track: any) => (
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
                  {associatedTracks.length > 12 && (
                    <p style={smallNote}>
                      Showing 12 of {associatedTracks.length} recorded tracks.
                    </p>
                  )}
                </>
              ) : (
                <p style={panelText}>No associated tracks yet.</p>
              )}
            </Panel>

            <Panel title="Explore the Archive">
              <div style={exploreGrid}>
                <Link href="/drivers" style={exploreCard}>Drivers</Link>
                <Link href="/tracks" style={exploreCard}>Tracks</Link>
                <Link href="/photos" style={exploreCard}>Photos</Link>
                <Link href="/media" style={exploreCard}>Media</Link>
              </div>
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
          <div style={emptyPanel}>No related race programs have been linked to this series yet.</div>
        ) : (
          <div style={relatedProgramsGrid}>
            {relatedPrograms.map((program) => (
              <article key={program.slug} style={relatedProgramCard}>
                <div style={relatedProgramImageWrap}>
                  <img src={program.coverImage || ''} alt={program.title} style={relatedProgramImage} />
                </div>
                <div style={relatedProgramBody}>
                  <div style={relatedProgramMeta}>{program.year}</div>
                  <h3 style={relatedProgramTitle}>{program.title}</h3>
                  <Link href={`/media/race-programs/${program.slug}`} style={relatedProgramButton}>
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

function buildHeroPhotos(photoRows: any[], driverBySlug: Map<any, any>, seasonYear?: number | null) {
  const ranked = photoRows
    .filter((photo: any) => photo.file_name && photo.driver_slug && driverBySlug.has(photo.driver_slug))
    .map((photo: any) => {
      const driver = driverBySlug.get(photo.driver_slug)
      const photoYear = String(photo.year || 'unknown-year')
      const track = String(photo.track_slug || 'unknown-track')
      let score = 0
      if (seasonYear && photoYear === String(seasonYear)) score += 100
      if (photoYear !== 'unknown-year') score += 20
      if (photo.photographer_slug && photo.photographer_slug !== 'unknown-photographer') score += 5
      return {
        score,
        photoId: photo.photo_id,
        imageUrl: `${SUPABASE_PHOTO_BASE}/${track}/${photoYear}/${encodeURIComponent(photo.file_name)}`,
        driverName: driver.driver_name,
        driverSlug: driver.slug,
        year: photoYear,
        photographer: photo.photographer_slug,
      }
    })
    .sort((a: any, b: any) => b.score - a.score)

  const bestByDriver = new Map<string, any>()
  for (const photo of ranked) {
    if (!bestByDriver.has(photo.driverSlug)) bestByDriver.set(photo.driverSlug, photo)
  }
  return Array.from(bestByDriver.values()).slice(0, 8)
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={heroStat}>
      <div style={heroStatValue}>{value}</div>
      <div style={heroStatLabel}>{label}</div>
    </div>
  )
}

function SeasonRow({ slug, season, raceCount }: { slug: string; season: any; raceCount: number }) {
  return (
    <Link href={`/series/${slug}/${season.year}`} style={seasonCard}>
      <span style={seasonYearStyle}>{season.year}</span>
      <span>
        <strong>{season.champion_name || 'Champion TBD'}</strong>
        <span style={seasonChampionMeta}> {season.champion_name ? '— Champion' : ''}</span>
      </span>
      <span style={seasonRaceCount}>{raceCount ? `${raceCount} races` : 'Race count TBD'}</span>
      <span style={seasonArrow}>→</span>
    </Link>
  )
}

function groupSeasonsByDecade(seasons: any[]) {
  const groups = new Map<number, any[]>()
  for (const season of seasons) {
    const decade = Math.floor(Number(season.year) / 10) * 10
    if (!groups.has(decade)) groups.set(decade, [])
    groups.get(decade)!.push(season)
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([decade, group]) => ({
      decade,
      seasons: group.sort((a, b) => Number(b.year) - Number(a.year)),
    }))
}

function slugify(value?: string | null) {
  if (!value) return ''
  return value.toLowerCase().replace(/,/g, '').replace(/\./g, '').replace(/\s+/g, '-')
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Date TBD'
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const pageStyle: CSSProperties = { background: '#eadfc7', color: '#2f2417', minHeight: '100vh', fontFamily: 'Georgia, serif', margin: 0 }
const heroSection: CSSProperties = { background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)', borderBottom: '2px solid #b29364' }
const heroInner: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '28px 20px 30px' }
const breadcrumbRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '15px', marginBottom: '22px', color: '#6b4a22' }
const breadcrumbLink: CSSProperties = { color: '#7a5827', textDecoration: 'none' }
const breadcrumbSep: CSSProperties = { color: '#8d7049' }
const breadcrumbCurrent: CSSProperties = { color: '#4b351d' }
const heroGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)', gap: '30px', alignItems: 'center' }
const heroGridWithPhoto: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(190px, 245px) minmax(360px, 1fr) minmax(275px, 360px)', gap: '26px', alignItems: 'center' }
const heroText: CSSProperties = { minWidth: 0 }
const logoPanel: CSSProperties = { background: '#dcc7a1', border: '2px solid #b29364', padding: '10px' }
const eyebrow: CSSProperties = { fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }
const seriesTitle: CSSProperties = { fontSize: '48px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.04 }
const metaLine: CSSProperties = { fontSize: '20px', margin: '0 0 16px', color: '#5a3a1b' }
const introText: CSSProperties = { fontSize: '17px', lineHeight: 1.6, maxWidth: '680px', margin: '0 0 18px' }
const buttonRow: CSSProperties = { display: 'flex', gap: '12px', flexWrap: 'wrap' }
const backButton: CSSProperties = { display: 'inline-block', background: '#7a5827', color: '#fff8ea', padding: '11px 16px', border: '1px solid #5d3f17', textDecoration: 'none' }
const primaryButton: CSSProperties = { ...backButton, background: '#3d2b16' }
const statStrip: CSSProperties = { marginTop: '26px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }
const heroStat: CSSProperties = { background: 'rgba(241,229,206,.76)', border: '1px solid #c2a97d', padding: '13px 16px', textAlign: 'center' }
const heroStatValue: CSSProperties = { fontSize: '29px', fontWeight: 700, color: '#3d2b16' }
const heroStatLabel: CSSProperties = { fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.6px', color: '#72502c' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '28px 20px 40px' }
const mainGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(300px,.85fr)', gap: '20px', alignItems: 'start' }
const leftColumn: CSSProperties = { display: 'grid', gap: '20px' }
const rightColumn: CSSProperties = { display: 'grid', gap: '20px' }
const panel: CSSProperties = { background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }
const panelHeader: CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#5b3a1b', marginBottom: '10px' }
const panelBody: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }
const instructionText: CSSProperties = { fontSize: '15px', lineHeight: 1.6, margin: '0 0 10px', color: '#72502c', fontStyle: 'italic' }
const panelText: CSSProperties = { fontSize: '17px', lineHeight: 1.7, margin: 0 }
const seasonCard: CSSProperties = { display: 'grid', gridTemplateColumns: '80px minmax(0,1fr) auto 24px', gap: '12px', alignItems: 'center', padding: '13px 4px', borderBottom: '1px solid #ccb48a', color: '#3d2b16', textDecoration: 'none' }
const seasonYearStyle: CSSProperties = { fontWeight: 700, color: '#7a5827', fontSize: '22px', textDecoration: 'underline', textUnderlineOffset: '3px' }
const seasonChampionMeta: CSSProperties = { color: '#72502c', fontSize: '14px' }
const seasonRaceCount: CSSProperties = { color: '#5b3a1b', fontWeight: 700, whiteSpace: 'nowrap' }
const seasonArrow: CSSProperties = { fontSize: '21px', color: '#7a5827' }
const decadeGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '12px' }
const decadeCard: CSSProperties = { background: '#eadfc7', border: '1px solid #c2a97d', padding: '12px' }
const decadeTitle: CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#5b3a1b', marginBottom: '8px' }
const yearChipGrid: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '7px' }
const yearChip: CSSProperties = { background: '#f8f2e3', border: '1px solid #b29364', color: '#5b3a1b', padding: '6px 9px', fontWeight: 700, textDecoration: 'none' }
const seasonSnapshotHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'end', marginBottom: '14px' }
const snapshotChampionLabel: CSSProperties = { fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.6px', color: '#72502c' }
const snapshotChampion: CSSProperties = { fontSize: '27px', fontWeight: 700, color: '#3d2b16' }
const snapshotMeta: CSSProperties = { color: '#72502c', fontWeight: 700 }
const eventCardGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '12px' }
const eventCard: CSSProperties = { display: 'block', background: '#eadfc7', border: '1px solid #c2a97d', padding: '13px', color: '#2f2417', textDecoration: 'none' }
const eventRaceNo: CSSProperties = { fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.6px', color: '#7a5827', fontWeight: 700 }
const eventTrack: CSSProperties = { fontSize: '20px', fontWeight: 700, marginTop: '4px' }
const eventDate: CSSProperties = { fontSize: '14px', color: '#72502c', marginTop: '3px' }
const eventWinner: CSSProperties = { marginTop: '10px', fontWeight: 700 }
const viewDetails: CSSProperties = { marginTop: '12px', color: '#7a5827', fontSize: '14px', fontWeight: 700 }
const panelActionRow: CSSProperties = { marginTop: '14px', textAlign: 'right' }
const textButton: CSSProperties = { color: '#7a5827', fontWeight: 700, textDecoration: 'none' }
const standingsHeader: CSSProperties = { display: 'grid', gridTemplateColumns: '55px 1fr 80px 70px', gap: '8px', fontWeight: 700, color: '#5b3a1b', padding: '7px 0', borderBottom: '2px solid #b29364' }
const standingsRow: CSSProperties = { display: 'grid', gridTemplateColumns: '55px 1fr 80px 70px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #ccb48a' }
const standingsDriver: CSSProperties = { fontWeight: 700 }
const summaryRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }
const summaryLabel: CSSProperties = { color: '#5a3a1b' }
const summaryValue: CSSProperties = { fontWeight: 700, textAlign: 'right' }
const trackLogoGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: '12px' }
const trackTile: CSSProperties = { background: '#eadfc7', border: '1px solid #c2a97d', padding: '10px', textAlign: 'center', textDecoration: 'none', color: '#2f2417' }
const trackLogo: CSSProperties = { width: '100%', height: '72px', objectFit: 'contain', marginBottom: '8px' }
const trackTileName: CSSProperties = { fontWeight: 700, fontSize: '14px', color: '#3d2b16' }
const smallNote: CSSProperties = { fontSize: '13px', color: '#72502c', margin: '12px 0 0' }
const exploreGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px' }
const exploreCard: CSSProperties = { display: 'block', textAlign: 'center', background: '#eadfc7', border: '1px solid #c2a97d', padding: '14px 8px', color: '#5b3a1b', fontWeight: 700, textDecoration: 'none' }
const sectionStyle: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }
const sectionTitle: CSSProperties = { fontSize: '32px', fontWeight: 700, color: '#5b3a1b', margin: '0 0 10px' }
const sectionIntro: CSSProperties = { fontSize: '17px', lineHeight: 1.7, color: '#5a3a1b', margin: '0 0 20px' }
const emptyPanel: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '16px', fontSize: '17px', lineHeight: 1.7, color: '#5a3a1b' }
const relatedProgramsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px' }
const relatedProgramCard: CSSProperties = { background: '#f5eddc', border: '1px solid rgba(115,88,52,.22)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(60,40,20,.08)', display: 'flex', flexDirection: 'column' }
const relatedProgramImageWrap: CSSProperties = { padding: 14, paddingBottom: 0 }
const relatedProgramImage: CSSProperties = { width: '100%', height: 'auto', display: 'block', borderRadius: 10 }
const relatedProgramBody: CSSProperties = { padding: 16 }
const relatedProgramMeta: CSSProperties = { fontSize: 13, color: '#6a5641', marginBottom: 8 }
const relatedProgramTitle: CSSProperties = { fontSize: 22, lineHeight: 1.2, color: '#2f2419', margin: '0 0 12px' }
const relatedProgramButton: CSSProperties = { display: 'inline-block', marginTop: 8, padding: '10px 14px', borderRadius: 999, textDecoration: 'none', background: '#7b5c34', color: '#fff8ee', fontWeight: 700, border: '1px solid #7b5c34' }