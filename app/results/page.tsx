import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export default async function ResultsPage() {
  const { data: results, error } = await supabase
  .from('global_results_view')
  .select('*')
  .order('race_date', { ascending: false })
  .limit(100)

if (error) {
  console.error('RESULTS ERROR:', error)
}

  const groupedResults = Object.values(
    (results || []).reduce((acc: any, r: any) => {
      const date = r.race_date

      if (!acc[date]) {
        acc[date] = {
          date,
          races: [],
        }
      }

      acc[date].races.push(r)
      return acc
    }, {})
  )

function groupByTrack(races: any[]) {
  const grouped: Record<string, any[]> = {}

  races.forEach((r) => {
    if (!grouped[r.track_name]) grouped[r.track_name] = []
    grouped[r.track_name].push(r)
  })

  return grouped
}

    function formatDate(dateStr: string) {
    const d = new Date(`${dateStr}T12:00:00`)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

   return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={heroTopGrid}>
            <div>
              <div style={breadcrumbRow}>
                <Link href="/" style={breadcrumbLink}>Home</Link>
                <span style={breadcrumbSep}>/</span>
                <span style={breadcrumbCurrent}>Results</span>
              </div>

              <div style={eyebrow}>Archive Browse</div>

              <h1 style={pageTitle}>Results</h1>

              <p style={pageIntro}>
                Browse recent race results from across the archive. This page is the starting
                point for track-by-track and year-by-year exploration as the museum continues to grow.
              </p>
            </div>

            <div style={resultsHeroImageWrap}>
              <img
                src="/images/results-hero.jpg"
                alt="Vintage race results archive"
                style={resultsHeroImage}
              />

              <div style={resultsStatsOverlay}>
                <div>363,466+ Results</div>
                <div>153,344+ Events</div>
                <div>233+ Tracks</div>
                <div>24,090+ Drivers</div>
              </div>
            </div>
          </div>

          <section style={resultsBrowseWrap}>
            <div style={resultsBrowseHeader}>Explore Results</div>

            <div style={resultsBrowseGrid}>
              <Link href="/tracks" style={resultsBrowseCard}>
                <div style={resultsBrowseCardInner}>
                  <div style={resultsBrowseTitle}>Browse by Track</div>
                  <ul style={resultsBrowseList}>
                    <li>View all race tracks</li>
                    <li>Access full track history</li>
                  </ul>
                  <span style={resultsBrowseButton}>Open</span>
                </div>
              </Link>

              <Link href="/results/year" style={resultsBrowseCard}>
                <div style={resultsBrowseCardInner}>
                  <div style={resultsBrowseTitle}>Browse by Year</div>
                  <ul style={resultsBrowseList}>
                    <li>Explore results by season</li>
                    <li>Jump to individual years</li>
                  </ul>
                  <span style={resultsBrowseButton}>Browse</span>
                </div>
              </Link>

              <a href="#recent-results" style={resultsBrowseCard}>
                <div style={resultsBrowseCardInner}>
                  <div style={resultsBrowseTitle}>Recent Results</div>
                  <ul style={resultsBrowseList}>
                    <li>Latest race results</li>
                    <li>Across all tracks</li>
                  </ul>
                  <span style={resultsBrowseButton}>View</span>
                </div>
              </a>
            </div>
          </section>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={recordsPanel}>
          <div id="recent-results" style={recordsPanelHeader}>
            Recent Results Across All Tracks
          </div>

          <div style={recordsPanelBody}>
            {groupedResults.length > 0 ? (
              groupedResults.map((group: any) => (
                <div key={group.date} style={nightBlock}>
                  <div style={nightHeader}>
                    <Link href={`/results/${group.date}`} style={nightHeaderLink}>
                      {formatDate(group.date)} ({group.races.length} Feature Winners)
                    </Link>
                  </div>

                  {(() => {
                    const tracks = groupByTrack(group.races)
                    const sortedTracks = Object.keys(tracks).sort()

                    return sortedTracks.map((track) => (
                      <div key={track}>
                        <div style={trackHeader}>
                          <Link href={`/tracks/${tracks[track][0].track_slug}`} style={inlineLink}>
                            {track}
                          </Link>
                        </div>

                        {tracks[track]
                          .sort((a, b) => a.class_name.localeCompare(b.class_name))
                          .map((r: any, i: number) => (
                            <div
                              key={`${group.date}-${r.track_slug}-${r.class_name}-${r.driver_name}-${i}`}
                              style={resultRowIndented}
                            >
                              <div style={resultClass}>{r.class_name}</div>

                              <div style={resultValue}>
                                {r.driver_slug ? (
                                  <Link href={`/drivers/${r.driver_slug}`} style={inlineLink}>
                                    {r.driver_name}
                                  </Link>
                                ) : (
                                  r.driver_name
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ))
                  })()}
                </div>
              ))
            ) : (
              <p style={panelText}>No results available yet.</p>
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
  background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const yearGrid: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
}

const yearChip: CSSProperties = {
  display: 'inline-block',
  padding: '10px 16px',
  background: '#7a5827',
  color: '#fff8ea',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
  fontWeight: 700,
  minWidth: '92px',
  textAlign: 'center',
}

const heroInner: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '40px 20px 36px',
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
  fontSize: '44px',
  margin: '0 0 12px',
  color: '#3d2b16',
  lineHeight: 1.05,
}

const pageIntro: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1.7,
  maxWidth: '720px',
  margin: 0,
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '36px 20px 40px',
  display: 'grid',
  gap: '28px',
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

const resultRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '10px 0',
  borderBottom: '1px solid #ccb48a',
}

const resultLeft: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const heroTopGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '42px',
  alignItems: 'center',
  marginBottom: '34px',
}

const resultsHeroImageWrap: CSSProperties = {
  position: 'relative',
  marginTop: '14px',
  border: '2px solid #b29364',
  background: '#d8c29a',
  overflow: 'hidden',
  boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
}

const resultsHeroImage: CSSProperties = {
  width: '100%',
  height: '300px',
  display: 'block',
  objectFit: 'cover',
  objectPosition: 'center 42%',
  filter: 'sepia(35%) contrast(92%) brightness(92%)',
}

const resultsStatsOverlay: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'space-around',
  gap: '12px',
  padding: '12px 14px',
  background: 'rgba(61, 43, 22, 0.82)',
  color: '#f3e7d1',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.4px',
  borderTop: '1px solid #b29364',
}

const trackHeader: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  marginTop: '16px',
  marginBottom: '6px',
  color: '#3d2b16',
}

const nightHeaderLink: CSSProperties = {
  color: '#3d2b16',
  textDecoration: 'none',
  fontWeight: 700,
}

const resultTrack: CSSProperties = {
  color: '#5a3a1b',
  fontWeight: 700,
}

const resultRowIndented: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '8px 0',
  borderBottom: '1px solid #ccb48a',
  marginLeft: '16px', // 👈 indent
}

const resultClass: CSSProperties = {
  color: '#6f5733',
  fontSize: '15px',
}

const resultValue: CSSProperties = {
  fontWeight: 700,
  textAlign: 'right',
}

const inlineLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const resultsBrowseWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '20px auto 0',
  padding: '18px',
  background: '#ddc8a2',
  border: '2px solid #b29364',
}

const resultsBrowseHeader: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  marginBottom: '14px',
  color: '#5b3a1b',
}

const resultsBrowseGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '16px',
}

const resultsBrowseCard: CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
}

const resultsBrowseCardDisabled: CSSProperties = {
  opacity: 0.6,
}

const resultsBrowseCardInner: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '16px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const resultsBrowseTitle: CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  marginBottom: '10px',
}

const resultsBrowseList: CSSProperties = {
  margin: '0 0 12px 18px',
  padding: 0,
  lineHeight: 1.5,
  fontSize: '15px',
}

const resultsBrowseButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '8px 12px',
  border: '1px solid #5d3f17',
  marginTop: 'auto',
}

const resultsBrowseButtonDisabled: CSSProperties = {
  display: 'inline-block',
  background: '#b8a274',
  color: '#fff8ea',
  padding: '8px 12px',
  border: '1px solid #8f7a52',
  marginTop: 'auto',
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: 0,
}
const resultsNav: CSSProperties = {
  marginTop: '6px',
  marginBottom: '16px',
  fontSize: '16px',
  color: '#5a3a1b',
}