import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export default async function ResultsYearPage() {
  const { data: yearResults } = await supabase
    .from('results_years')
    .select('year')

  const availableYears = (yearResults || [])
    .map((r: any) => Number(r.year))
    .filter((y): y is number => Number.isFinite(y))
    .sort((a, b) => a - b)

  const decadeGroups = availableYears.reduce((acc: Record<string, number[]>, year) => {
    const decadeStart = Math.floor(year / 10) * 10
    const decadeLabel = `${decadeStart}s`

    if (!acc[decadeLabel]) {
      acc[decadeLabel] = []
    }

    acc[decadeLabel].push(year)
    return acc
  }, {})

  const orderedDecades = Object.keys(decadeGroups).sort(
    (a, b) => Number(a.replace('s', '')) - Number(b.replace('s', ''))
  )

  const decadePhotos: Record<string, string> = {}

  for (const decade of orderedDecades) {
    const startYear = Number(decade.replace('s', ''))
    const endYear = startYear + 9

    const { data } = await supabase
      .from('photos')
      .select('file_name, year')
      .gte('year', String(startYear))
      .lte('year', String(endYear))
      .not('file_name', 'is', null)
      .limit(40)

    if (data && data.length > 0) {
      const randomPhoto = data[Math.floor(Math.random() * data.length)]
      decadePhotos[decade] = `/photos/${randomPhoto.file_name}`
    }
  }

  const featuredYear =
    availableYears.length > 0
      ? availableYears[Math.floor(Math.random() * availableYears.length)]
      : null

  const { data: featuredPhotos } = featuredYear
    ? await supabase
        .from('photos')
        .select('file_name, year')
        .eq('year', String(featuredYear))
        .not('file_name', 'is', null)
        .limit(50)
    : { data: [] }

  const featuredPhoto =
    featuredPhotos && featuredPhotos.length > 0
      ? featuredPhotos[Math.floor(Math.random() * featuredPhotos.length)]
      : null

  const featuredImageSrc = featuredPhoto?.file_name
    ? `/photos/${featuredPhoto.file_name}`
    : '/images/checkered-flag-fallback.jpg'

  const firstYear = availableYears[0] ?? '—'
  const latestYear = availableYears[availableYears.length - 1] ?? '—'

  function getDecadeDescription(decade: string) {
    switch (decade) {
      case '1900s':
        return 'The earliest surviving records from Midwestern auto racing.'
      case '1910s':
        return 'County fairgrounds, dirt tracks, and the rise of organized racing.'
      case '1920s':
        return 'Expanding competition throughout the Midwest racing circuit.'
      case '1930s':
        return 'Racing survives through the Great Depression era.'
      case '1940s':
        return 'Postwar racing returns to Wisconsin and surrounding states.'
      case '1950s':
        return 'The postwar boom years of short track racing.'
      case '1960s':
        return 'The growth of weekly racing and regional touring stars.'
      case '1970s':
        return 'A golden era for Wisconsin short track competition.'
      case '1980s':
        return 'Touring series, super late models, and expanding media coverage.'
      case '1990s':
        return 'Regional series growth and modern short track competition.'
      case '2000s':
        return 'Digital-era racing archives begin taking shape.'
      case '2010s':
        return 'Modern racing history preserved season by season.'
      case '2020s':
        return 'Current-day archive preservation and ongoing documentation.'
      default:
        return 'Historic racing results from the archive.'
    }
  }

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={archiveWatermark}>ARCHIVE</div>

        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/results" style={breadcrumbLink}>Results</Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>Browse by Year</span>
          </div>

          <div style={heroTopGrid}>
            <div>
              <div style={eyebrow}>Archive Browse</div>
              <h1 style={pageTitle}>Browse Results by Year</h1>

              <p style={archiveTagline}>
                Preserving over a century of Midwestern auto racing history.
              </p>

              <p style={pageIntro}>
                Explore race results season by season across the archive. Select a
                year below to jump into the historical record and uncover the
                drivers, tracks, and race nights that shaped the sport.
              </p>

              <div style={archiveStatsRow}>
                <div style={archiveStatCard}>
                  <div style={archiveStatLabel}>Seasons Available</div>
                  <div style={archiveStatValue}>{availableYears.length}</div>
                </div>

                <div style={archiveStatCard}>
                  <div style={archiveStatLabel}>First Year</div>
                  <div style={archiveStatValue}>{firstYear}</div>
                </div>

                <div style={archiveStatCard}>
                  <div style={archiveStatLabel}>Latest Year</div>
                  <div style={archiveStatValue}>{latestYear}</div>
                </div>
              </div>
            </div>

            {featuredYear ? (
              <div style={spotlightCard}>
                <div style={spotlightLabel}>Featured Year</div>

                <div style={archiveHeroWrap}>
                  <img
                    src={featuredImageSrc}
                    alt={`Featured year ${featuredYear}`}
                    style={archiveHeroImage}
                  />
                  <div style={archiveOverlay} />
                </div>

                <div style={spotlightBody}>
                  <div style={spotlightYear}>{featuredYear}</div>

                  <div style={spotlightTitle}>
                    Featured season from the Upper Midwest racing archive
                  </div>

                  <div style={spotlightText}>
                    Explore race winners, tracks, and season history from across
                    the {featuredYear} archive.
                  </div>

                  <Link
                    href={`/results/year/${featuredYear}`}
                    style={spotlightButton}
                  >
                    Explore {featuredYear}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section style={introPanelWrap}>
        <div style={introPanel}>
          <div style={introTitle}>How to Explore the Archive</div>

          <div style={introGrid}>
            <div style={introItem}>
              <div style={introItemTitle}>Browse by Year</div>
              <div style={introItemText}>
                Navigate season by season to explore race results across the Upper Midwest.
              </div>
            </div>

            <div style={introItem}>
              <div style={introItemTitle}>Discover Tracks</div>
              <div style={introItemText}>
                Each season connects historic tracks, weekly shows, specials, and regional events.
              </div>
            </div>

            <div style={introItem}>
              <div style={introItemTitle}>Follow Drivers</div>
              <div style={introItemText}>
                Click through results to follow drivers, wins, podiums, and career records.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={archiveDivider}>
        Archive Collection
      </div>

      <section style={contentWrap}>
        <div style={recordsPanel}>
          <div style={recordsPanelHeader}>Available Years</div>

          <div style={recordsPanelBody}>
            {orderedDecades.length > 0 ? (
              <div style={decadeStack}>
                {orderedDecades.map((decade, decadeIndex) => (
                  <div
                    key={decade}
                    style={{
                      ...decadeBlock,
                      background:
                        decadeIndex % 2 === 0 ? '#f3e7cf' : '#efe1c7',
                    }}
                  >
                    <div style={decadeWatermark}>
                      {decade.replace('s', '')}
                    </div>

                    {decadePhotos[decade] ? (
                      <img
                        src={decadePhotos[decade]}
                        alt=""
                        style={decadeBackgroundImage}
                      />
                    ) : null}

                    <div style={decadeHeader}>{decade}</div>

                    <div style={decadeSubtext}>
                      {getDecadeDescription(decade)}
                    </div>

                    <div style={yearGrid}>
                      {decadeGroups[decade].map((year) => (
                        <Link
                          key={year}
                          href={`/results/year/${year}`}
                          style={yearChip}
                        >
                          {year}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={panelText}>No years available yet.</p>
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
    'radial-gradient(circle at 78% 18%, rgba(122,88,39,0.12), transparent 28%), linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const archiveWatermark: CSSProperties = {
  position: 'absolute',
  right: '-60px',
  top: '-20px',
  fontSize: '220px',
  fontWeight: 700,
  lineHeight: 1,
  color: 'rgba(90, 62, 29, 0.045)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 0,
}

const heroInner: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 42px',
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

const archiveTagline: CSSProperties = {
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
  margin: 0,
}

const heroTopGrid: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.15fr) 360px',
  gap: '42px',
  alignItems: 'center',
}

const archiveStatsRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '14px',
  marginTop: '24px',
  maxWidth: '760px',
}

const archiveStatCard: CSSProperties = {
  background: 'rgba(239, 225, 199, 0.92)',
  border: '1px solid #b89b6d',
  padding: '18px 18px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
}

const archiveStatLabel: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '6px',
}

const archiveStatValue: CSSProperties = {
  fontSize: '36px',
  fontWeight: 700,
  color: '#3d2b16',
  lineHeight: 1.1,
}

const spotlightCard: CSSProperties = {
  border: '1px solid #b29364',
  background: '#f4e8d0',
  boxShadow: '0 14px 28px rgba(40, 28, 14, 0.14)',
  transform: 'rotate(-1deg)',
  overflow: 'hidden',
}

const spotlightLabel: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  padding: '10px 14px 0',
}

const archiveHeroWrap: CSSProperties = {
  position: 'relative',
  width: '100%',
}

const archiveHeroImage: CSSProperties = {
  width: '100%',
  height: '205px',
  objectFit: 'cover',
  objectPosition: 'left center',
  display: 'block',
  filter: 'sepia(0.25) contrast(0.95) brightness(0.95)',
  marginTop: '8px',
}

const archiveOverlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(122, 88, 39, 0.08)',
  pointerEvents: 'none',
}

const spotlightBody: CSSProperties = {
  padding: '14px 16px 16px',
}

const spotlightYear: CSSProperties = {
  fontSize: '36px',
  fontWeight: 700,
  color: '#3d2b16',
  marginBottom: '4px',
  lineHeight: 1.1,
}

const spotlightTitle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#5a3a1b',
  marginBottom: '6px',
}

const spotlightText: CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.5,
  color: '#5a4630',
  marginBottom: '12px',
}

const spotlightButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '9px 12px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
  fontWeight: 700,
}

const introPanelWrap: CSSProperties = {
  borderBottom: '1px solid #b89b6d',
  background: '#e9dcc3',
}

const introPanel: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px 20px 26px',
}

