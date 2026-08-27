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

// Verified outside-area feature wins that are not yet represented by museum event rows.
// This list will grow as the Top 100 career audit is reconciled driver-by-driver.
const DISCOVERED_OUTSIDE_AREA_WINS: Record<string, number> = {
  'kevin-adams': 12,
  'pete-parker': 1,
  'rod-snellenberger': 1,
  'benji-lacrosse': 3,
}

const COVERAGE_STATES = new Set(['WI', 'MN', 'MI', 'IL'])

export default async function DriverProfilePage({ params }: { params: Promise<{ slug: string }> }) {
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
    { data: seriesChampionshipRows },
    { data: seriesWinRows },
    { data: lastWinRows },
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
      .select('track_slug, class_name, race_date')
      .eq('driver_slug', slug)
      .eq('finishing_position', 1),
    supabase
      .from('SeriesSeasons')
      .select('id, series_id, year')
      .eq('champion_driver_id', driver.driver_id),
    supabase
      .from('SeriesEvents')
      .select('series_id')
      .eq('winner_driver_id', driver.driver_id),
    supabase
      .from('driver_full_results_view')
      .select('race_date')
      .eq('driver_slug', slug)
      .eq('finishing_position', 1)
      .order('race_date', { ascending: false })
      .limit(1),
  ])

  const safePhotos = photos ?? []
  const safeTopTracks = topTracks ?? []
  const flatResultsByYear = Array.isArray(resultsByYear ?? []) ? (resultsByYear ?? []) : []
  const safeWinsByClass = winsByClass ?? []
  const safeRecentResults = recentResults ?? []
  const safeChampionships = championships ?? []
  const safeWinRows = winRows ?? []
  const careerProfile = getDriverCareerProfile(slug)

  const lastRecordedYear = flatResultsByYear.length
    ? Number((flatResultsByYear[0] as any)?.result_year || 0)
    : null
  const firstRecordedYear = flatResultsByYear.length
    ? Number((flatResultsByYear[flatResultsByYear.length - 1] as any)?.result_year || 0)
    : null
  const careerSpanDisplay = firstRecordedYear && lastRecordedYear
    ? `${firstRecordedYear}–${lastRecordedYear}`
    : '—'

  const winningTrackSlugs = Array.from(new Set(
    safeWinRows.map((row: any) => row.track_slug).filter(Boolean)
  )) as string[]

  const { data: winningTrackRows } = winningTrackSlugs.length
    ? await supabase.from('Tracks').select('slug, state').in('slug', winningTrackSlugs)
    : { data: [] as any[] }

  const stateByTrack = new Map<string, string>()
  for (const row of winningTrackRows ?? []) {
    stateByTrack.set(String((row as any).slug), String((row as any).state || '').trim())
  }

  const coverageAreaWins = safeWinRows.filter((row: any) =>
    COVERAGE_STATES.has(stateByTrack.get(String(row.track_slug || '')) || '')
  ).length

  const museumWins = Math.max(driver.recorded_wins ?? 0, driver.wisconsin_feature_wins ?? 0)
  const discoveredOutsideWins = DISCOVERED_OUTSIDE_AREA_WINS[slug] ?? 0
  const totalDiscoveredWins = museumWins + discoveredOutsideWins

  const seriesChampionships = Math.max(
    (seriesChampionshipRows ?? []).length,
    careerProfile?.headlineChampionships ?? 0
  )
  const trackChampionships = safeChampionships.length

  const tracksWonAt = winningTrackSlugs.length
  const classesWonIn = new Set(
    safeWinRows.map((row: any) => row.class_name).filter(Boolean)
  ).size
  const mostSuccessfulClass = safeWinsByClass[0]?.class_name || '—'
  const mostSuccessfulTrack = safeTopTracks[0]?.track_name || '—'

  const seriesWinCounts = new Map<number, number>()
  for (const row of seriesWinRows ?? []) {
    const id = Number((row as any).series_id)
    if (id) seriesWinCounts.set(id, (seriesWinCounts.get(id) ?? 0) + 1)
  }
  const topSeriesId = Array.from(seriesWinCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const { data: topSeriesRow } = topSeriesId
    ? await supabase.from('Series').select('series_name').eq('id', topSeriesId).maybeSingle()
    : { data: null as any }
  const mostSuccessfulSeries = (topSeriesRow as any)?.series_name || '—'
  const lastFeatureWinDate = (lastWinRows?.[0] as any)?.race_date
    ? formatRaceDate((lastWinRows?.[0] as any).race_date)
    : '—'

  const foundHero = safePhotos.find((p) => p.year !== null && String(p.year) !== 'unknown-year')
  const heroPhotoItem: Photo | null = foundHero ?? safePhotos[0] ?? null
  const displayPhotos = safePhotos.filter((p) => p.file_name !== heroPhotoItem?.file_name).slice(0, 150)

  const bestYear = flatResultsByYear.reduce<any | null>((best, row: any) => {
    if (!best || (row.wins ?? 0) > (best.wins ?? 0)) return row
    return best
  }, null)

  const careerHighlights = [
    firstRecordedYear ? { year: firstRecordedYear, text: 'First Recorded Feature Race' } : null,
    bestYear && bestYear.wins > 0 ? { year: bestYear.result_year, text: `${bestYear.wins} Feature Wins (Career High)` } : null,
    ...safeChampionships.slice(0, 3).map((ch: any) => ({ year: ch.year, text: `${ch.track_name} Champion` })),
    lastRecordedYear && lastRecordedYear !== firstRecordedYear ? { year: lastRecordedYear, text: 'Last Recorded Feature Race' } : null,
  ].filter(Boolean)

  const buildPhotoUrl = (photoObj: Photo | null | undefined) => {
    if (!photoObj?.file_name) return ''
    const track = String(photoObj.track_slug || 'unknown-track')
    const year = String(photoObj.year || 'unknown-year')
    return `${SUPABASE_PHOTO_BASE}/${track}/${year}/${encodeURIComponent(String(photoObj.file_name))}`
  }

  const buildLogoUrl = (trackSlug: string | null | undefined) => trackSlug ? `/logos/tracks/${trackSlug}.jpg` : ''

  return (
    <main style={{ background: '#eadfc7', color: '#2f2417', minHeight: '100vh', fontFamily: 'Georgia, serif', margin: 0 }}>
      <section style={{ background: 'linear-gradient(to bottom, rgba(231,217,191,0.96), rgba(234,223,199,0.98))', borderBottom: '2px solid #b29364' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 20px 22px' }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '15px', marginBottom: '22px', color: '#6b4a22' }}>
            <Link href="/" style={{ color: '#7a5827', textDecoration: 'none' }}>Home</Link><span>/</span>
            <Link href="/drivers" style={{ color: '#7a5827', textDecoration: 'none' }}>Drivers</Link><span>/</span>
            <span>{driver.driver_name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) minmax(0, 1fr)', gap: '34px', alignItems: 'start' }}>
            <div style={{ border: '2px solid #bda87a', padding: '10px', background: '#f4ead7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              {!heroPhotoItem?.file_name ? (
                <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d8c39d', border: '1px solid #b29364', fontWeight: 700 }}>Photo Coming Soon</div>
              ) : (
                <>
                  <PhotoLightboxImage src={buildPhotoUrl(heroPhotoItem)} alt={driver.driver_name} caption={buildPhotoCaption(heroPhotoItem)} imageStyle={{ width: '100%', height: 'auto', display: 'block', border: '1px solid #a78654' }} />
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#5a3a1b', textAlign: 'center' }}>{buildPhotoCaption(heroPhotoItem)}</div>
                  {displayPhotos.slice(0, 3).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                      {displayPhotos.slice(0, 3).map((photo) => (
                        <PhotoLightboxImage key={photo.photo_id} src={buildPhotoUrl(photo)} alt={driver.driver_name} caption={buildPhotoCaption(photo)} imageStyle={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', border: '1px solid #a78654', display: 'block' }} showZoomBadge />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }}>Driver Profile</div>
                  <h1 style={{ fontSize: '52px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }}>{driver.driver_name}</h1>
                  <p style={{ fontSize: '22px', margin: '0 0 18px', color: '#5a3a1b' }}>{driver.hometown || 'Unknown hometown'}{driver.state ? `, ${String(driver.state).trim()}` : ''}</p>
                </div>
                <Link href={`/drivers/${slug}/results`} style={{ background: '#6e4d21', color: '#fff8ea', padding: '14px 22px', height: 'fit-content', border: '1px solid #4d3413', textDecoration: 'none', fontWeight: 700 }}>View Full Results</Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 330px)', gap: '24px', alignItems: 'start' }}>
                <p style={{ fontSize: '18px', lineHeight: 1.8, margin: 0, color: '#3f2d18' }}>{careerProfile?.summary || 'Historical driver profile from the Upper Midwest Auto Racing Museum archive. This page combines museum race records, photographs, championships, and documented career accomplishments.'}</p>
                <CareerHighlights highlights={careerHighlights as any[]} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', marginTop: '18px', background: '#76511f', border: '1px solid #5b3a14', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.18)' }}>
                <HeroStat label="Wisconsin Feature Wins" value={driver.wisconsin_feature_wins ?? 0} sublabel="Wisconsin tracks" />
                <HeroStat label="Coverage-Area Feature Wins" value={coverageAreaWins} sublabel="Museum reporting area" />
                <HeroStat label="Total Discovered Feature Wins" value={totalDiscoveredWins} sublabel="Museum + verified outside-area" />
                <HeroStat label="Series Championships" value={seriesChampionships} sublabel="Documented series titles" />
                <HeroStat label="Track Championships" value={trackChampionships} sublabel="Museum championship records" />
                <HeroStat label="Recorded Career" value={careerSpanDisplay} sublabel="First–last museum year" />
              </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', borderTop: '1px solid #c5a572', borderBottom: '1px solid #c5a572' }}>
            <SummaryMetric label="Tracks Won Feature Races At" value={String(tracksWonAt)} />
            <SummaryMetric label="Classes Won Feature Races In" value={String(classesWonIn)} />
            <SummaryMetric label="Class With Most Feature Wins" value={mostSuccessfulClass} />
            <SummaryMetric label="Track With Most Feature Wins" value={mostSuccessfulTrack} />
            <SummaryMetric label="Series With Most Feature Wins" value={mostSuccessfulSeries} />
            <SummaryMetric label="Last Feature Win Date" value={lastFeatureWinDate} />
          </div>
        </section>

        <section style={{ marginTop: '8px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '29px', margin: 0, color: '#3d2b16' }}>Photo Archive</h2>
            <span style={{ fontSize: '12px', color: '#765b39', fontStyle: 'italic' }}>Click any photo to enlarge.</span>
          </div>
          {displayPhotos.length === 0 ? <div style={{ padding: '18px', background: '#f1e5ce', border: '1px solid #c2a97d' }}>No photos available yet.</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' }}>
              {displayPhotos.map((photo) => (
                <div key={photo.photo_id} style={{ background: '#f1e5ce', border: '1px solid #c2a97d', padding: '9px' }}>
                  <PhotoLightboxImage src={buildPhotoUrl(photo)} alt={driver.driver_name} caption={buildPhotoCaption(photo)} imageStyle={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', border: '1px solid #b29364' }} showZoomBadge />
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
              <SummaryRow label="Museum-Recorded Career" value={careerSpanDisplay} />
            </Panel>

            <Panel title="Recent Feature Results">
              {safeRecentResults.length === 0 ? <p>No recent results available yet.</p> : safeRecentResults.map((result: any, index: number) => (
                <div key={`${result.race_date}-${result.track_slug}-${index}`} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px 44px', gap: '10px', padding: '8px 0', borderBottom: '1px solid #ccb48a' }}>
                  <span>{result.race_date ? formatRaceDate(result.race_date) : 'Unknown date'}</span>
                  <div>{result.track_slug && <img src={buildLogoUrl(result.track_slug)} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', marginRight: '8px' }} />}<Link href={`/tracks/${result.track_slug}`} style={{ color: '#5a3a1b' }}>{result.track_name}</Link></div>
                  <span>{result.class_name || 'Unknown'}</span><strong>P{result.finishing_position}</strong>
                </div>
              ))}
            </Panel>

            <Panel title="Results by Year">
              {flatResultsByYear.length === 0 ? <p>No yearly results available yet.</p> : flatResultsByYear.map((row: any) => (
                <div key={row.result_year} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid #ccb48a' }}><span>{row.result_year}</span><strong>{row.results_count} Results • {row.wins} Wins • {row.top_3s} Top 3</strong></div>
              ))}
            </Panel>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <Panel title="Feature Wins by Class">{safeWinsByClass.length === 0 ? <p>No class data available yet.</p> : safeWinsByClass.map((cls: any) => <SummaryRow key={cls.class_name} label={cls.class_name} value={String(cls.wins)} />)}</Panel>
            <Panel title="Feature Wins by Track">{safeTopTracks.length === 0 ? <p>No wins recorded yet.</p> : safeTopTracks.map((track: any) => <SummaryRow key={track.track_slug} label={track.track_name} value={String(track.wins)} />)}</Panel>
            <Panel title="Track Championships">{safeChampionships.length === 0 ? <p>No championships recorded yet.</p> : safeChampionships.map((ch: any, index: number) => <SummaryRow key={`${ch.year}-${ch.track_slug}-${index}`} label={`${ch.year} ${ch.track_name}`} value={ch.class_name || ''} />)}</Panel>
          </div>
        </div>
      </section>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div style={{ background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }}><div style={{ fontSize: '23px', fontWeight: 700, color: '#5b3a1b', marginBottom: '9px' }}>{title}</div><div style={{ background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }}>{children}</div></div>
}

function CareerHighlights({ highlights }: { highlights: { year: number | string; text: string }[] }) {
  if (!highlights.length) return null
  return <div style={{ background: 'rgba(244,234,215,0.82)', border: '1px solid #b29364', padding: '14px 16px' }}><div style={{ marginBottom: '9px', color: '#5b3a1b', fontSize: '15px', fontWeight: 700 }}>★ Career Highlights</div>{highlights.slice(0, 5).map((item, index) => <div key={`${item.year}-${item.text}-${index}`} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: '10px', padding: '4px 0', fontSize: '14px' }}><strong>{item.year}</strong><span>{item.text}</span></div>)}</div>
}

function HeroStat({ label, value, sublabel }: { label: string; value: number | string; sublabel?: string }) {
  return <div style={{ background: '#76511f', padding: '18px 9px', textAlign: 'center', color: '#fff7e7', borderRight: '1px solid rgba(255,247,231,0.32)' }}><div style={{ fontSize: typeof value === 'number' ? '29px' : '24px', fontWeight: 700, lineHeight: 1, marginBottom: '7px' }}>{typeof value === 'number' ? value.toLocaleString() : value}</div><div style={{ fontSize: '11px', color: '#f1dfbf', textTransform: 'uppercase', letterSpacing: '0.045em', lineHeight: 1.35 }}>{label}</div>{sublabel && <div style={{ fontSize: '9px', color: '#e4cfaa', marginTop: '5px' }}>{sublabel}</div>}</div>
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: '14px 14px', borderRight: '1px solid #c5a572', minWidth: 0 }}><div style={{ fontSize: value.length > 22 ? '17px' : '25px', fontWeight: 700, color: '#4e3417', lineHeight: 1.15, wordBreak: 'break-word' }}>{value}</div><div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.055em', color: '#74552f', marginTop: '5px', lineHeight: 1.3 }}>{label}</div></div>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid #ccb48a' }}><span style={{ color: '#5a3a1b' }}>{label}</span><span style={{ fontWeight: 700, textAlign: 'right' }}>{value}</span></div>
}

function buildPhotoCaption(photo: Photo) {
  const trackLabel = formatTrackSlug(photo.track_slug)
  const photographer = photo.photographer_slug && photo.photographer_slug !== 'unknown' ? formatName(photo.photographer_slug) : 'Unknown Credit'
  const creditType = photo.credit_type && photo.credit_type !== 'unknown' ? formatCreditType(photo.credit_type) : 'Photo'
  return [trackLabel, photo.year && String(photo.year) !== 'unknown-year' ? photo.year : 'Year Unknown', photographer !== 'Unknown Credit' ? `${photographer}${creditType !== 'Photo' ? ` ${creditType}` : ''}` : null].filter(Boolean).join(' • ')
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
