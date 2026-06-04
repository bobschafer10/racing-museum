import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

async function fetchAllYearResults(startDate: string, endDate: string) {
  const pageSize = 1000
  let from = 0
  let allResults: any[] = []

  while (true) {
    const { data, error } = await supabase
      .from('results_year_top3_view')
      .select('*')
      .gte('race_date', startDate)
      .lt('race_date', endDate)
      .in('finishing_position', [1, 2, 3])
      .order('race_date', { ascending: true })
      .order('track_name', { ascending: true })
      .order('class_name', { ascending: true })
      .order('finishing_position', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error(error)
      break
    }

    if (!data || data.length === 0) break

    allResults = [...allResults, ...data]

    if (data.length < pageSize) break

    from += pageSize
  }

  return allResults
}

type PageProps = {
  params: Promise<{
    year: string
  }>
}

export default async function ResultsYearDetailPage({ params }: PageProps) {
  const { year } = await params
  const startDate = `${year}-01-01`
  const endDate = `${Number(year) + 1}-01-01`

  const results = await fetchAllYearResults(startDate, endDate)

  const groupedResults = Object.values(
    (results || []).reduce((acc: any, r: any) => {
      const date = r.race_date

      if (!acc[date]) {
        acc[date] = {
          date,
          races: {},
        }
      }

      const raceKey = r.race_id
        ? String(r.race_id)
        : `${r.track_slug || r.track_name}-${r.class_name}`

      if (!acc[date].races[raceKey]) {
        acc[date].races[raceKey] = {
          race_id: r.race_id,
          track_name: r.track_name,
          track_slug: r.track_slug,
          class_name: r.class_name,
          finishers: [],
        }
      }

      acc[date].races[raceKey].finishers.push(r)

      return acc
    }, {})
  ).map((group: any) => ({
    ...group,
    races: Object.values(group.races).sort((a: any, b: any) => {
      const trackCompare = String(a.track_name || '').localeCompare(
        String(b.track_name || '')
      )

      if (trackCompare !== 0) return trackCompare

      const raceCompare = Number(a.race_id || 0) - Number(b.race_id || 0)

      if (raceCompare !== 0) return raceCompare

      return String(a.class_name || '').localeCompare(String(b.class_name || ''))
    }),
  }))

  const featuredCandidate = groupedResults.find(
    (group: any) => Array.isArray(group.races) && group.races.length > 0
  )?.races?.[0]

  const { data: yearPhotos } = await supabase
    .from('photos')
    .select(`
      file_name,
      driver_slug,
      track_slug,
      year,
      photographer_slug
    `)
    .eq('year', String(year))
    .not('file_name', 'is', null)
    .not('track_slug', 'is', null)
    .not('photographer_slug', 'is', null)

  const featuredPhoto =
    yearPhotos && yearPhotos.length > 0
      ? yearPhotos[Math.floor(Math.random() * yearPhotos.length)]
      : null

  function formatPhotographer(slug?: string | null) {
    if (!slug || slug === 'unknown') return 'Photographer unknown'
    return slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatSlugName(slug?: string | null) {
    if (!slug) return 'Track unknown'
    return slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const uniqueTracks = new Set(
    (results || []).map((r: any) => r.track_slug || r.track_name)
  )

  const uniqueDrivers = new Set(
    (results || []).map((r: any) => r.driver_slug || r.driver_name)
  )

  const totalRaceGroups = groupedResults.reduce(
    (sum: number, group: any) => sum + group.races.length,
    0
  )

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={giantYearWatermark}>{year}</div>

        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/results" style={breadcrumbLink}>Results</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/results/year" style={breadcrumbLink}>Browse by Year</Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>{year}</span>
          </div>

          <div style={heroTopGrid}>
            <div>
              <div style={eyebrow}>Season Archive</div>
              <h1 style={pageTitle}>{year} Results</h1>

              <p style={seasonTagline}>
                Preserving the race-by-race history of the {year} season.
              </p>

              <p style={pageIntro}>
                Browse race results from the {year} season across the museum archive.
                Each entry helps preserve another race night, another winner, and
                another piece of Midwestern auto racing history.
              </p>

              <Link href="/results/year" style={secondaryButton}>
                Back to All Years
              </Link>

              <div style={seasonStatsRow}>
                <div style={seasonStatCard}>
                  <div style={seasonStatValue}>{groupedResults.length}</div>
                  <div style={seasonStatLabel}>Race Dates</div>
                </div>

                <div style={seasonStatCard}>
                  <div style={seasonStatValue}>{uniqueTracks.size}</div>
                  <div style={seasonStatLabel}>Tracks</div>
                </div>

                <div style={seasonStatCard}>
                  <div style={seasonStatValue}>{totalRaceGroups}</div>
                  <div style={seasonStatLabel}>Feature Results</div>
                </div>

                <div style={seasonStatCard}>
                  <div style={seasonStatValue}>{uniqueDrivers.size}</div>
                  <div style={seasonStatLabel}>Top 3 Finishers</div>
                </div>
              </div>
            </div>

            <div style={featuredWrap}>
              {featuredPhoto && featuredCandidate ? (
                <div style={featuredCard}>
                  <img
                    src={`/photos/${featuredPhoto.file_name}`}
                    alt={`Featured archive photo from ${year}`}
                    style={featuredImage}
                  />
                  <div style={featuredCaption}>
                    <div style={featuredEyebrow}>Featured Archive Photo</div>
                    <div style={featuredCaptionName}>
                      {formatSlugName(featuredPhoto.track_slug)}
                    </div>
                    <div>{year} Season</div>
                    <div>Photo: {formatPhotographer(featuredPhoto.photographer_slug)}</div>
                  </div>
                </div>
              ) : (
                <div style={featuredFallback}>
                  <div style={flagMark}>🏁</div>
                  <div style={featuredCaptionName}>No featured winner photo on file</div>
                  <div style={featuredFallbackSub}>
                    {featuredCandidate?.driver_name || 'Winner image unavailable'}
                  </div>
                  <div style={featuredFallbackSub}>
                    {featuredCandidate?.track_name || ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div style={archiveDivider}>
        Race Dates & Feature Results
      </div>

      <section style={contentWrap}>
        <div style={recordsPanel}>
          <div style={recordsPanelHeader}>
            Results from {year}
          </div>

          <div style={recordsPanelBody}>
            {groupedResults.length > 0 ? (
              groupedResults.map((group: any) => (
                <div key={group.date} style={nightBlock}>
                  <div style={nightHeader}>
                    {formatDate(group.date)} ({group.races.length} feature results)
                  </div>

                  {Object.values(
                    group.races.reduce((trackAcc: any, race: any) => {
                      const trackKey = race.track_slug || race.track_name || 'unknown-track'

                      if (!trackAcc[trackKey]) {
                        trackAcc[trackKey] = {
                          track_name: race.track_name,
                          track_slug: race.track_slug,
                          races: [],
                        }
                      }

                      trackAcc[trackKey].races.push(race)

                      return trackAcc
                    }, {})
                  ).map((trackGroup: any, trackIndex: number) => (
                    <div
                      key={`${group.date}-${trackGroup.track_slug || trackGroup.track_name}`}
                      style={{
                        ...trackGroupBlock,
                        background: trackIndex % 2 === 0 ? '#f5ead4' : '#efe1c7',
                      }}
                    >
                      <div style={trackGroupHeader}>
                        {trackGroup.track_slug ? (
                          <img
                            src={`/logos/tracks/${trackGroup.track_slug}.jpg`}
                            alt=""
                            style={trackLogoSmall}
                          />
                        ) : (
                          <div style={trackLogoFallback}>🏁</div>
                        )}

                        <div style={resultTrack}>
                          {trackGroup.track_slug ? (
                            <Link href={`/tracks/${trackGroup.track_slug}`} style={inlineLink}>
                              {trackGroup.track_name}
                            </Link>
                          ) : (
                            trackGroup.track_name
                          )}
                        </div>
                      </div>

                      <div style={trackRaceStack}>
                        {trackGroup.races.map((race: any) => (
                          <div
                            key={`${race.race_id}-${race.class_name}`}
                            style={trackRaceRow}
                          >
                            <div style={classNameStyle}>
                              {race.class_name || 'Feature'}
                            </div>

                            <div style={podiumLine}>
                              {race.finishers
                                ?.sort(
                                  (a: any, b: any) =>
                                    a.finishing_position - b.finishing_position
                                )
                                .map((finisher: any, index: number) => (
                                  <span
                                    key={`${race.race_id}-${finisher.driver_slug || finisher.driver_name}-${index}`}
                                    style={{
                                      fontWeight:
                                        finisher.finishing_position === 1 ? 700 : 400,
                                    }}
                                  >
                                    {finisher.finishing_position}. {finisher.driver_name}
                                  </span>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p style={panelText}>No results available for {year} yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  color: '#2f2417',
  minHeight: '100vh',
  fontFamily: 'Georgia, serif',
  margin: 0,
}

const heroSection: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at 78% 18%, rgba(122,88,39,0.14), transparent 28%), linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const giantYearWatermark: CSSProperties = {
  position: 'absolute',
  right: '-30px',
  top: '20px',
  fontSize: '240px',
  fontWeight: 700,
  lineHeight: 1,
  color: 'rgba(90, 62, 29, 0.05)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 0,
}

const heroInner: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 44px',
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
  fontSize: '56px',
  margin: '0 0 10px',
  color: '#3d2b16',
  lineHeight: 1.05,
}

const seasonTagline: CSSProperties = {
  margin: '0 0 18px',
  fontSize: '24px',
  lineHeight: 1.4,
  fontStyle: 'italic',
  color: '#6f4d24',
  maxWidth: '720px',
}

const pageIntro: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1.7,
  maxWidth: '850px',
  margin: '0 0 18px',
}

const secondaryButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '10px 14px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
  fontWeight: 700,
}

const heroTopGrid: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) 420px',
  gap: '46px',
  alignItems: 'center',
}

const seasonStatsRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
  gap: '12px',
  marginTop: '26px',
  maxWidth: '820px',
}

const seasonStatCard: CSSProperties = {
  background: 'rgba(239, 225, 199, 0.88)',
  border: '1px solid #b89b6d',
  padding: '18px 12px',
  textAlign: 'center',
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
}

const seasonStatValue: CSSProperties = {
  fontSize: '38px',
  fontWeight: 700,
  color: '#4a3218',
  lineHeight: 1,
  marginBottom: '7px',
}

const seasonStatLabel: CSSProperties = {
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: '#7a5827',
  fontWeight: 700,
}

const featuredWrap: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
}

const featuredCard: CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  background: '#f6ead2',
  border: '1px solid #b89a6b',
  overflow: 'hidden',
  boxShadow: '0 14px 30px rgba(40, 28, 14, 0.16)',
  transform: 'rotate(-1deg)',
}

const featuredImage: CSSProperties = {
  width: '100%',
  height: '300px',
  objectFit: 'cover',
  display: 'block',
  background: '#d8c39b',
}

const featuredCaption: CSSProperties = {
  padding: '14px 16px',
  fontSize: '15px',
  lineHeight: 1.5,
  color: '#4b351d',
  background: '#efe1c7',
  borderTop: '1px solid #c2a97d',
}

const featuredEyebrow: CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#7a5827',
  fontWeight: 700,
  marginBottom: '4px',
}

const featuredCaptionName: CSSProperties = {
  fontWeight: 700,
  fontSize: '17px',
  color: '#3d2b16',
  marginBottom: '2px',
}

const featuredFallback: CSSProperties = {
  width: '100%',
  maxWidth: '390px',
  minHeight: '300px',
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '20px',
  color: '#5b3a1b',
  boxShadow: '0 14px 30px rgba(40, 28, 14, 0.12)',
}

const flagMark: CSSProperties = {
  fontSize: '48px',
  lineHeight: 1,
  marginBottom: '14px',
}

const featuredFallbackSub: CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.5,
}

const archiveDivider: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '18px 20px 0',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#6b4a22',
  borderTop: '2px solid rgba(122,88,39,0.25)',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 40px',
}

const recordsPanel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px',
}

const recordsPanelHeader: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginBottom: '10px',
}

const recordsPanelBody: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '16px',
}

const nightBlock: CSSProperties = {
  marginBottom: '24px',
}

const nightHeader: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#3d2b16',
  marginBottom: '8px',
  borderBottom: '2px solid #b89b6d',
  paddingBottom: '6px',
}

const trackGroupBlock: CSSProperties = {
  borderBottom: '1px solid #ccb48a',
  padding: '12px 10px',
}

const trackGroupHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '8px',
}

const trackLogoSmall: CSSProperties = {
  width: '34px',
  height: '34px',
  objectFit: 'contain',
  background: '#efe1c7',
  border: '1px solid #c2a97d',
  padding: '3px',
}

const trackLogoFallback: CSSProperties = {
  width: '34px',
  height: '34px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#efe1c7',
  border: '1px solid #c2a97d',
  fontSize: '18px',
}

const resultTrack: CSSProperties = {
  color: '#5a3a1b',
  fontWeight: 700,
}

const inlineLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const trackRaceStack: CSSProperties = {
  display: 'grid',
  gap: '6px',
  paddingLeft: '0',
  marginLeft: '56px',
}

const trackRaceRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '260px 1fr',
  gap: '24px',
  alignItems: 'start',
  padding: '4px 0',
}

const classNameStyle: CSSProperties = {
  fontSize: '1.05rem',
  color: '#6b5633',
  lineHeight: 1.5,
}

const podiumLine: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(140px, auto))',
  gap: '10px',
  alignItems: 'baseline',
  lineHeight: 1.5,
  fontSize: '1.05rem',
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: 0,
}