const introTitle: CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#4a3218',
  marginBottom: '16px',
}

const introGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '18px',
}

const introItem: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
}

const introItemTitle: CSSProperties = {
  fontWeight: 700,
  fontSize: '16px',
  marginBottom: '6px',
  color: '#5b3a1b',
}

const introItemText: CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.5,
  color: '#5a4630',
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

const decadeStack: CSSProperties = {
  display: 'grid',
  gap: '22px',
}

const decadeBlock: CSSProperties = {
  position: 'relative',
  display: 'grid',
  gap: '12px',
  padding: '18px 18px 20px',
  border: '1px solid #ccb48a',
  borderLeft: '3px solid rgba(122,88,39,0.22)',
  overflow: 'hidden',
}

const decadeHeader: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  fontSize: '30px',
  fontWeight: 700,
  color: '#3d2b16',
  background:
    'linear-gradient(to bottom, #dcc8a2 0%, #cfb587 100%)',
  border: '1px solid #b29364',
  borderLeft: '10px solid #7a5827',
  padding: '14px 18px',
  boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.35)',
}

const decadeSubtext: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  fontSize: '16px',
  lineHeight: 1.6,
  color: '#6a563c',
  marginTop: '-2px',
  marginBottom: '4px',
  fontStyle: 'italic',
}

const decadeWatermark: CSSProperties = {
  position: 'absolute',
  right: '14px',
  top: '8px',
  fontSize: '110px',
  fontWeight: 700,
  color: 'rgba(90, 62, 29, 0.045)',
  lineHeight: 1,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 1,
}

const decadeBackgroundImage: CSSProperties = {
  position: 'absolute',
  right: '24px',
  top: '22px',
  width: '280px',
  height: '155px',
  objectFit: 'cover',
  opacity: 0.18,
  filter: 'sepia(0.85) contrast(0.9)',
  border: '1px solid rgba(122, 88, 39, 0.25)',
  pointerEvents: 'none',
  zIndex: 1,
}

const yearGrid: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))',
  gap: '10px',
}

const yearChip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '42px',
  padding: '10px 14px',
  background:
    'linear-gradient(to bottom, #f4ead3 0%, #e8d7b8 100%)',
  color: '#5b3a1b',
  border: '1px solid #b29364',
  textDecoration: 'none',
  fontWeight: 700,
  textAlign: 'center',
  transition: 'all 0.15s ease',
  boxShadow:
    '0 2px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.4)',
  cursor: 'pointer',
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: 0,
}