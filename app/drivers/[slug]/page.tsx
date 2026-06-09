// app/drivers/[slug]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
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
  year: string | number | null
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

const flatResultsByYear = Array.isArray(safeResultsByYear) 
    ? (safeResultsByYear as any[])
    : safeResultsByYear;

  const lastRecordedYear =
    flatResultsByYear.length > 0
      ? parseInt(String(flatResultsByYear[0]?.result_year || 0), 10)
      : null

  const firstRecordedYear =
    flatResultsByYear.length > 0
      ? parseInt(String(flatResultsByYear[flatResultsByYear.length - 1]?.result_year || 0), 10)
      : null

  const heroPhotoItem =
  safePhotos.find((p) => p.year !== null && p.year !== 'unknown-year') ?? 
  (safePhotos.length > 0 ? safePhotos : null);

  const displayPhotos = safePhotos
    .filter((p) => p.file_name !== heroPhotoItem?.file_name)
    .slice(0, 50)

  const bestYear = flatResultsByYear.reduce<any | null>((best, row: any) => {
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

  const buildPhotoUrl = (photoObj: any) => {
    if (!photoObj) return ''
    let rawFileName = photoObj.file_name || ''
    if (!rawFileName && photoObj.driver_slug) {
      rawFileName = `${photoObj.driver_slug}.jpg`
    }
    if (!rawFileName) return ''

    if (!rawFileName.toLowerCase().endsWith('.jpg') && !rawFileName.toLowerCase().endsWith('.png')) {
      rawFileName = `${rawFileName}.jpg`
    }

    return `/photos/${rawFileName}`
  }

  const buildLogoUrl = (trackSlug: string | null | undefined) => {
    if (!trackSlug) return ''
    return `/photos/logos/tracks/${trackSlug}.jpg`
  }

  return (
    <main style={{ background: '#eadfc7', color: '#2f2417', minHeight: '100vh', fontFamily: 'Georgia, serif', margin: 0 }}>
      <section style={{ background: 'linear-gradient(to bottom, rgba(231,217,191,0.96), rgba(234,223,199,0.98))', borderBottom: '2px solid #b29364', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, rgba(234,223,199,0.25), rgba(234,223,199,0.72)), radial-gradient(circle at 78% 28%, rgba(80,55,25,0.18), transparent 34%), repeating-conic-gradient(from 45deg at 78% 25%, rgba(80,55,25,0.10) 0deg 10deg, transparent 10deg 20deg)`, opacity: 0.55, pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 20px 20px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '15px', marginBottom: '22px', color: '#6b4a22' }}>
            <Link href="/" style={{ color: '#7a5827', textDecoration: 'none' }}>Home</Link>
            <span style={{ color: '#8d7049' }}>/</span>
            <Link href="/drivers" style={{ color: '#7a5827', textDecoration: 'none' }}>Drivers</Link>
            <span style={{ color: '#8d7049' }}>/</span>
            <span style={{ color: '#4b351d' }}>{driver.driver_name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '34px', alignItems: 'start', position: 'relative' }}>
            <div style={{ border: '2px solid #bda87a', padding: '10px', background: '#f4ead7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              {!heroPhotoItem || !heroPhotoItem.file_name ? (
                <div style={{ background: 'linear-gradient(to bottom, #d8c39d, #c7ab7c)', border: '1px solid #b29364', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a3a1b', fontSize: '20px', textAlign: 'center', padding: '12px', fontWeight: 'bold' }}>Photo Coming Soon</div>
              ) : (
                <div>
                  {/* Clean standard server-rendered fallback mechanism */}
                  <img
                    src={buildPhotoUrl(heroPhotoItem)}
                    alt={driver.driver_name}
                    style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid #a78654', background: '#efe7d6' }}
                  />

                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#5a3a1b', textAlign: 'center', lineHeight: 1.4 }}>
                    {buildPhotoCaption(heroPhotoItem)}
                  </div>

                  {displayPhotos.slice(0, 3).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                      {displayPhotos.slice(0, 3).map((photo) => (
                        <img
                          key={photo.photo_id}
                          src={buildPhotoUrl(photo)}
                          alt={driver.driver_name}
                          style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', border: '1px solid #a78654', background: '#efe7d6' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }}>Driver Profile</div>
                  <h1 style={{ fontSize: '52px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }}>{driver.driver_name}</h1>
                  <p style={{ fontSize: '22px', margin: '0 0 18px', color: '#5a3a1b' }}>
                    {driver.hometown || 'Unknown hometown'}
                    {driver.state ? `, ${driver.state}` : ''}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0 24px', maxWidth: '520px' }}>
                    <span style={{ height: '1px', flex: 1, background: '#b29364' }} />
                    <span style={{ color: '#9a743d', fontSize: '18px' }}>★</span>
                    <span style={{ height: '1px', flex: 1, background: '#b29364' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '8px' }}>
                  <Link href={`/drivers/${slug}/results`} style={{ display: 'inline-block', background: '#6e4d21', color: '#fff8ea', padding: '14px 22px', border: '1px solid #4d3413', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.03em', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                    View Full Results
                  </Link>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: '24px', alignItems: 'start' }}>
                <p style={{ fontSize: '18px', lineHeight: 1.8, maxWidth: '900px', margin: '0', color: '#3f2d18' }}>
                  Historical driver profile from the Upper Midwest Auto Racing
                  Museum archive. This page will expand over time with photos,
                  track wins, yearly results, championships, and related media.
                </p>
                <CareerHighlights highlights={careerHighlights as any[]} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginTop: '18px', background: '#76511f', border: '1px solid #5b3a14', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
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

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 20px 40px' }}>
        <section style={{ marginTop: '12px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', margin: '0 0 10px', color: '#3d2b16' }}>Photo Archive</h2>
          {displayPhotos.length === 0 ? (
            <div style={{ padding: '18px', background: '#f1e5ce', border: '1px solid #c2a97d' }}>No photos available yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {displayPhotos.map((photo) => (
                <div key={photo.photo_id} style={{ background: '#f1e5ce', border: '1px solid #c2a97d', padding: '10px', transition: 'all 0.2s ease' }}>
                  <img
                    src={buildPhotoUrl(photo)}
                    alt={driver.driver_name}
                    style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', border: '1px solid #b29364', background: '#efe7d6' }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#5a3a1b', lineHeight: 1.5 }}>{buildPhotoCaption(photo)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <Panel title="Driver Summary">
              <SummaryRow label="Driver Name" value={driver.driver_name} />
              <SummaryRow label="Hometown" value={driver.hometown || 'Unknown hometown'} />
              <SummaryRow label="State" value={driver.state || 'Unknown'} />
            </Panel>

            <Panel title="Recent Feature Results">
              {safeRecentResults.length === 0 ? (
                <p style={{ fontSize: '17px', lineHeight: 1.7, margin: '0 0 14px' }}>No recent results available yet.</p>
              ) : (
                <div>
                  {safeRecentResults.map((result, index) => (
                    <div
                      key={`${result.race_date}-${result.track_slug}-${result.finishing_position}-${index}`}
                      style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 50px', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '2px solid #b29364', paddingBottom: '8px' }}
                    >
                      <span style={{ fontSize: '14px', color: '#7a5827' }}>
                        {result.race_date ? formatRaceDate(result.race_date) : 'Unknown date'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {result.track_slug && (
                          <img
                            src={buildLogoUrl(result.track_slug)}
                            alt={result.track_name}
                            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                          />
                        )}
                        <Link href={`/tracks/${result.track_slug}`} style={{ color: '#5a3a1b', textDecoration: 'none', fontWeight: 500 }}>
                          {result.track_name}
                        </Link>
                      </div>

                      <span style={{ fontSize: '14px', color: '#6b4a22', whiteSpace: 'nowrap' }}>{result.class_name || 'Unknown'}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>P{result.finishing_position}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: '10px' }}>
                    <Link href={`/drivers/${slug}/results`} style={{ display: 'inline-block', marginTop: '8px', fontSize: '14px', color: '#7a5827', textDecoration: 'none', fontWeight: 600 }}>
                      View Full Results →
                    </Link>
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Recent Results by Year">
              {flatResultsByYear.length === 0 ? (
                <p style={{ fontSize: '17px', lineHeight: 1.7, margin: '0 0 14px' }}>No yearly results available yet.</p>
              ) : (
                <div>
                  {flatResultsByYear.map((row: any) => (
                    <div key={row.result_year} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }}>
                      <span style={{ color: '#5a3a1b' }}>{row.result_year}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>
                        {row.results_count} Feature Race Results • {row.wins} Wins • {row.top_3s} Top 3
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <Panel title="Quick Stats">
              <SummaryRow label="Recorded Feature Wins" value={String(driver.recorded_wins ?? 0)} />
              <SummaryRow label="Wisconsin Feature Wins" value={String(driver.wisconsin_feature_wins ?? 0)} />
              <SummaryRow label="Top 3 Feature Finishes" value={String(driver.recorded_top_3_finishes ?? 0)} />
              <SummaryRow label="Total Feature Race Results" value={String(driver.recorded_results ?? 0)} />
            </Panel>

            <Panel title="Feature Wins by Class">
              {safeWinsByClass.length === 0 ? (
                <p style={{ fontSize: '17px', lineHeight: 1.7, margin: '0 0 14px' }}>No class data available yet.</p>
              ) : (
                <div>
                  {safeWinsByClass.map((cls: any) => (
                    <div key={cls.class_name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }}>
                      <span style={{ color: '#5a3a1b' }}>{cls.class_name}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>{cls.wins}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Feature Wins by Track">
              {safeTopTracks.length === 0 ? (
                <p style={{ fontSize: '17px', lineHeight: 1.7, margin: '0 0 14px' }}>No wins recorded yet.</p>
              ) : (
                <div>
                  {safeTopTracks.map((track) => (
                    <div key={track.track_slug} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }}>
                      <Link href={`/tracks/${track.track_slug}`} style={{ color: '#5a3a1b' }}>
                        {track.track_name}
                      </Link>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>{track.wins}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Track Championships">
              {safeChampionships.length === 0 ? (
                <p style={{ fontSize: '17px', lineHeight: 1.7, margin: '0 0 14px' }}>No championships recorded yet.</p>
              ) : (
                <div>
                  {safeChampionships.map((ch: any, index: number) => (
                    <div key={`${ch.year}-${ch.track_slug}-${index}`} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }}>
                      <div style={{ width: '55px', fontWeight: 700, color: '#3d2b16' }}>{ch.year}</div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link href={`/tracks/${ch.track_slug}`} style={{ fontSize: '14px', fontWeight: 700, color: '#2f2417', textDecoration: 'none' }}>
                          {ch.track_name}
                        </Link>
                        {ch.class_name && <div style={{ fontSize: '12px', color: '#7a6a55', marginTop: '2px' }}>{ch.class_name}</div>}
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
    <div style={{ background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color: '#5b3a1b', marginBottom: '10px' }}>{title}</div>
      <div style={{ background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }}>{children}</div>
    </div>
  )
}

function CareerHighlights({ highlights }: { highlights: { year: number | string; text: string }[] }) {
  if (highlights.length === 0) return null
  return (
    <div style={{ background: 'rgba(244, 234, 215, 0.76)', border: '1px solid #b29364', padding: '14px 16px', boxShadow: '0 5px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#5b3a1b', fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span style={{ color: '#8a632b', fontSize: '15px' }}>★</span> Career Highlights
      </div>
      <div>
        {highlights.slice(0, 5).map((item, index) => (
          <div key={`${item.year}-${item.text}-${index}`} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: '12px', padding: '5px 0', fontSize: '15px', lineHeight: 1.35 }}>
            <span style={{ fontWeight: 700, color: '#3d2b16' }}>{item.year}</span>
            <span style={{ color: '#3f2d18' }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroStat({ label, value, format = true }: { label: string; value: number; format?: boolean }) {
  return (
    <div style={{ background: '#76511f', padding: '22px 14px', textAlign: 'center', color: '#fff7e7', borderRight: '1px solid rgba(255, 247, 231, 0.35)' }}>
      <div style={{ fontSize: '34px', fontWeight: 700, color: '#fff7e7', lineHeight: 1, marginBottom: '6px' }}>{format ? value.toLocaleString() : value}</div>
      <div style={{ fontSize: '13px', color: '#f1dfbf', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }}>
      <span style={{ color: '#5a3a1b' }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{value}</span>
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
    photo.year && photo.year !== 'unknown-year' ? photo.year : 'Year Unknown',
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