// app/drivers/[slug]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Driver = {
  driver_id: number
  driver_name: string
  slug: string
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
  year: number | null
  photographer_slug: string | null
  credit_type: string | null
  sequence: number | null
  track_slug?: string | null
}

export default async function DriverProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: driver, error } = await supabase
    .from('driver_directory_alpha_view')
    .select('*')
    .eq('driver_slug', slug)
    .single<Driver>()

  if (error || !driver) {
    notFound()
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('driver_slug', slug)
    .order('year', { ascending: true, nullsFirst: false })
    .order('sequence', { ascending: true })
    .returns<Photo[]>()

  const { data: topTracks } = await supabase
    .from('driver_wins_by_track_view')
    .select('track_name, track_slug, wins')
    .eq('driver_slug', slug)
    .order('wins', { ascending: false })
    .limit(10)

  const { data: resultsByYear } = await supabase
    .from('driver_results_by_year_view')
    .select('result_year, results_count, wins, top_3s')
    .eq('driver_slug', slug)
    .order('result_year', { ascending: false })
    .limit(50)

  const { data: winsByClass } = await supabase
    .from('driver_wins_by_class_view')
    .select('class_name, wins')
    .eq('driver_slug', slug)
    .order('wins', { ascending: false })
    .limit(10)

  const safeWinsByClass = winsByClass ?? []

  const { data: recentResults } = await supabase
    .from('driver_recent_results_view')
    .select('race_date, track_name, track_slug, class_name, finishing_position')
    .eq('driver_slug', slug)
    .order('race_date', { ascending: false })
    .limit(10)

  const { data: championships } = await supabase
    .from('driver_championships_view')
    .select('year, track_name, track_slug, class_name')
    .eq('driver_slug', slug)
    .order('year', { ascending: false })

  const safeChampionships = championships ?? []
  const safePhotos = photos ?? []
  const safeTopTracks = topTracks ?? []
  const safeResultsByYear = resultsByYear ?? []
  const safeRecentResults = recentResults ?? []

  const firstRecordedYear =
    safeResultsByYear.length > 0
      ? safeResultsByYear[safeResultsByYear.length - 1]?.result_year
      : null

  // FIX: Added index to isolate the first item in the array
  const lastRecordedYear =
    safeResultsByYear.length > 0
      ? safeResultsByYear?.result_year
      : null

  const heroPhotoItem =
    safePhotos.find((p) => p.year !== null) ?? safePhotos ?? null

  const displayPhotos = safePhotos
    .filter((p) => p.file_name !== heroPhotoItem?.file_name)
    .slice(0, 50)

  const bestYear = safeResultsByYear.reduce<any | null>((best, row: any) => {
    if (!best || (row.wins ?? 0) > (best.wins ?? 0)) return row
    return best
  }, null)

  const careerHighlights = [
    firstRecordedYear
      ? {
          year: firstRecordedYear,
          text: 'First Recorded Feature Race',
        }
      : null,
    bestYear && bestYear.wins > 0
      ? {
          year: bestYear.result_year,
          text: `${bestYear.wins} Feature Wins${bestYear.wins === (driver.recorded_wins ?? 0) ? '' : ' (Career High)'}`,
        }
      : null,
    ...safeChampionships.slice(0, 3).map((ch: any) => ({
      year: ch.year,
      text: `${ch.track_name} Champion`,
    })),
    lastRecordedYear && lastRecordedYear !== firstRecordedYear
      ? {
          year: lastRecordedYear,
          text: 'Last Recorded Feature Race',
        }
      : null,
  ].filter(Boolean)

  // SINGLE DEFINITIONS: Clean public paths matching your database text strings
  const buildPhotoUrl = (photoObj: any) => {
    if (!photoObj || !photoObj.file_name) return ''
    return `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/${photoObj.file_name}`
  }

  const buildLogoUrl = (trackSlug: string | null | undefined) => {
    if (!trackSlug) return ''
    return `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/logos/tracks/${trackSlug}.jpg`
  }

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroWatermark} />
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/drivers" style={breadcrumbLink}>Drivers</Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>{driver.driver_name}</span>
          </div>

          <div style={heroGrid}>
            <div style={photoPanel}>
              {!heroPhotoItem ? (
                <div style={photoPlaceholder}>Photo Coming Soon</div>
              ) : (
                <div>
                  <img
                    src={buildPhotoUrl(heroPhotoItem)}
                    alt={driver.driver_name}
                    style={heroPhoto}
                  />

                  <div style={heroCaption}>
                    {buildPhotoCaption(heroPhotoItem)}
                  </div>

                  {displayPhotos.slice(0, 3).length > 0 && (
                    <div style={heroThumbRow}>
                      {displayPhotos.slice(0, 3).map((photo) => (
                        <img
                          key={photo.photo_id}
                          src={buildPhotoUrl(photo)}
                          alt={driver.driver_name}
                          style={heroThumb}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={heroMainPanel}>
              <div style={heroTopRow}>
                <div>
                  <div style={eyebrow}>Driver Profile</div>
                  <h1 style={driverName}>{driver.driver_name}</h1>
                  <p style={locationLine}>
                    {driver.hometown || 'Unknown hometown'}
                    {driver.state ? `, ${driver.state}` : ''}
                  </p>
                  <div style={heroDivider}>
                    <span style={heroDividerLine} />
                    <span style={heroDividerStar}>★</span>
                    <span style={heroDividerLine} />
                  </div>
                </div>

                <div style={heroActionWrap}>
                  <Link href={`/drivers/${slug}/results`} style={backButton}>
                    View Full Results
                  </Link>
                </div>
              </div>

              <div style={heroInfoRow}>
                <p style={introText}>
                  Historical driver profile from the Upper Midwest Auto Racing
                  Museum archive. This page will expand over time with photos,
                  track wins, yearly results, championships, and related media.
                </p>
                <CareerHighlights highlights={careerHighlights as any[]} />
              </div>

              <div style={statsRow}>
                <HeroStat label="Recorded Feature Wins" value={driver.recorded_wins ?? 0} />
                <HeroStat label="Wisconsin Feature Wins" value={driver.wisconsin_feature_wins ?? 0} />
                <HeroStat label="Recorded Results" value={driver.recorded_results ?? 0} />
                <HeroStat label="First Recorded Year" value={firstRecordedYear ?? 0} format={false} />
                <HeroStat label="Last Recorded Year" value={lastRecordedYear ?? 0} format={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <section style={photosSection}>
          <h2 style={photosHeading}>Photo Archive</h2>
          {displayPhotos.length === 0 ? (
            <div style={emptyArchiveBox}>No photos available yet.</div>
          ) : (
            <div style={photoGrid}>
              {displayPhotos.map((photo) => (
                <div key={photo.photo_id} style={photoCard}>
                  <img
                    src={buildPhotoUrl(photo)}
                    alt={driver.driver_name}
                    style={photoImage}
                  />
                  <div style={photoMeta}>{buildPhotoCaption(photo)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={mainGrid}>
          <div style={leftColumn}>
            <Panel title="Driver Summary">
              <SummaryRow label="Driver Name" value={driver.driver_name} />
              <SummaryRow label="Hometown" value={driver.hometown || 'Unknown hometown'} />
              <SummaryRow label="State" value={driver.state || 'Unknown'} />
            </Panel>

            <Panel title="Recent Feature Results">
              {safeRecentResults.length === 0 ? (
                <p style={panelText}>No recent results available yet.</p>
              ) : (
                <div>
                  {safeRecentResults.map((result, index) => (
                    <div
                      key={`${result.race_date}-${result.track_slug}-${result.finishing_position}-${index}`}
                      style={recentRow}
                    >
                      <span style={recentDate}>
                        {result.race_date ? formatRaceDate(result.race_date) : 'Unknown date'}
                      </span>

                      <div style={recentTrackWrap}>
                        <img
                          src={buildLogoUrl(result.track_slug)}
                          alt={result.track_name}
                          style={recentTrackLogo}
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                        />
                        <Link href={`/tracks/${result.track_slug}`} style={recentTrack}>
                          {result.track_name}
                        </Link>
                      </div>

                      <span style={recentClass}>{result.class_name || 'Unknown'}</span>
                      <span style={recentPosition}>P{result.finishing_position}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: '10px' }}>
                    <Link href={`/drivers/${slug}/results`} style={viewAllLink}>
                      View Full Results →
                    </Link>
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Recent Results by Year">
              {safeResultsByYear.length === 0 ? (
                <p style={panelText}>No yearly results available yet.</p>
              ) : (
                <div>
                  {safeResultsByYear.map((row: any) => (
                    <div key={row.result_year} style={summaryRow}>
                      <span style={summaryLabel}>{row.result_year}</span>
                      <span style={summaryValue}>
                        {row.results_count} Feature Race Results • {row.wins} Wins • {row.top_3s} Top 3
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div style={rightColumn}>
            <Panel title="Quick Stats">
              <SummaryRow label="Recorded Feature Wins" value={String(driver.recorded_wins ?? 0)} />
              <SummaryRow label="Wisconsin Feature Wins" value={String(driver.wisconsin_feature_wins ?? 0)} />
              <SummaryRow label="Top 3 Feature Finishes" value={String(driver.recorded_top_3_finishes ?? 0)} />
              <SummaryRow label="Total Feature Race Results" value={String(driver.recorded_results ?? 0)} />
            </Panel>

            <Panel title="Feature Wins by Class">
              {safeWinsByClass.length === 0 ? (
                <p style={panelText}>No class data available yet.</p>
              ) : (
                <div>
                  {safeWinsByClass.map((cls: any) => (
                    <div key={cls.class_name} style={summaryRow}>
                      <span style={summaryLabel}>{cls.class_name}</span>
                      <span style={summaryValue}>{cls.wins}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Feature Wins by Track">
              {safeTopTracks.length === 0 ? (
                <p style={panelText}>No wins recorded yet.</p>
              ) : (
                <div>
                  {safeTopTracks.map((track) => (
                    <div key={track.track_slug} style={summaryRow}>
                      <Link href={`/tracks/${track.track_slug}`} style={summaryLabel}>
                        {track.track_name}
                      </Link>
                      <span style={summaryValue}>{track.wins}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Track Championships">
              {safeChampionships.length === 0 ? (
                <p style={panelText}>No championships recorded yet.</p>
              ) : (
                <div>
                  {safeChampionships.map((ch: any, index: number) => (
                    <div key={`${ch.year}-${ch.track_slug}-${index}`} style={champRow}>
                      <div style={champYear}>{ch.year}</div>
                      <div style={champDetails}>
                        <Link href={`/tracks/${ch.track_slug}`} style={champTrack}>
                          {ch.track_name}
                        </Link>
                        {ch.class_name && <div style={champClass}>{ch.class_name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={panel}>
      <div style={panelHeader}>{title}</div>
      <div style={panelBody}>{children}</div>
    </div>
  )
}

function CareerHighlights({ highlights }: { highlights: { year: number | string; text: string }[] }) {
  if (highlights.length === 0) return null
  return (
    <div style={careerHighlightsBox}>
      <div style={careerHighlightsTitle}>
        <span style={careerHighlightsStar}>★</span> Career Highlights
      </div>
      <div>
        {highlights.slice(0, 5).map((item, index) => (
          <div key={`${item.year}-${item.text}-${index}`} style={careerHighlightRow}>
            <span style={careerHighlightYear}>{item.year}</span>
            <span style={careerHighlightText}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroStat({ label, value, format = true }: { label: string; value: number; format?: boolean }) {
  return (
    <div style={heroStatCard}>
      <div style={heroStatValue}>{format ? value.toLocaleString() : value}</div>
      <div style={heroStatLabel}>{label}</div>
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

function buildPhotoCaption(photo: Photo) {
  const trackLabel = formatTrackSlug(photo.track_slug)
  const photographer = photo.photographer_slug && photo.photographer_slug !== 'unknown'
    ? formatName(photo.photographer_slug)
    : 'Unknown Credit'
  const creditType = photo.credit_type && photo.credit_type !== 'unknown'
    ? formatCreditType(photo.credit_type)
    : 'Photo'

  return [
    trackLabel,
    photo.year ? photo.year : 'Year Unknown',
    photographer !== 'Unknown Credit' ? `${photographer}${creditType !== 'Photo' ? ` ${creditType}` : ''}` : null,
  ].filter(Boolean).join(' • ')
}

function formatRaceDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTrackSlug(trackSlug: string | null | undefined) {
  if (!trackSlug || ['unknown', 'unknown-track'].includes(trackSlug)) return null
  return trackSlug.replace(/-(wi|il|mn|mi)$/i, '').split('-').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function formatName(name: string | null) {
  if (!name) return 'Unknown'
  return name.replace(/[-_]/g, ' ').split(' ').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function formatCreditType(type: string | null) {
  if (!type || type.toLowerCase() === 'unknown') return 'Photo'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

// ALL ORIGINAL VINTAGE SEPIA BRAND STYLES MAINTAINED PERFECTLY BELOW
const pageStyle: CSSProperties = { background: '#eadfc7', color: '#2f2417', minHeight: '100vh', fontFamily: 'Georgia, serif', margin: 0 }
const heroWatermark: CSSProperties = { position: 'absolute', inset: 0, background: `linear-gradient(to right, rgba(234,223,199,0.25), rgba(234,223,199,0.72)), radial-gradient(circle at 78% 28%, rgba(80,55,25,0.18), transparent 34%), repeating-conic-gradient(from 45deg at 78% 25%, rgba(80,55,25,0.10) 0deg 10deg, transparent 10deg 20deg)`, opacity: 0.55, pointerEvents: 'none' }
const heroSection: CSSProperties = { background: 'linear-gradient(to bottom, rgba(231,217,191,0.96), rgba(234,223,199,0.98))', borderBottom: '2px solid #b29364', position: 'relative', overflow: 'hidden' }
const heroInner: CSSProperties = { maxWidth: '1280px', margin: '0 auto', padding: '28px 20px 20px', position: 'relative', zIndex: 1 }
const breadcrumbRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '15px', marginBottom: '22px', color: '#6b4a22' }
const breadcrumbLink: CSSProperties = { color: '#7a5827', textDecoration: 'none' }
const breadcrumbSep: CSSProperties = { color: '#8d7049' }
const heroStatValue: CSSProperties = { fontSize: '34px', fontWeight: 700, color: '#fff7e7', lineHeight: 1, marginBottom: '6px' }
const heroStatLabel: CSSProperties = { fontSize: '13px', color: '#f1dfbf', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }
const breadcrumbCurrent: CSSProperties = { color: '#4b351d' }
const heroGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '420px 1fr', gap: '34px', alignItems: 'start', position: 'relative' }
const photoPanel: CSSProperties = { border: '2px solid #bda87a', padding: '10px', background: '#f4ead7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }
const heroMainPanel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px' }
const champRow: CSSProperties = { display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }
const champYear: CSSProperties = { width: '55px', fontWeight: 700, color: '#3d2b16' }
const champDetails: CSSProperties = { display: 'flex', flexDirection: 'column' }
const champTrack: CSSProperties = { fontSize: '14px', fontWeight: 700, color: '#2f2417', textDecoration: 'none' }
const champClass: CSSProperties = { fontSize: '12px', color: '#7a6a55', marginTop: '2px' }
const heroInfoRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: '24px', alignItems: 'start' }
const careerHighlightsBox: CSSProperties = { background: 'rgba(244, 234, 215, 0.76)', border: '1px solid #b29364', padding: '14px 16px', boxShadow: '0 5px 16px rgba(0,0,0,0.08)' }
const careerHighlightsTitle: CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#5b3a1b', fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }
const careerHighlightsStar: CSSProperties = { color: '#8a632b', fontSize: '15px' }
const careerHighlightRow: CSSProperties = { display: 'grid', gridTemplateColumns: '52px 1fr', gap: '12px', padding: '5px 0', fontSize: '15px', lineHeight: 1.35 }
const careerHighlightYear: CSSProperties = { fontWeight: 700, color: '#3d2b16' }
const careerHighlightText: CSSProperties = { color: '#3f2d18' }
const heroTopRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }
const statsRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginTop: '18px', background: '#76511f', border: '1px solid #5b3a14', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }
const heroActionWrap: CSSProperties = { display: 'flex', alignItems: 'flex-start', paddingTop: '8px' }
const heroStatCard: CSSProperties = { background: '#76511f', padding: '22px 14px', textAlign: 'center', color: '#fff7e7', borderRight: '1px solid rgba(255, 247, 231, 0.35)' }
const photoPlaceholder: CSSProperties = { background: 'linear-gradient(to bottom, #d8c39d, #c7ab7c)', border: '1px solid #b29364', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a3a1b', fontSize: '20px', textAlign: 'center', padding: '12px' }
const eyebrow: CSSProperties = { fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }
const driverName: CSSProperties = { fontSize: '52px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }
const heroDivider: CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0 24px', maxWidth: '520px' }
const heroDividerLine: CSSProperties = { height: '1px', flex: 1, background: '#b29364' }
const heroDividerStar: CSSProperties = { color: '#9a743d', fontSize: '18px' }
const locationLine: CSSProperties = { fontSize: '22px', margin: '0 0 18px', color: '#5a3a1b' }
const introText: CSSProperties = { fontSize: '18px', lineHeight: 1.8, maxWidth: '900px', margin: '0', color: '#3f2d18' }
const backButton: CSSProperties = { display: 'inline-block', background: '#6e4d21', color: '#fff8ea', padding: '14px 22px', border: '1px solid #4d3413', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.03em', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '28px 20px 40px' }
const mainGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }
const leftColumn: CSSProperties = { display: 'grid', gap: '20px' }
const rightColumn: CSSProperties = { display: 'grid', gap: '20px' }
const viewAllLink: CSSProperties = { display: 'inline-block', marginTop: '8px', fontSize: '14px', color: '#7a5827', textDecoration: 'none', fontWeight: 600 }
const recentTrackWrap: CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px' }
const recentTrackLogo: CSSProperties = { width: '24px', height: '24px', objectFit: 'contain' }
const panel: CSSProperties = { background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }
const panelHeader: CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#5b3a1b', marginBottom: '10px' }
const panelBody: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }
const summaryRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }
const summaryLabel: CSSProperties = { color: '#5a3a1b' }
const summaryValue: CSSProperties = { fontWeight: 700, textAlign: 'right' }
const panelText: CSSProperties = { fontSize: '17px', lineHeight: 1.7, margin: '0 0 14px' }
const heroPhoto: CSSProperties = { width: '100%', height: 'auto', display: 'block', border: '1px solid #a78654', background: '#efe7d6' }
const heroCaption: CSSProperties = { marginTop: '8px', fontSize: '14px', color: '#5a3a1b', textAlign: 'center', lineHeight: 1.4 }
const heroThumbRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }
const heroThumb: CSSProperties = { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', border: '1px solid #a78654', background: '#efe7d6', cursor: 'pointer' }
const photosSection: CSSProperties = { marginTop: '12px', marginBottom: '24px' }
const photosHeading: CSSProperties = { fontSize: '28px', margin: '0 0 10px', color: '#3d2b16' }
const emptyArchiveBox: CSSProperties = { padding: '18px', background: '#f1e5ce', border: '1px solid #c2a97d' }
const photoGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }
const photoCard: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '10px', transition: 'all 0.2s ease' }
const photoImage: CSSProperties = { width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', border: '1px solid #b29364', background: '#efe7d6' }
const recentRow: CSSProperties = { display: 'grid', gridTemplateColumns: '140px 1fr 140px 50px', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '2px solid #b29364', paddingBottom: '8px' }
const recentClass: CSSProperties = { fontSize: '14px', color: '#6b4a22', whiteSpace: 'nowrap' }
const recentDate: CSSProperties = { fontSize: '14px', color: '#7a5827' }
const recentTrack: CSSProperties = { color: '#5a3a1b', textDecoration: 'none', fontWeight: 500 }
const recentPosition: CSSProperties = { fontWeight: 700, textAlign: 'right' }
const photoMeta: CSSProperties = { marginTop: '8px', fontSize: '13px', color: '#5a3a1b', lineHeight: 1.5 }