// app/drivers/[slug]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  DriverCareerAccomplishments,
  getDriverCareerProfile,
} from '@/components/DriverCareerAccomplishments'
import PhotoLightboxImage from '@/components/PhotoLightboxImage'

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

export const revalidate = 3600

const SUPABASE_PHOTO_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master'

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

  if (error || !driver) notFound()

  const [
    { data: photos },
    { data: topTracks },
    { data: resultsByYear },
    { data: winsByClass },
    { data: recentResults },
    { data: championships },
    { data: winRows },
  ] = await Promise.all([
    supabase
      .from('photos')
      .select('photo_id, file_name, year, photographer_slug, credit_type, sequence, track_slug')
      .eq('driver_slug', slug)
      .order('year', { ascending: true, nullsFirst: false })
      .order('sequence', { ascending: true }),
    supabase
      .from('driver_wins_by_track_view')
      .select('track_name, track_slug, wins')
      .eq('driver_slug', slug)
      .order('wins', { ascending: false })
      .limit(10),
    supabase
      .from('driver_results_by_year_view')
      .select('result_year, results_count, wins, top_3s')
      .eq('driver_slug', slug)
      .order('result_year', { ascending: false })
      .limit(50),
    supabase
      .from('driver_wins_by_class_view')
      .select('class_name, wins')
      .eq('driver_slug', slug)
      .order('wins', { ascending: false })
      .limit(10),
    supabase
      .from('driver_recent_results_view')
      .select('race_date, track_name, track_slug, class_name, finishing_position')
      .eq('driver_slug', slug)
      .order('race_date', { ascending: false })
      .limit(10),
    supabase
      .from('driver_championships_view')
      .select('year, track_name, track_slug, class_name')
      .eq('driver_slug', slug)
      .order('year', { ascending: false }),
    supabase
      .from('driver_full_results_view')
      .select('track_slug')
      .eq('driver_slug', slug)
      .eq('finishing_position', 1),
  ])

  const safePhotos = photos ?? []
  const safeTopTracks = topTracks ?? []
  const flatResultsByYear = Array.isArray(resultsByYear ?? []) ? (resultsByYear ?? []) : []
  const safeWinsByClass = winsByClass ?? []
  const safeRecentResults = recentResults ?? []
  const safeChampionships = championships ?? []
  const safeWinRows = winRows ?? []
  const careerProfile = getDriverCareerProfile(slug)

  const winTrackSlugs = Array.from(
    new Set(
      safeWinRows
        .map((row: any) => row.track_slug)
        .filter((value: string | null | undefined): value is string => Boolean(value))
    )
  )

  const { data: trackSurfaceRows } = winTrackSlugs.length
    ? await supabase
        .from('Tracks')
        .select('slug, surface_type')
        .in('slug', winTrackSlugs)
    : { data: [] as any[] }

  const surfaceByTrack = new Map<string, string>()
  for (const row of trackSurfaceRows ?? []) {
    if ((row as any)?.slug) {
      surfaceByTrack.set(String((row as any).slug), String((row as any).surface_type || 'Unknown'))
    }
  }

  let asphaltWins = 0
  let dirtWins = 0
  let mixedOrUnknownWins = 0

  for (const row of safeWinRows as any[]) {
    const surface = surfaceByTrack.get(String(row.track_slug || ''))?.toLowerCase() || 'unknown'
    if (surface.includes('asphalt')) asphaltWins += 1
    else if (surface.includes('dirt')) dirtWins += 1
    else mixedOrUnknownWins += 1
  }

  const lastRecordedYear =
    flatResultsByYear.length > 0
      ? parseInt(String((flatResultsByYear[0] as any)?.result_year || 0), 10)
      : null

  const firstRecordedYear =
    flatResultsByYear.length > 0
      ? parseInt(String((flatResultsByYear[flatResultsByYear.length - 1] as any)?.result_year || 0), 10)
      : null

  const foundHero = safePhotos.find(
    (p) => p.year !== null && String(p.year) !== 'unknown-year'
  )
  const heroPhotoItem: Photo | null = foundHero ?? safePhotos[0] ?? null
  const displayPhotos = safePhotos
    .filter((p) => p.file_name !== heroPhotoItem?.file_name)
    .slice(0, 150)

  const bestYear = flatResultsByYear.reduce<any | null>((best, row: any) => {
    if (!best || (row.wins ?? 0) > (best.wins ?? 0)) return row
    return best
  }, null)

  const careerHighlights = [
    firstRecordedYear ? { year: firstRecordedYear, text: 'First Recorded Feature Race' } : null,
    bestYear && bestYear.wins > 0
      ? { year: bestYear.result_year, text: `${bestYear.wins} Feature Wins (Career High)` }
      : null,
    ...safeChampionships.slice(0, 3).map((ch: any) => ({
      year: ch.year,
      text: `${ch.track_name} Champion`,
    })),
    lastRecordedYear && lastRecordedYear !== firstRecordedYear
      ? { year: lastRecordedYear, text: 'Last Recorded Feature Race' }
      : null,
  ].filter(Boolean)

  const buildPhotoUrl = (photoObj: Photo | null | undefined) => {
    if (!photoObj?.file_name) return ''
    const track = String(photoObj.track_slug || 'unknown-track')
    const year = String(photoObj.year || 'unknown-year')
    return `${SUPABASE_PHOTO_BASE}/${track}/${year}/${encodeURIComponent(String(photoObj.file_name))}`
  }

  const buildLogoUrl = (trackSlug: string | null | undefined) =>
    trackSlug ? `/logos/tracks/${trackSlug}.jpg` : ''

  const museumWins = Math.max(driver.recorded_wins ?? 0, driver.wisconsin_feature_wins ?? 0)
  const knownCareerWinsDisplay = careerProfile ? `${museumWins.toLocaleString()}+` : museumWins.toLocaleString()

  return (
    <main style={{ background: '#eadfc7', color: '#2f2417', minHeight: '100vh', fontFamily: 'Georgia, serif', margin: 0 }}>
      <section style={{ background: 'linear-gradient(to bottom, rgba(231,217,191,0.96), rgba(234,223,199,0.98))', borderBottom: '2px solid #b29364', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(234,223,199,0.25), rgba(234,223,199,0.72)), radial-gradient(circle at 78% 28%, rgba(80,55,25,0.18), transparent 34%)', opacity: 0.55, pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 20px 22px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '15px', marginBottom: '22px', color: '#6b4a22' }}>
            <Link href="/" style={{ color: '#7a5827', textDecoration: 'none' }}>Home</Link>
            <span style={{ color: '#8d7049' }}>/</span>
            <Link href="/drivers" style={{ color: '#7a5827', textDecoration: 'none' }}>Drivers</Link>
            <span style={{ color: '#8d7049' }}>/</span>
            <span style={{ color: '#4b351d' }}>{driver.driver_name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) minmax(0, 1fr)', gap: '34px', alignItems: 'start' }}>
            <div style={{ border: '2px solid #bda87a', padding: '10px', background: '#f4ead7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              {!heroPhotoItem?.file_name ? (
                <div style={{ background: 'linear-gradient(to bottom, #d8c39d, #c7ab7c)', border: '1px solid #b29364', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a3a1b', fontSize: '20px', textAlign: 'center', padding: '12px', fontWeight: 'bold' }}>
                  Photo Coming Soon
                </div>
              ) : (
                <>
                  <PhotoLightboxImage
                    src={buildPhotoUrl(heroPhotoItem)}
                    alt={driver.driver_name}
                    caption={buildPhotoCaption(heroPhotoItem)}
                    imageStyle={{ width: '100%', height: 'auto', display: 'block', border: '1px solid #a78654', background: '#efe7d6' }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#5a3a1b', textAlign: 'center', lineHeight: 1.4 }}>
                    {buildPhotoCaption(heroPhotoItem)}
                  </div>
                  {displayPhotos.slice(0, 3).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                      {displayPhotos.slice(0, 3).map((photo) => (
                        <PhotoLightboxImage
                          key={photo.photo_id}
                          src={buildPhotoUrl(photo)}
                          alt={driver.driver_name}
                          caption={buildPhotoCaption(photo)}
                          imageStyle={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', border: '1px solid #a78654', display: 'block' }}
                          showZoomBadge
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }}>Driver Profile</div>
                  <h1 style={{ fontSize: '52px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }}>{driver.driver_name}</h1>
                  <p style={{ fontSize: '22px', margin: '0 0 18px', color: '#5a3a1b' }}>
                    {driver.hometown || 'Unknown hometown'}{driver.state ? `, ${String(driver.state).trim()}` : ''}
                  </p>
                </div>
                <Link href={`/drivers/${slug}/results`} style={{ display: 'inline-block', background: '#6e4d21', color: '#fff8ea', padding: '14px 22px', border: '1px solid #4d3413', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.03em', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                  View Full Results
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 330px)', gap: '24px', alignItems: 'start' }}>
                <p style={{ fontSize: '18px', lineHeight: 1.8, margin: 0, color: '#3f2d18' }}>
                  {careerProfile?.summary || 'Historical driver profile from the Upper Midwest Auto Racing Museum archive. This page combines museum race records, photographs, championships, and documented career accomplishments.'}
                </p>
                <CareerHighlights highlights={careerHighlights as any[]} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', marginTop: '18px', background: '#76511f', border: '1px solid #5b3a14', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
                <HeroStat label="Wisconsin Feature Wins" value={driver.wisconsin_feature_wins ?? 0} sublabel="Museum leaderboard" />
                <HeroStat label="Museum-Recorded Wins" value={museumWins} sublabel="All museum results" />
                <HeroStat label="Known Career Feature Wins" value={knownCareerWinsDisplay} sublabel={careerProfile ? 'Verified minimum' : 'Museum total'} />
                <HeroStat label="Museum Asphalt Wins" value={asphaltWins} sublabel="Asphalt-classified tracks" />
                <HeroStat label="Museum Dirt Wins" value={dirtWins} sublabel="Dirt-classified tracks" />
                <HeroStat label="Major Championships" value={careerProfile?.headlineChampionships ?? 0} sublabel={careerProfile ? 'Documented career titles' : 'Career layer expanding'} />
                <HeroStat label="Recorded Results" value={driver.recorded_results ?? 0} sublabel="Museum database" />
              </div>
              {mixedOrUnknownWins > 0 && (
                <div style={{ padding: '8px 12px', background: 'rgba(244,234,215,0.78)', border: '1px solid #c9ad7c', fontSize: '11px', lineHeight: 1.45, color: '#6b5437' }}>
                  Surface note: {mixedOrUnknownWins.toLocaleString()} museum-recorded win{mixedOrUnknownWins === 1 ? '' : 's'} occurred at tracks classified as mixed-surface or without a single current surface designation, so they are not forced into the dirt/asphalt split.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '26px 20px 42px' }}>
        <DriverCareerAccomplishments slug={slug} />

        <section style={{ marginBottom: '30px', padding: '5px 0 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '13px' }}>
            <h2 style={{ fontSize: '28px', margin: 0, color: '#3d2b16' }}>Racing Lifetime Totals</h2>
            <span style={{ height: '1px', background: '#b29364', flex: 1 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderTop: '1px solid #c5a572', borderBottom: '1px solid #c5a572' }}>
            <SummaryMetric label="WI Feature Wins" value={driver.wisconsin_feature_wins ?? 0} />
            <SummaryMetric label="Museum-Recorded Wins" value={museumWins} />
            <SummaryMetricText label="Known Career Feature Wins" value={knownCareerWinsDisplay} />
            <SummaryMetric label="Museum Asphalt Wins" value={asphaltWins} />
            <SummaryMetric label="Museum Dirt Wins" value={dirtWins} />
            <SummaryMetric label="Major Championships" value={careerProfile?.headlineChampionships ?? 0} />
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#6a5337', fontStyle: 'italic' }}>
            Known career wins are shown as a verified minimum while outside-area research is still being reconciled against museum race records. Surface totals use each track’s current museum surface classification; mixed-surface tracks are kept separate rather than guessed.
          </p>
        </section>

        <section style={{ marginTop: '8px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '29px', margin: 0, color: '#3d2b16' }}>Photo Archive</h2>
            <span style={{ fontSize: '12px', color: '#765b39', fontStyle: 'italic' }}>Click any photo to enlarge.</span>
          </div>
          {displayPhotos.length === 0 ? (
            <div style={{ padding: '18px', background: '#f1e5ce', border: '1px solid #c2a97d' }}>No photos available yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' }}>
              {displayPhotos.map((photo) => (
                <div key={photo.photo_id} style={{ background: '#f1e5ce', border: '1px solid #c2a97d', padding: '9px' }}>
                  <PhotoLightboxImage
                    src={buildPhotoUrl(photo)}
                    alt={driver.driver_name}
                    caption={buildPhotoCaption(photo)}
                    imageStyle={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', border: '1px solid #b29364' }}
                    showZoomBadge
                  />
                  <div style={{ marginTop: '7px', fontSize: '12px', color: '#5a3a1b', lineHeight: 1.45 }}>{buildPhotoCaption(photo)}</div>
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
              <SummaryRow label="State" value={String(driver.state || 'Unknown').trim()} />
              <SummaryRow label="Museum-Recorded Career" value={`${firstRecordedYear ?? '—'}–${lastRecordedYear ?? '—'}`} />
            </Panel>

            <Panel title="Recent Feature Results">
              {safeRecentResults.length === 0 ? <p>No recent results available yet.</p> : (
                <div>
                  {safeRecentResults.map((result: any, index: number) => (
                    <div key={`${result.race_date}-${result.track_slug}-${index}`} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px 44px', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #ccb48a' }}>
                      <span style={{ fontSize: '13px', color: '#7a5827' }}>{result.race_date ? formatRaceDate(result.race_date) : 'Unknown date'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {result.track_slug && <img src={buildLogoUrl(result.track_slug)} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                        <Link href={`/tracks/${result.track_slug}`} style={{ color: '#5a3a1b', textDecoration: 'none', fontWeight: 600 }}>{result.track_name}</Link>
                      </div>
                      <span style={{ fontSize: '13px', color: '#6b4a22' }}>{result.class_name || 'Unknown'}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>P{result.finishing_position}</span>
                    </div>
                  ))}
                  <Link href={`/drivers/${slug}/results`} style={{ display: 'inline-block', marginTop: '12px', fontSize: '14px', color: '#7a5827', textDecoration: 'none', fontWeight: 700 }}>View Full Results →</Link>
                </div>
              )}
            </Panel>

            <Panel title="Results by Year">
              {flatResultsByYear.length === 0 ? <p>No yearly results available yet.</p> : (
                <div>
                  {flatResultsByYear.map((row: any) => (
                    <div key={row.result_year} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid #ccb48a' }}>
                      <span style={{ color: '#5a3a1b' }}>{row.result_year}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right' }}>{row.results_count} Results • {row.wins} Wins • {row.top_3s} Top 3</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <Panel title="Feature Wins by Class">
              {safeWinsByClass.length === 0 ? <p>No class data available yet.</p> : safeWinsByClass.map((cls: any) => (
                <SummaryRow key={cls.class_name} label={cls.class_name} value={String(cls.wins)} />
              ))}
            </Panel>

            <Panel title="Feature Wins by Track">
              {safeTopTracks.length === 0 ? <p>No wins recorded yet.</p> : safeTopTracks.map((track: any) => (
                <div key={track.track_slug} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #ccb48a' }}>
                  <Link href={`/tracks/${track.track_slug}`} style={{ color: '#5a3a1b' }}>{track.track_name}</Link>
                  <span style={{ fontWeight: 700 }}>{track.wins}</span>
                </div>
              ))}
            </Panel>

            <Panel title="Track Championships">
              {safeChampionships.length === 0 ? <p>No championships recorded yet.</p> : safeChampionships.map((ch: any, index: number) => (
                <div key={`${ch.year}-${ch.track_slug}-${index}`} style={{ display: 'flex', gap: '12px', padding: '9px 0', borderBottom: '1px solid #ccb48a' }}>
                  <div style={{ width: '52px', fontWeight: 700, color: '#3d2b16' }}>{ch.year}</div>
                  <div>
                    <Link href={`/tracks/${ch.track_slug}`} style={{ fontSize: '14px', fontWeight: 700, color: '#2f2417', textDecoration: 'none' }}>{ch.track_name}</Link>
                    {ch.class_name && <div style={{ fontSize: '12px', color: '#7a6a55', marginTop: '2px' }}>{ch.class_name}</div>}
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </div>

        <div style={{ marginTop: '24px', padding: '14px 16px', border: '1px solid #b29364', background: '#efe2c8', fontSize: '13px', lineHeight: 1.6, color: '#5f4930' }}>
          This profile combines verified museum race data with documented career accomplishments from outside the museum’s core geographic reporting area. Existing museum race and series records are referenced rather than duplicated.
        </div>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }}>
      <div style={{ fontSize: '23px', fontWeight: 700, color: '#5b3a1b', marginBottom: '9px' }}>{title}</div>
      <div style={{ background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }}>{children}</div>
    </div>
  )
}

function CareerHighlights({ highlights }: { highlights: { year: number | string; text: string }[] }) {
  if (highlights.length === 0) return null
  return (
    <div style={{ background: 'rgba(244,234,215,0.82)', border: '1px solid #b29364', padding: '14px 16px', boxShadow: '0 5px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ marginBottom: '9px', color: '#5b3a1b', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>★ Career Highlights</div>
      {highlights.slice(0, 5).map((item, index) => (
        <div key={`${item.year}-${item.text}-${index}`} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: '10px', padding: '4px 0', fontSize: '14px', lineHeight: 1.35 }}>
          <span style={{ fontWeight: 700 }}>{item.year}</span><span>{item.text}</span>
        </div>
      ))}
    </div>
  )
}

function HeroStat({ label, value, sublabel }: { label: string; value: number | string; sublabel?: string }) {
  return (
    <div style={{ background: '#76511f', padding: '18px 9px', textAlign: 'center', color: '#fff7e7', borderRight: '1px solid rgba(255,247,231,0.32)' }}>
      <div style={{ fontSize: typeof value === 'number' ? '29px' : '25px', fontWeight: 700, lineHeight: 1, marginBottom: '7px' }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div style={{ fontSize: '11px', color: '#f1dfbf', textTransform: 'uppercase', letterSpacing: '0.045em', lineHeight: 1.35 }}>{label}</div>
      {sublabel && <div style={{ fontSize: '9px', color: '#e4cfaa', marginTop: '5px', lineHeight: 1.25 }}>{sublabel}</div>}
    </div>
  )
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: '14px 14px', borderRight: '1px solid #c5a572' }}>
      <div style={{ fontSize: '27px', fontWeight: 700, color: '#4e3417' }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.055em', color: '#74552f', marginTop: '3px' }}>{label}</div>
    </div>
  )
}

function SummaryMetricText({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 14px', borderRight: '1px solid #c5a572' }}>
      <div style={{ fontSize: '27px', fontWeight: 700, color: '#4e3417' }}>{value}</div>
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.055em', color: '#74552f', marginTop: '3px' }}>{label}</div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid #ccb48a' }}>
      <span style={{ color: '#5a3a1b' }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function buildPhotoCaption(photo: Photo) {
  const trackLabel = formatTrackSlug(photo.track_slug)
  const photographer = photo.photographer_slug && photo.photographer_slug !== 'unknown' ? formatName(photo.photographer_slug) : 'Unknown Credit'
  const creditType = photo.credit_type && photo.credit_type !== 'unknown' ? formatCreditType(photo.credit_type) : 'Photo'
  return [
    trackLabel,
    photo.year && String(photo.year) !== 'unknown-year' ? photo.year : 'Year Unknown',
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
