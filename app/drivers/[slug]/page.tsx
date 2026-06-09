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
            <div style={emptyArchive