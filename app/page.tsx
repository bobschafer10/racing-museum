import fs from 'node:fs'
import path from 'node:path'
import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import TrackLogo from './tracks/[slug]/TrackLogo'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const featuredSpecialEvents = [
  {
    title: 'Red, White & Blue Series',
    venue: 'Wisconsin International Raceway',
    years: '1980s–2000s',
    description:
      'A signature short-track event with strong regional identity and a long place in Wisconsin racing history.',
    image: '/media/home/special-events/red-white-blue-series.jpg',
    href: '/events',
  },
  {
    title: 'Oktoberfest Race Weekend',
    venue: 'LaCrosse Interstate Speedway',
    years: '1969–Today',
    description:
      'One of the Upper Midwest’s most recognizable annual race weekends, drawing generations of drivers and fans.',
    image: '/media/home/special-events/oktoberfest-race-weekend.jpg',
    href: '/events',
  },
  {
    title: 'WISSOTA 100',
    venue: 'Cedar Lake Speedway / Yellow River Speedway',
    years: 'Historic marquee event',
    description:
      'A major special-event name in Upper Midwest racing history, tied to championship-level competition and tradition.',
    image: '/media/home/special-events/wissota-100.jpg',
    href: '/events',
  },
]

function getFeaturedSpecialEvent() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)

  return featuredSpecialEvents[dayOfYear % featuredSpecialEvents.length]
}

function publicFileExists(publicPath: string) {
  const cleanPath = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath
  const fullPath = path.join(process.cwd(), 'public', cleanPath)
  return fs.existsSync(fullPath)
}

export default async function Home() {
  const [
    { data: stats },
    { data: driverPool },
    { data: trackPool },
    { data: seriesPool },
    { data: eventPool },
    { data: photoPool },
    { data: recentPhotos },
  ] = await Promise.all([
    supabase.from('homepage_stats_view').select('*').single(),

    supabase
      .from('photos')
      .select('driver_slug, file_name, track_slug, photographer_slug, credit_type, year, sequence')
      .neq('credit_type', 'unknown')
      .not('driver_slug', 'in', '("unknown-driver","unknown")')
      .not('photographer_slug', 'in', '("unknown-credit","unknown")')
      .not('track_slug', 'in', '("unknown-track","unknown")')
      .limit(500),

    supabase
      .from('Tracks')
      .select('track_id, track_name, slug, city, state, first_year, last_year')
      .not('track_name', 'is', null)
      .limit(250),

    supabase
      .from('Series')
      .select('*')
      .eq('is_published', true)
      .limit(100),

    supabase
      .from('Events')
      .select('*')
      .limit(100),

    supabase
      .from('photos')
      .select('*')
      .neq('credit_type', 'unknown')
      .not('driver_slug', 'in', '("unknown-driver","unknown")')
      .limit(10000),

    supabase
      .from('photos')
      .select('file_name, driver_slug, track_slug, photographer_slug, credit_type, year, created_at')
      .neq('credit_type', 'unknown')
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  let driver = null
  let driverPhoto = null

  const shuffledDriverPhotos = [...(driverPool || [])].sort(
    () => Math.random() - 0.5
  )

  for (const candidatePhoto of shuffledDriverPhotos) {
    if (!candidatePhoto.driver_slug) continue

    const { data: driverRecord } = await supabase
      .from('driver_directory_view')
      .select('*')
      .eq('driver_slug', candidatePhoto.driver_slug)
      .maybeSingle()

    if (driverRecord) {
      driver = driverRecord
      driverPhoto = candidatePhoto
      break
    }
  }

  const { data: featuredTrackRows } = await supabase
  .from('homepage_featured_tracks_view')
  .select('*')
  .limit(250)

const track =
  featuredTrackRows && featuredTrackRows.length > 0
    ? featuredTrackRows[
        Math.floor(Math.random() * featuredTrackRows.length)
      ]
    : null

  const series =
    seriesPool && seriesPool.length > 0
      ? seriesPool[Math.floor(Math.random() * seriesPool.length)]
      : null

  const spotlightPhoto =
    photoPool && photoPool.length > 0
      ? photoPool[Math.floor(Math.random() * photoPool.length)]
      : null

  const event =
    eventPool && eventPool.length > 0
      ? eventPool[Math.floor(Math.random() * eventPool.length)]
      : null

  const featuredSpecialEvent = getFeaturedSpecialEvent()
  const featuredSpecialEventHasImage = publicFileExists(featuredSpecialEvent.image)

  const randomizedPhotoPool = [...(photoPool || [])].sort(
    () => Math.random() - 0.5
  )

  const uniqueTrackMap = new Map<string, any>()

  for (const photo of randomizedPhotoPool) {
    const key = photo.track_slug || photo.file_name

    if (!uniqueTrackMap.has(key)) {
      uniqueTrackMap.set(key, photo)
    }
  }

  const shuffledSpotlightPhotos = Array.from(uniqueTrackMap.values()).sort(
    () => Math.random() - 0.5
  )

  const leftSpotlightPhoto = shuffledSpotlightPhotos[0] || null

  const rightSpotlightPhoto =
    shuffledSpotlightPhotos.find(
      (p) =>
        p.file_name !== leftSpotlightPhoto?.file_name &&
        p.track_slug !== leftSpotlightPhoto?.track_slug
    ) || null

  const hasTwoSpotlightPhotos = !!leftSpotlightPhoto && !!rightSpotlightPhoto

  const recentMuseumAdditions =
    recentPhotos && recentPhotos.length > 0
      ? recentPhotos.map((photo) => {
          const driverName = formatSlugName(photo.driver_slug)
          const trackName = formatSlugName(photo.track_slug)
          const creditLabel = getCreditLabel(photo.credit_type, photo.file_name)

          return `${creditLabel}: ${driverName} at ${trackName}`
        })
      : [
          'New photo archive additions',
          'Race program collection updates',
          'Additional driver profile records',
          'Expanded race result history',
        ]

  return(
    <main style={pageStyle}>
      {/* HERO */}
      <section style={heroSection}>
        <Image
          src="/museum-bg.png"
          alt="Museum hallway"
          fill
          priority
          style={heroBackground}
        />
        <div style={heroOverlay} />
<div style={heroGrain} />

        <div style={heroContent}>
          <Image
            src="/museum-logo.png"
            alt="Upper Midwest Auto Racing Museum logo"
            width={520}
            height={280}
            priority
            style={heroLogo}
          />

          <h1 style={heroTitle}>
            Preserving the History of Upper Midwest Auto Racing
          </h1>

          <p style={heroSubtitle}>
            Explore drivers, tracks, race results, and historic photos
          </p>

          <p style={heroRegion}>
            from WI • MN • UP MI • IL • Chicagoland
          </p>
        </div>
      </section>

      {/* STATS */}
      <section style={statsStrip}>
        <div style={statsInner}>
          <StatItem label="Drivers" value={stats?.drivers_count ?? 0} />
          <StatItem label="Tracks" value={stats?.tracks_count ?? 0} />
          <StatItem label="Race Events" value={stats?.events_count ?? 0} />
          <StatItem label="Results" value={stats?.results_count ?? 0} />
          <StatItem label="Photos" value={38000} isLast />
        </div>
      </section>

{/* MISSION / SUPPORT */}
<section style={missionSection}>
  <div style={missionInner}>
    <div style={missionEyebrow}>Preserving Racing History</div>

    <h2 style={missionTitle}>
      A Living Archive for Upper Midwest Auto Racing
    </h2>

    <p style={missionText}>
      The Virtual Upper Midwest Auto Racing Museum is dedicated to preserving
      the history of short track auto racing across Wisconsin, Northern
      Illinois, Eastern Minnesota, and the Upper Midwest through photographs,
      newspapers, race programs, statistics, and historical archives.
    </p>

    <div style={supportBox}>
      <h3 style={supportTitle}>Support the Cause</h3>

      <p style={supportText}>
        Have photos, race programs, newspapers, flyers, results, corrections,
        or historical information to share? Your contributions help keep Upper
        Midwest racing history alive for future generations.
      </p>

      <Link href="/contact" style={supportButton}>
        Submit Information
      </Link>
    </div>
  </div>
</section>

{/* SEARCH + ERA + STATUS */}
<section style={sectionWrap}>
  <div style={explorePanel}>
    <div style={exploreTop}>
      {/* SEARCH */}
      <div style={searchArea}>
        <div style={exploreEyebrow}>Search the Archive</div>

        <h2 style={exploreTitle}>
          Explore More Than a Century of Racing History
        </h2>

        <div style={searchBarWrap}>
          <input
            type="text"
            placeholder="Search drivers, tracks, series, years..."
            style={searchInput}
          />

          <button style={searchButton}>
            Search
          </button>
        </div>
      </div>

      {/* ARCHIVE STATUS */}
      <div style={archiveStatus}>
        <div style={archiveStatusHeader}>
          Current Archive Coverage
        </div>

        <ul style={archiveList}>
          <li>Results Archive: 1903–2026</li>
          <li>Photo Archive: 38,000+ Images</li>
          <li>Drivers Documented: 24,000+</li>
          <li>Tracks Covered: 250+</li>
          <li>Newspapers: 1959–1978</li>
          <li>Programs & Flyers Expanding Weekly</li>
        </ul>
      </div>
    </div>

    {/* EXPLORE BY ERA */}
    <div style={eraSection}>
      <div style={exploreEyebrow}>Explore by Era</div>

      <div style={eraGrid}>
        <Link href="/results/year?decade=1930" style={eraCard}>
          <span style={eraYear}>1930s</span>
        </Link>

        <Link href="/results/year?decade=1950" style={eraCard}>
          <span style={eraYear}>1950s</span>
        </Link>

        <Link href="/results/year?decade=1970" style={eraCard}>
          <span style={eraYear}>1970s</span>
        </Link>

        <Link href="/results/year?decade=1990" style={eraCard}>
          <span style={eraYear}>1990s</span>
        </Link>

        <Link href="/results/year?decade=2020" style={eraCard}>
          <span style={eraYear}>Modern Era</span>
        </Link>
      </div>
    </div>
  </div>
</section>

      {/* FEATURED THREE-UP */}
      <section style={sectionWrap}>
        <div style={featureGrid}>
          <FeatureDriverCard driver={driver} photo={driverPhoto} />
          <FeatureTrackCard track={track} />
           <FeatureSeriesCard series={series} />
        </div>
      </section>

      {/* BROWSE STRIP */}
      <section style={sectionWrapTight}>
        <div style={browseBand}>
         <BrowseMini
  title="Drivers"
  lines={['Browse Alphabetically', 'View Top Drivers']}
  href="/drivers"
/>
<BrowseMini
  title="Tracks"
  lines={['Map View', 'Regional Browse']}
  href="/tracks"
/>
<BrowseMini
  title="Series"
  lines={['Browse Major Series', 'Touring and Weekly Divisions']}
  href="/series"
/>
<BrowseMini
  title="Results"
  lines={['Browse by Year', 'Browse by Track']}
  href="/results"
/>
<BrowseMini
  title="Photos"
  lines={['Browse Full Archive', 'Search by Driver, Track, Year']}
  href="/photos"
  isLast
/>
        </div>
      </section>

{/* STATS LAB FEATURE */}
<section style={sectionWrap}>
  <div style={statsLabPanel}>
    <div style={statsLabLeft}>
      <div style={statsLabEyebrow}>Stats Lab</div>

      <h2 style={statsLabTitle}>
        Feature Win Archive
      </h2>

      <p style={statsLabDescription}>
        Explore more than a century of feature race victories across
        Wisconsin and the Upper Midwest. Filter by year, track,
        surface, class, and driver to uncover the sport’s winningest
        competitors.
      </p>

      <div style={statsLabHighlights}>
        <div style={statsLabHighlight}>
          <div style={statsLabHighlightValue}>1000s upon 1000s</div>
          <div style={statsLabHighlightLabel}>
            of career feature wins tracked
          </div>
        </div>

        <div style={statsLabHighlight}>
          <div style={statsLabHighlightValue}>1903–2026</div>
          <div style={statsLabHighlightLabel}>
            Historical coverage range
          </div>
        </div>

        <div style={statsLabHighlight}>
          <div style={statsLabHighlightValue}>Fast Filters</div>
          <div style={statsLabHighlightLabel}>
            Track • Surface • Class • Year
          </div>
        </div>
      </div>

      <div style={{ marginTop: '28px' }}>
        <Link
          href="/stats/feature-winners"
          style={statsLabButton}
        >
          Open Feature Win Archive →
        </Link>
      </div>
    </div>

    <div style={statsLabRight}>
      <div style={statsLabRightInner}>
        <div style={statsLabMiniEyebrow}>
          Museum by Numbers
        </div>

        <div style={statsLabNumbersGrid}>
          <div style={statsLabNumberCard}>
            <div style={statsLabNumberValue}>
              {stats?.results_count?.toLocaleString() || '0'}
            </div>
            <div style={statsLabNumberLabel}>Results</div>
          </div>

          <div style={statsLabNumberCard}>
            <div style={statsLabNumberValue}>
              {stats?.drivers_count?.toLocaleString() || '0'}
            </div>
            <div style={statsLabNumberLabel}>Drivers</div>
          </div>

          <div style={statsLabNumberCard}>
            <div style={statsLabNumberValue}>
              {stats?.tracks_count?.toLocaleString() || '0'}
            </div>
            <div style={statsLabNumberLabel}>Tracks</div>
          </div>

          <div style={statsLabNumberCard}>
            <div style={statsLabNumberValue}>1903–2026</div>
            <div style={statsLabNumberLabel}>Coverage</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* FEATURED NEWSPAPER WOW SPOT */}
<section style={sectionWrap}>
  <div style={newspaperWowPanel}>
    <div style={newspaperWowImageWrap}>
      <img
        src="/media/home/featured-newspaper.jpg"
        alt="Featured historic newspaper"
        style={newspaperWowImage}
      />
    </div>

    <div style={newspaperWowContent}>
      <div style={newspaperWowEyebrow}>From the Newspaper Archive</div>

      <h2 style={newspaperWowTitle}>
        Racing History, Preserved One Page at a Time
      </h2>

      <p style={newspaperWowText}>
        Historic racing newspapers open a window into the people, tracks,
        events, rivalries, and stories that shaped short track auto racing
        across the Upper Midwest.
      </p>

      <p style={newspaperWowText}>
        Browse scanned issues, front pages, headlines, and race coverage from
        decades of regional racing history.
      </p>

      <div style={newspaperWowMetaGrid}>
        <div style={newspaperWowMetaCard}>
          <strong>Midwest Racing News</strong>
          <span>Historic issues now being added</span>
        </div>

        <div style={newspaperWowMetaCard}>
          <strong>Checkered Flag Racing News</strong>
          <span>Regional racing coverage preserved</span>
        </div>
      </div>

      <Link href="/media/newspapers" style={newspaperWowButton}>
        Explore Newspaper Archive →
      </Link>
    </div>
  </div>
</section>

      {/* MEDIA + PHOTOGRAPHERS */}
<section style={sectionWrap}>
  <div style={mediaGrid}>
    <div style={mediaPanel}>
      <div style={panelHeader}>Media Archive</div>
      <div style={mediaTiles}>
        <MediaTile
          title="Newspapers"
          href="/media/newspapers"
          image="/media/home/newspapers.jpg"
        />
        <MediaTile
          title="Yearbooks"
          href="/media/race-programs"
          image="/media/home/race-programs.jpg"
        />
        <MediaTile
          title="Flyers"
          href="/media/event-flyers"
          image="/media/home/event-flyers.jpg"
        />
      </div>
    </div>

    <div style={mediaPanel}>
      <div style={panelHeader}>Photographers</div>
      <div style={photographerRow}>
        <img
          src="/media/home/photographers.jpg"
          alt="Photographers"
          style={photographerPoster}
        />

        <div style={sidePanelTextWrap}>
          <div>
            <div style={photographerName}>Featured Photographers</div>
            <div style={{ ...photographerMeta, marginTop: '6px' }}>
              Historic racing images captured by the photographers who spent
              countless hours behind the lens.
            </div>
          </div>

          <div>
            <Link
  href="/photographers"
  style={{ ...panelButtonLink, position: 'relative', zIndex: 3 }}
>
  View Collection
</Link>
          </div>
        </div>
      </div>
    </div>

    <div style={mediaPanel}>
      <div style={panelHeader}>Special Events</div>
      <div style={photographerRow}>
        <div style={specialEventPosterWrap}>
  {featuredSpecialEventHasImage ? (
    <img
      src={featuredSpecialEvent.image}
      alt={featuredSpecialEvent.title}
      style={specialEventPoster}
    />
  ) : (
    <div style={specialEventFallback}>
      <div style={specialEventFallbackInner}>
        <div style={specialEventFallbackEyebrow}>Featured Event</div>
        <div style={specialEventFallbackTitle}>
          {featuredSpecialEvent.title}
        </div>
      </div>
    </div>
  )}
</div>

        <div style={sidePanelTextWrap}>
          <div>
            <div style={photographerName}>
              {featuredSpecialEvent.title}
            </div>

            <div style={{ ...photographerMeta, marginTop: '6px' }}>
              {featuredSpecialEvent.venue}
            </div>

            <div style={{ ...photographerMeta, marginTop: '6px' }}>
              {featuredSpecialEvent.years}
            </div>

            <div style={{ ...photographerMeta, marginTop: '10px' }}>
              {featuredSpecialEvent.description}
            </div>
          </div>

          <div>
            <Link href={featuredSpecialEvent.href} style={panelButtonLink}>
              View Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

    {/* PHOTO SPOTLIGHT */}
<section style={sectionWrap}>
  <div style={spotlightTitle}>Photo Spotlight</div>

  {!spotlightPhoto ? (
    <div style={spotlightPanel}>Photo spotlight coming soon.</div>
  ) : hasTwoSpotlightPhotos && leftSpotlightPhoto && rightSpotlightPhoto ? (
    <div style={spotlightPanelThreeUp}>
      <div style={spotlightSideImageWrap}>
        <Link
          href={
            leftSpotlightPhoto.driver_slug &&
            leftSpotlightPhoto.driver_slug !== 'unknown-driver' &&
            leftSpotlightPhoto.driver_slug !== 'unknown'
              ? `/drivers/${leftSpotlightPhoto.driver_slug}`
              : '/photos'
          }
          style={{ display: 'block' }}
        >
          <img
            src={`/photos/${leftSpotlightPhoto.file_name}`}
            alt={formatSlugName(leftSpotlightPhoto.driver_slug)}
            style={spotlightSideImage}
          />
        </Link>
      </div>

      <div style={spotlightCenterPanel}>
        <div style={spotlightEyebrow}>From the Archive</div>

        <div style={spotlightCalloutBlock}>
          <div style={spotlightArrowLeft}>←</div>
          <div style={spotlightCalloutText}>
            <div style={spotlightCalloutName}>
              {leftSpotlightPhoto.driver_slug &&
              leftSpotlightPhoto.driver_slug !== 'unknown-driver' &&
              leftSpotlightPhoto.driver_slug !== 'unknown' ? (
                <Link
                  href={`/drivers/${leftSpotlightPhoto.driver_slug}`}
                  style={spotlightDriverLink}
                >
                  {formatSlugName(leftSpotlightPhoto.driver_slug)}
                </Link>
              ) : (
                formatSlugName(leftSpotlightPhoto.driver_slug)
              )}
            </div>
            <div style={spotlightCalloutMeta}>
              {leftSpotlightPhoto.year &&
              leftSpotlightPhoto.year !== 'unknown-year'
                ? leftSpotlightPhoto.year
                : 'Year Unknown'}
            </div>
            <div style={spotlightCalloutMeta}>
  {leftSpotlightPhoto.photographer_slug &&
leftSpotlightPhoto.photographer_slug !== 'unknown-photographer' &&
leftSpotlightPhoto.photographer_slug !== 'unknown-credit' &&
leftSpotlightPhoto.photographer_slug !== 'unknown'
  ? `${formatSlugName(leftSpotlightPhoto.photographer_slug)} ${getCreditLabel(leftSpotlightPhoto.credit_type)}`
  : 'Unknown Photographer Photo'}
</div>
            <div style={spotlightCalloutTrack}>
              {leftSpotlightPhoto.track_slug &&
              leftSpotlightPhoto.track_slug !== 'unknown-track' &&
              leftSpotlightPhoto.track_slug !== 'unknown' ? (
                <Link
                  href={`/tracks/${leftSpotlightPhoto.track_slug}`}
                  style={spotlightTrackLink}
                >
                  {formatSlugName(leftSpotlightPhoto.track_slug)}
                </Link>
              ) : (
                'Track Unknown'
              )}
            </div>
          </div>
        </div>

        <div style={spotlightCenterDivider} />

        <div style={spotlightCalloutBlock}>
          <div style={spotlightCalloutTextRight}>
            <div style={spotlightCalloutName}>
              {rightSpotlightPhoto.driver_slug &&
              rightSpotlightPhoto.driver_slug !== 'unknown-driver' &&
              rightSpotlightPhoto.driver_slug !== 'unknown' ? (
                <Link
                  href={`/drivers/${rightSpotlightPhoto.driver_slug}`}
                  style={spotlightDriverLink}
                >
                  {formatSlugName(rightSpotlightPhoto.driver_slug)}
                </Link>
              ) : (
                formatSlugName(rightSpotlightPhoto.driver_slug)
              )}
            </div>
            <div style={spotlightCalloutMeta}>
              {rightSpotlightPhoto.year &&
              rightSpotlightPhoto.year !== 'unknown-year'
                ? rightSpotlightPhoto.year
                : 'Year Unknown'}
            </div>
            <div style={spotlightCalloutMeta}>
  {rightSpotlightPhoto.photographer_slug &&
rightSpotlightPhoto.photographer_slug !== 'unknown-photographer' &&
rightSpotlightPhoto.photographer_slug !== 'unknown-credit' &&
rightSpotlightPhoto.photographer_slug !== 'unknown'
  ? `${formatSlugName(leftSpotlightPhoto.photographer_slug)} ${getCreditLabel(rightSpotlightPhoto.credit_type)}`
  : 'Unknown Photographer Photo'}
</div>
            <div style={spotlightCalloutTrack}>
              {rightSpotlightPhoto.track_slug &&
              rightSpotlightPhoto.track_slug !== 'unknown-track' &&
              rightSpotlightPhoto.track_slug !== 'unknown' ? (
                <Link
                  href={`/tracks/${rightSpotlightPhoto.track_slug}`}
                  style={spotlightTrackLink}
                >
                  {formatSlugName(rightSpotlightPhoto.track_slug)}
                </Link>
              ) : (
                'Track Unknown'
              )}
            </div>
          </div>
          <div style={spotlightArrowRight}>→</div>
        </div>

        <div
  style={{
    marginTop: '22px',
    display: 'flex',
    justifyContent: 'center',
  }}
>
  <Link href="/photos" style={featureButton}>
    Browse All Photos
  </Link>
</div>
      </div>

      <div style={spotlightSideImageWrap}>
        <Link
          href={
            rightSpotlightPhoto.driver_slug &&
            rightSpotlightPhoto.driver_slug !== 'unknown-driver' &&
            rightSpotlightPhoto.driver_slug !== 'unknown'
              ? `/drivers/${rightSpotlightPhoto.driver_slug}`
              : '/photos'
          }
          style={{ display: 'block' }}
        >
          <img
            src={`/photos/${rightSpotlightPhoto.file_name}`}
            alt={formatSlugName(rightSpotlightPhoto.driver_slug)}
            style={spotlightSideImage}
          />
        </Link>
      </div>
    </div>
  ) : (
    <div style={spotlightPanelFilled}>
      <div style={spotlightImageWrap}>
        <Link
          href={
            spotlightPhoto.driver_slug &&
            spotlightPhoto.driver_slug !== 'unknown-driver' &&
            spotlightPhoto.driver_slug !== 'unknown'
              ? `/drivers/${spotlightPhoto.driver_slug}`
              : '/photos'
          }
          style={{ display: 'block' }}
        >
          <img
            src={`/photos/${spotlightPhoto.file_name}`}
            alt={formatSlugName(spotlightPhoto.driver_slug)}
            style={spotlightImage}
          />
        </Link>

       <div style={spotlightMiniCaption}>
  {formatSlugName(spotlightPhoto.driver_slug)}
  {spotlightPhoto.year &&
spotlightPhoto.year !== 'unknown-year'
  ? `, ${spotlightPhoto.year}`
  : ', Year Unknown'}
  {spotlightPhoto.photographer_slug &&
  spotlightPhoto.photographer_slug !== 'unknown-credit' &&
  spotlightPhoto.photographer_slug !== 'unknown'
    ? `, ${formatSlugName(spotlightPhoto.photographer_slug)} ${getCreditLabel(spotlightPhoto.credit_type)}`
    : ', Photographer Unknown'}
  {spotlightPhoto.track_slug &&
  spotlightPhoto.track_slug !== 'unknown-track' &&
  spotlightPhoto.track_slug !== 'unknown'
    ? `, ${formatSlugName(spotlightPhoto.track_slug)}`
    : ', Track Unknown'}
</div>
      </div>

      <div style={spotlightBody}>
        <div style={spotlightEyebrow}>From the Archive</div>

        <h3 style={spotlightDriver}>
          {spotlightPhoto.driver_slug &&
          spotlightPhoto.driver_slug !== 'unknown-driver' &&
          spotlightPhoto.driver_slug !== 'unknown' ? (
            <Link
              href={`/drivers/${spotlightPhoto.driver_slug}`}
              style={spotlightDriverLink}
            >
              {formatSlugName(spotlightPhoto.driver_slug)}
            </Link>
          ) : (
            formatSlugName(spotlightPhoto.driver_slug)
          )}
        </h3>

        <div style={spotlightMeta}>
          {spotlightPhoto.year &&
          spotlightPhoto.year !== 'unknown-year'
            ? spotlightPhoto.year
            : 'Year Unknown'}
        </div>

        <div style={spotlightMeta}>
  {spotlightPhoto.photographer_slug &&
  spotlightPhoto.photographer_slug !== 'unknown-credit' &&
  spotlightPhoto.photographer_slug !== 'unknown'
    ? `${formatSlugName(spotlightPhoto.photographer_slug)} ${getCreditLabel(spotlightPhoto.credit_type)}`
    : 'Photographer Unknown'}
</div>

        <div style={spotlightMeta}>
          {spotlightPhoto.track_slug &&
          spotlightPhoto.track_slug !== 'unknown-track' &&
          spotlightPhoto.track_slug !== 'unknown' ? (
            <Link
              href={`/tracks/${spotlightPhoto.track_slug}`}
              style={spotlightTrackLink}
            >
              {formatSlugName(spotlightPhoto.track_slug)}
            </Link>
          ) : (
            'Track Unknown'
          )}
        </div>

        <div style={{ marginTop: '18px' }}>
          <Link href="/photos" style={featureButton}>
            Browse All Photos
          </Link>
        </div>
      </div>
    </div>
  )}
</section>


{/* MUSEUM DESK */}
<section style={sectionWrap}>
  <div style={spotlightTitle}>Museum Desk</div>

  <div style={museumDeskGrid}>
    {/* 1. Contact / Follow */}
    <div style={museumPanel}>
      <div style={museumPanelInner}>
        <div style={museumHeader}>Contact / Follow</div>

        <div style={museumText}>
          <div><strong>Email:</strong> museum@email.com</div>
          <div><strong>Facebook:</strong> Upper Midwest Auto Racing Museum</div>

          <p style={{ marginTop: '12px' }}>
            Have photos, programs, newspapers, or race results to share?
            Help keep Upper Midwest racing history alive.
          </p>
        </div>

        <div style={{ marginTop: '14px' }}>
          <Link href="/contact" style={panelButtonLink}>
            Submit Information
          </Link>
        </div>
      </div>
    </div>

    {/* 2. Most Recent Museum Additions */}
    <div style={museumPanel}>
      <div style={museumPanelInner}>
        <div style={museumHeader}>Most Recent Museum Additions</div>

        <ul style={museumList}>
  {recentMuseumAdditions.map((item) => (
    <li key={item}>{item}</li>
  ))}
</ul>

        <div style={{ marginTop: '14px' }}>
          <Link href="/photos" style={panelButtonLink}>
            Browse Archive
          </Link>
        </div>
      </div>
    </div>

    {/* 3. What Doors Will Be Opened Next */}
    <div style={museumPanel}>
      <div style={museumPanelInner}>
        <div style={museumHeader}>What Doors Will Be Opened Next</div>

        <ul style={museumList}>
          <li>Expanded photographer archive</li>
          <li>Newspaper reader upgrades</li>
          <li>Track history timelines</li>
          <li>More year-by-year race results</li>
        </ul>

        <div style={{ marginTop: '14px' }}>
          <Link href="/media/newspapers" style={panelButtonLink}>
            Explore Media
          </Link>
        </div>
      </div>
    </div>
  </div>
</section>

</main>
 
  )
}

function formatStat(value: number) {
  if (!value) return '0+'

  if (value >= 100000) {
    return `${(Math.floor(value / 10000) * 10).toLocaleString()},000+`
  }

  if (value >= 1000) {
    return `${(Math.floor(value / 1000) * 1000).toLocaleString()}+`
  }

  if (value >= 100) {
    return `${(Math.floor(value / 10) * 10).toLocaleString()}+`
  }

  return `${value.toLocaleString()}+`
}

function StatItem({
  label,
  value,
  isLast = false,
}: {
  label: string
  value: number
  isLast?: boolean
}) {
  return (
    <div style={{ ...statItem, borderRight: isLast ? 'none' : statItem.borderRight }}>
      <div style={statDivider} />
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{formatStat(value)}</div>
    </div>
  )
}

function FeatureDriverCard({
  driver,
  photo,
}: {
  driver: any
  photo: any
}) {
  return (
    <div style={featureCard}>
      <div style={featureCardInner}>
        <div style={featureHeader}>Featured Driver</div>

        {photo && driver ? (
  <Link href={`/drivers/${driver.driver_slug}`}>
    <img
      src={`/photos/${photo.file_name}`}
      alt={driver.driver_name || 'Featured driver'}
      style={featureImage}
    />
  </Link>
) : photo ? (
  <img
    src={`/photos/${photo.file_name}`}
    alt="Featured driver"
    style={featureImage}
  />
) : (
          <div style={featureImagePanel}>
            <span style={featureImagePlaceholderText}>
              Driver Photo Coming Soon
            </span>
          </div>
        )}

       {photo && (
  <div style={featureCaption}>
    {photo.year && photo.year !== 'unknown-year' ? photo.year : 'Year Unknown'} •{' '}
    {photo.photographer_slug &&
    photo.photographer_slug !== 'unknown-photographer' &&
    photo.photographer_slug !== 'unknown-credit' &&
    photo.photographer_slug !== 'unknown'
      ? formatSlugName(photo.photographer_slug)
      : 'Unknown Photographer'}{' '}
    Photo
  </div>
)}

        <div style={featureBody}>
          {driver ? (
            <>
              <h3 style={featureTitle}>{driver.driver_name}</h3>
              <p style={featureLocation}>
                {driver.hometown || 'Unknown hometown'}
                {driver.state ? `, ${driver.state}` : ''}
              </p>
              <ul style={featureList}>
  <li>Recorded Feature Wins: {driver.recorded_wins ?? 0}</li>
  <li>Wisconsin Feature Wins: {driver.wisconsin_feature_wins ?? 0}</li>
  <li>Recorded Top-3 Feature Finishes: {driver.recorded_top_3_finishes ?? 0}</li>
  <li>Recorded Feature Race Results: {driver.recorded_results ?? 0}</li>
</ul>
              <Link href={`/drivers/${driver.driver_slug}`} style={featureButton}>
                Learn More
              </Link>
            </>
          ) : (
            <p style={featureLocation}>No featured driver available.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function FeatureTrackCard({ track }: { track: any }) {
  return (
    <div style={featureCard}>
      <div style={featureCardInner}>
        <div style={featureHeader}>Featured Track</div>

        <div style={featureLogoFrame}>
          {track?.slug ? (
            <TrackLogo slug={track.slug} trackName={track.track_name} />
          ) : (
            <div style={featureLogoFallback}>Track Logo Coming Soon</div>
          )}
        </div>

        <div style={featureBody}>
          {track ? (
            <>
              <h3 style={featureTitle}>{track.track_name}</h3>

              <p style={featureLocation}>
                {track.city || 'Unknown city'}
                {track.state ? `, ${track.state}` : ''}
              </p>

              <div style={featureDivider} />

              <div style={featureStats}>
                <div>
                  <strong>Years Active:</strong>
                  <br />
                  {track.first_year || track.last_year
  ? `${track.first_year || '?'}–${track.last_year || 'Present'}`
  : 'Unknown'}
                </div>
                <div>
                  <strong>Status:</strong>
                  <br />
                  Active / Historic
                </div>
              </div>

              <p style={featureDescription}>
                Historic racing venue with deep regional significance. Full records and archives continue to be expanded.
              </p>

              <Link href={`/tracks/${track.slug}`} style={featureButton}>
                View Track →
              </Link>
            </>
          ) : (
            <p style={featureLocation}>No featured track available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
function FeatureSeriesCard({ series }: { series: any }) {
  const yearsLabel =
    series?.years_active ||
    (series?.first_year && series?.last_year
      ? `${series.first_year}–${series.last_year}`
      : series?.first_year
      ? `${series.first_year}–`
      : 'Years unknown')

  const seriesImage = series?.slug
  ? `/logos/series/${series.slug}.jpg`
  : null

  return (
    <div style={featureCard}>
      <div style={featureCardInner}>
        <div style={featureHeader}>Featured Series</div>

        <div style={featureLogoFrame}>
          {seriesImage ? (
            <img
              src={seriesImage}
              alt={series?.series_name || 'Featured series'}
              style={featureSeriesImage}
            />
          ) : (
            <div style={featureSeriesFallback}>
              <div style={featureSeriesFallbackEyebrow}>Featured Series</div>
              <div style={featureSeriesFallbackName}>
                {series?.series_name || 'Series Coming Soon'}
              </div>
            </div>
          )}
        </div>

        <div style={featureBody}>
          {series ? (
            <>
              <h3 style={featureTitle}>{series.series_name}</h3>

              <p style={featureLocation}>
                {series.region || 'Region expanding'}
              </p>

              <div style={featureDivider} />

              <div style={featureStats}>
                <div>
                  <strong>Years Active:</strong>
                  <br />
                  {yearsLabel}
                </div>
                <div>
                  <strong>Status:</strong>
                  <br />
                  Published
                </div>
              </div>

              <p style={featureDescription}>
                {series.description ||
                  'Historic touring or weekly racing series with results, champions, and archive coverage continuing to expand.'}
              </p>

              <Link href={`/series/${series.slug}`} style={featureButton}>
                View Series →
              </Link>
            </>
          ) : (
            <p style={featureLocation}>No featured series available.</p>
          )}
        </div>
      </div>
    </div>
  )
}function FeatureEventCard({ event }: { event: any }) {
  return (
    <div style={featureCard}>
      <div style={featureCardInner}>
        <div style={featureHeader}>Featured Event</div>

        <div style={featureImagePanel} />

        <div style={featureBody}>
          <h3 style={featureTitle}>
            {event?.race_date
              ? new Date(event.race_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Historic Race Event'}
          </h3>

          <p style={featureLocation}>
            {event?.track_name || event?.event_name || 'Track information coming soon'}
          </p>

          <ul style={featureList}>
            <li>Winner information to be shown</li>
            <li>Event-level archive growing</li>
            <li>Full results page coming next</li>
          </ul>

          <span style={featureButtonStatic}>See Full Results</span>
        </div>
      </div>
    </div>
  )
}

function BrowseMini({
  title,
  lines,
  href,
  isLast = false,
}: {
  title: string
  lines: string[]
  href: string
  isLast?: boolean
}) {
  return (
    <div style={{ ...browseMini, borderRight: isLast ? 'none' : browseMini.borderRight }}>
      <div style={browseMiniTitle}>{title}</div>
      <ul style={browseMiniList}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {href === '#' ? (
        <span style={miniButton}>Coming Soon</span>
      ) : (
        <Link href={href} style={miniButtonLink}>
          Open
        </Link>
      )}
    </div>
  )
}



function MediaTile({
  title,
  href,
  image,
}: {
  title: string
  href?: string
  image: string
}) {
 const tile = (
  <div
    style={{
      border: "1px solid #b7a277",
      background: "#efe7d6",
      padding: "14px",
      textAlign: "center" as const,
      cursor: href ? "pointer" : "default",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
    }}
  >
  <img
  src={image}
  alt={title}
  style={{
    width: "100%",
    height: "120px",
    objectFit: "cover",
    marginBottom: "14px",
    border: "1px solid #b7a277",
    display: "block",
  }}
/>

    <div
      style={{
        fontSize: "18px",
        fontWeight: 700,
        color: "#2f2417",
        lineHeight: 1.15,
      }}
    >
      {title}
    </div>
  </div>
)

  if (href) {
    return (
      <Link
        href={href}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
          height: "100%",
        }}
      >
        {tile}
      </Link>
    )
  }

  return tile
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
  minHeight: '470px',
  overflow: 'hidden',
  borderBottom: '3px solid #7d5a2d',
}

const heroBackground: CSSProperties = {
  objectFit: 'cover',
  objectPosition: 'center',
  filter: 'sepia(42%) brightness(88%) contrast(103%)',
  transform: 'scale(1.04)',
}

const heroOverlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(86, 56, 25, 0.10)',
}

const heroGrain: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
  opacity: 0.18,
  backgroundImage:
    'radial-gradient(circle at 20% 30%, rgba(255,255,255,.22) 0 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(60,40,20,.20) 0 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,.16) 0 1px, transparent 1px)',
  backgroundSize: '18px 18px, 24px 24px, 31px 31px',
}

const heroContent: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  padding: '34px 20px 22px',
  color: '#3b2712',
}

const heroLogo: CSSProperties = {
  width: 'min(700px, 75vw)',
  height: 'auto',
  margin: '0 auto 22px',
  display: 'block',
  filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.25))',
}

const heroTitle: CSSProperties = {
  fontSize: '64px',   // bump if not already here
  fontWeight: 700,
  lineHeight: 1.1,
  color: '#f3e4c7',
}

const spotlightPanel: CSSProperties = {
  minHeight: '220px',
  background: '#d7c09a',
  border: '2px solid #b29364',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  color: '#5b3a1b',
}

const spotlightPanelFilled: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '14px',
  display: 'grid',
  gridTemplateColumns: '1.1fr 0.9fr',
  gap: '18px',
  alignItems: 'stretch',
}

const spotlightImageWrap: CSSProperties = {
height: '360px',  
background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '10px',
}

const spotlightImage: CSSProperties = {
  width: '100%',
  height: '360px',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid #b29364',
}

const spotlightBody: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '18px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const spotlightEyebrow: CSSProperties = {
  fontSize: '13px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#7a6348',
  marginBottom: '10px',
}

const spotlightDriver: CSSProperties = {
  fontSize: '34px',
  lineHeight: 1.1,
  margin: '0 0 12px',
  color: '#2f2417',
}

const spotlightDriverLink: CSSProperties = {
  color: '#2f2417',
  textDecoration: 'none',
}

const spotlightMeta: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1.6,
  color: '#5a3a1b',
}

const spotlightTrackLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const specialEventPosterWrap: CSSProperties = {
  width: '100%',
  height: '240px',
  border: '1px solid #9d7c4c',
  background: '#b89a69',
  overflow: 'hidden',
  position: 'relative',
}

const specialEventPoster: CSSProperties = {
  width: '100%',
  height: '240px',
  objectFit: 'cover',
  objectPosition: 'center',
  display: 'block',
  filter: 'sepia(28%) contrast(1.02) brightness(0.94)',
}

const specialEventFallback: CSSProperties = {
  width: '100%',
  height: '240px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '18px',
  textAlign: 'center',
  background:
    'linear-gradient(to bottom, #d8c39d 0%, #b89a69 100%)',
  boxShadow: 'inset 0 0 0 1px rgba(92, 67, 40, 0.18)',
}

const specialEventFallbackInner: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  padding: '20px 14px',
  border: '1px solid rgba(92, 67, 40, 0.22)',
  background:
    'linear-gradient(to bottom, rgba(245, 233, 204, 0.45), rgba(214, 190, 145, 0.28))',
}

const specialEventFallbackEyebrow: CSSProperties = {
  fontSize: '12px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#7a5a31',
  marginBottom: '18px',
}

const specialEventFallbackTitle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  lineHeight: 1.2,
  color: '#2f2417',
  maxWidth: '140px',
}

const heroSubtitle: CSSProperties = {
  fontSize: '40px',
  lineHeight: 1.5,
  maxWidth: '760px',
  margin: '0 auto 10px',
  color: '#f3e4c7',
  textShadow: '0 2px 5px rgba(0,0,0,0.5)',
}
const heroRegion: CSSProperties = {
  fontSize: '25px',
  margin: '0 0 6px',
  color: '#e7d3a8',
  textShadow: '0 2px 5px rgba(0,0,0,0.5)',
}

const statsStrip: CSSProperties = {
  background: '#6d4d24',
  color: '#fff0d2',
  borderTop: '1px solid #8f6a39',
  borderBottom: '1px solid #8f6a39',
}

const statsInner: CSSProperties = {
  maxWidth: '1320px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '0',
  padding: '16px 14px',
}

const panelButtonLink: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '10px 14px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
}

const mediaTileInner: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const museumDeskGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))',
  gap: '18px',
  alignItems: 'stretch',
  marginBottom: '40px',
}

const museumPanel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px',
  minHeight: '360px',
  boxSizing: 'border-box',
  display: 'flex',
}

const museumPanelInner: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '18px',
  width: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const museumHeader: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '12px',
  color: '#5b3a1b',
}

const museumText: CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.6,
}

const museumList: CSSProperties = {
  margin: '0 0 0 18px',
  padding: 0,
  lineHeight: 1.6,
  fontSize: '15px',
}

const statItem: CSSProperties = {
  textAlign: 'center',
  padding: '8px 8px',
  borderRight: '1px solid rgba(255, 240, 210, 0.18)',
}

const statDivider: CSSProperties = {
  width: '36px',
  height: '2px',
  background: '#d9c08f',
  margin: '0 auto 10px',
}

const statLabel: CSSProperties = {
  fontSize: '20px',
  marginBottom: '8px',
}

const statValue: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '0.3px',
}

const sectionWrap: CSSProperties = {
  maxWidth: '1320px',
  margin: '0 auto',
  padding: '34px 18px 48px',
}

const sectionWrapTight: CSSProperties = {
  maxWidth: '1320px',
  margin: '0 auto',
  padding: '18px 18px 8px',
}

const newspaperWowPanel: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '0.85fr 1.15fr',
  gap: '30px',
  alignItems: 'stretch',
  background:
    'linear-gradient(135deg, #3a2a1a 0%, #6d4d24 52%, #d7bf91 100%)',
  border: '3px solid #4e3922',
  padding: '28px',
  boxShadow: '6px 6px 0 rgba(58,42,26,.22)',
  overflow: 'hidden',
}

const newspaperWowImageWrap: CSSProperties = {
  background: '#efe4ca',
  border: '2px solid #b29364',
  padding: '14px',
  aspectRatio: '0.72 / 1',
}

const newspaperWowImage: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'center top',
  display: 'block',
  filter: 'sepia(34%) contrast(1.05)',
  border: '1px solid #7a5827',
  background: '#e6d6b5',
}

const newspaperWowContent: CSSProperties = {
  background: 'rgba(255,248,234,.88)',
  border: '2px solid rgba(78,57,34,.32)',
  padding: '36px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const newspaperWowEyebrow: CSSProperties = {
  fontSize: '14px',
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  fontWeight: 900,
  color: '#7a5827',
  marginBottom: '18px',
}

const newspaperWowTitle: CSSProperties = {
  fontSize: '52px',
  lineHeight: 1,
  margin: '0 0 22px',
  color: '#24180f',
}

const newspaperWowText: CSSProperties = {
  fontSize: '20px',
  lineHeight: 1.55,
  color: '#3d2c19',
  margin: '0 0 18px',
}

const newspaperWowMetaGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
  margin: '18px 0 28px',
}

const newspaperWowMetaCard: CSSProperties = {
  background: '#efe4ca',
  border: '1px solid #b29364',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '15px',
  lineHeight: 1.35,
}

const newspaperWowButton: CSSProperties = {
  alignSelf: 'flex-start',
  background: '#3a2a1a',
  color: '#fff8ea',
  padding: '14px 22px',
  textDecoration: 'none',
  fontWeight: 800,
  border: '2px solid #24170c',
  boxShadow: '4px 4px 0 rgba(36,23,12,.18)',
}

const featureCard: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  height: '100%',
  display: 'flex',            
  flexDirection: 'column',   
}

const featureCardInner: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
  height: '100%', 
  display: 'flex',
  flexDirection: 'column',
}

const featureHeader: CSSProperties = {
  fontSize: '13px',
  fontWeight: 900,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  padding: '4px 0 14px',
  color: '#7a5a31',
}

const featureImagePanel: CSSProperties = {
  height: '190px', 
  background: 'linear-gradient(to bottom, #d8c39d, #c7ab7c)',
  border: '1px solid #b29364',
  marginBottom: '12px',
}

const featureTitle: CSSProperties = {
  fontSize: '24px',
  margin: '0 0 8px',
}

const featureLocation: CSSProperties = {
  fontSize: '16px',
  margin: '0 0 10px',
}

const featureList: CSSProperties = {
  margin: '0 0 14px 18px',
  padding: 0,
  lineHeight: 1.6,
}

const featureButton: CSSProperties = {
  background: '#7a5827',
  color: '#fff',
  padding: '10px 22px',
  textDecoration: 'none',
  fontSize: '14px',
  border: '1px solid #5d3f17',
  letterSpacing: '0.3px',
}

const featureButtonStatic: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '10px 14px',
  border: '1px solid #5d3f17',
}

const spotlightPanelThreeUp: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '14px',
  display: 'grid',
  gridTemplateColumns: '1fr 0.8fr 1fr',
  gap: '18px',
  alignItems: 'stretch',
}

const spotlightSideImageWrap: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const spotlightSideImage: CSSProperties = {
  width: '100%',
  height: '390px',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid #b29364',
}

const spotlightCenterPanel: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '22px 20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const spotlightCalloutBlock: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '30px 1fr 30px',
  alignItems: 'start',
  gap: '10px',
}

const spotlightCalloutText: CSSProperties = {
  gridColumn: '2 / 4',
}

const spotlightCalloutTextRight: CSSProperties = {
  gridColumn: '1 / 3',
  textAlign: 'right',
}

const spotlightArrowLeft: CSSProperties = {
  fontSize: '22px',
  color: '#7a5827',
  fontWeight: 700,
  textAlign: 'right',
  paddingTop: '6px',
}

const spotlightArrowRight: CSSProperties = {
  fontSize: '22px',
  color: '#7a5827',
  fontWeight: 700,
  textAlign: 'left',
  paddingTop: '6px',
}

const spotlightCalloutName: CSSProperties = {
  fontSize: '24px',
  lineHeight: 1.1,
  marginBottom: '10px',
  color: '#2f2417',
  fontWeight: 700,
}

const spotlightCalloutMeta: CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.5,
  color: '#5a3a1b',
}

const spotlightCalloutTrack: CSSProperties = {
  fontSize: '16px',
  lineHeight: 1.45,
  color: '#7a5827',
  fontWeight: 700,
  marginTop: '2px',
}

const spotlightCenterDivider: CSSProperties = {
  height: '1px',
  background: '#c2a97d',
  margin: '20px 0',
}

const browseBand: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
}

const browseMini: CSSProperties = {
  padding: '14px 16px',
  borderRight: '1px solid #b29364',
  minHeight: '122px',
}

const browseMiniTitle: CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  marginBottom: '8px',
}

const browseMiniList: CSSProperties = {
  margin: '0 0 10px 18px',
  padding: 0,
  lineHeight: 1.5,
}

const miniButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '6px 10px',
  border: '1px solid #5d3f17',
}

const miniButtonLink: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '6px 10px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
}

const mediaGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '18px',
  alignItems: 'stretch',
}

const mediaPanel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px 10px 12px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}

const panelHeader: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginBottom: '12px',
}

const mediaTiles: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '10px',
}

const photographerPoster: CSSProperties = {
  width: '100%',
  height: '240px',
  objectFit: 'cover',
  objectPosition: 'center top',
  border: '1px solid #9d7c4c',
  display: 'block',
}

const mediaTile: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '8px',
}

const mediaTileImage: CSSProperties = {
  height: '110px',
  background: '#b89a69',
  marginBottom: '8px',
}

const mediaTileLabel: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  textAlign: 'center',
}

const featureSeriesImage: CSSProperties = {
  width: '100%',
  height: '190px',
  objectFit: 'contain',
  display: 'block',
  background: '#d8c39d',
}

const featureSeriesFallback: CSSProperties = {
  width: '100%',
  height: '190px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '16px',
  background: 'linear-gradient(to bottom, #d8c39d, #c7ab7c)',
}

const featureSeriesFallbackEyebrow: CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#6a4b27',
  marginBottom: '12px',
}

const featureSeriesFallbackName: CSSProperties = {
  fontSize: '24px',
  lineHeight: 1.1,
  fontWeight: 700,
  color: '#2f2417',
}
const photographerRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '180px 1fr',
  gap: '18px',
  alignItems: 'start',
  flex: 1,
}

const cardInner: React.CSSProperties = {
  backgroundColor: '#efe6d3', // your light tan
  border: '1px solid #b8a98a',
  padding: '18px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
}

const photographerPhoto: CSSProperties = {
  height: '240px',
  background: '#b89a69',
  border: '1px solid #9d7c4c',
}

const sidePanelTextWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '100%',
  position: 'relative',
  zIndex: 2,
}

const photographerName: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  marginBottom: '8px',
  lineHeight: 1.15,
}

const photographerMeta: CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.4,
}

const spotlightTitle: CSSProperties = {
  fontSize: '34px',
  textAlign: 'center',
  marginBottom: '10px',
  marginTop: '4px',
}

const spotlightImageGrid: CSSProperties = {
  display: 'grid',
  gap: '10px',
  height: '100%',
}

const spotlightImageItem: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const spotlightImageSmall: CSSProperties = {
  width: '100%',
  height: '260px',
  objectFit: 'cover',
  border: '1px solid #b29364',
  display: 'block',
  filter: 'sepia(18%) contrast(1.02)',
  background: '#d8c39d',
}

const spotlightMiniCaption: CSSProperties = {
  fontSize: '11px',
  color: '#6a4b27',
  marginTop: '6px',
  textAlign: 'center',
  lineHeight: 1.35,
  padding: '0 6px',
}

const statsLabPanel: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.6fr 0.8fr',
  gap: '28px',
  background:
    'linear-gradient(135deg, #e8dcc1 0%, #d7bf91 100%)',
  border: '3px solid #4e3922',
  padding: '28px',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '6px 6px 0 rgba(58,42,26,.18)',
}

const statsLabLeft: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const statsLabRight: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
}

const statsLabEyebrow: CSSProperties = {
  fontSize: '14px',
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  fontWeight: 900,
  color: '#5f4528',
  marginBottom: '18px',
}

const statsLabTitle: CSSProperties = {
  fontSize: 'px72',
  lineHeight: '.95',
  margin: '0 0 24px',
  color: '#24180f',
}

const statsLabDescription: CSSProperties = {
  fontSize: '22px',
  lineHeight: 1.55,
  maxWidth: '900px',
  color: '#3d2c19',
}

const statsLabHighlights: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '18px',
  marginTop: '30px',
}

const statsLabHighlight: CSSProperties = {
  background: 'rgba(255,248,234,.45)',
  border: '1px solid rgba(91,58,27,.22)',
  padding: '18px',
}

const statsLabHighlightValue: CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  marginBottom: '8px',
  color: '#2f2417',
}

const statsLabHighlightLabel: CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.45,
  color: '#5b472f',
}

const statsLabButton: CSSProperties = {
  display: 'inline-block',
  background: '#3a2a1a',
  color: '#fff8ea',
  padding: '14px 22px',
  textDecoration: 'none',
  fontWeight: 800,
  fontSize: '15px',
  border: '2px solid #24170c',
  boxShadow: '4px 4px 0 rgba(36,23,12,.18)',
}

const statsLabRightInner: CSSProperties = {
  width: '100%',
  background: 'rgba(255,248,234,.55)',
  border: '2px solid rgba(78,57,34,.35)',
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const statsLabMiniEyebrow: CSSProperties = {
  textAlign: 'center',
  fontSize: '15px',
  fontWeight: 900,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  marginBottom: '20px',
  color: '#5f4528',
}

const statsLabNumbersGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
}

const statsLabNumberCard: CSSProperties = {
  background: '#efe4ca',
  border: '1px solid #b29364',
  minHeight: '150px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '14px',
}

const statsLabNumberValue: CSSProperties = {
  fontSize: '54px',
  fontWeight: 900,
  lineHeight: 1,
  color: '#24180f',
  marginBottom: '10px',
}

const statsLabNumberLabel: CSSProperties = {
  fontSize: '15px',
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  fontWeight: 800,
  color: '#6b512f',
}
const panelButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '10px 14px',
  border: '1px solid #5d3f17',
}
const featureDivider: CSSProperties = {
  height: '1px',
  background: '#b29364',
  margin: '14px 0',
}

const featureStats: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '14px',
  marginBottom: '14px',
}

const featureDescription: CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.5,
  marginBottom: '16px',
  color: '#3d2b16',
}
const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "30px",
  maxWidth: "1200px",
  margin: "40px auto",
}

const cardStyle = {
  textAlign: "center" as const,
}

function CategoryCard({
  title,
  image,
  link,
}: {
  title: string
  image: string
  link: string
}) {
  return (
    <Link href={link} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ textAlign: "center", cursor: "pointer" }}>
        <img
          src={image}
          alt={title}
          style={{
            width: "100%",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        />
      </div>
    </Link>
  )
}
const featureImage = {
  width: "100%",
  height: "190px",
  objectFit: "contain" as const,
  objectPosition: "center",
  display: "block",
  border: "1px solid #b89b6b",
  marginBottom: "14px",
  background: "#d8c39d",
}

const featureImagePlaceholderText = {
  fontSize: "14px",
  color: "#5b472f",
  fontStyle: "italic",
}
function formatName(name: string | null) {
  if (!name) return 'Unknown'

  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const missionSection: CSSProperties = {
  maxWidth: '1320px',
  margin: '34px auto 0',
  padding: '0 18px',
}

const missionInner: CSSProperties = {
  background:
    'linear-gradient(135deg, #efe4ca 0%, #dcc394 100%)',
  border: '3px solid #4e3922',
  padding: '42px 42px',
  textAlign: 'center',
  boxShadow: '6px 6px 0 rgba(58,42,26,.16)',
}

const missionEyebrow: CSSProperties = {
  fontSize: '14px',
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  fontWeight: 900,
  color: '#7a5827',
  marginBottom: '14px',
}

const missionTitle: CSSProperties = {
  fontSize: '42px',
  lineHeight: 1.1,
  margin: '0 0 18px',
  color: '#24180f',
}

const missionText: CSSProperties = {
  maxWidth: '980px',
  margin: '0 auto 28px',
  fontSize: '22px',
  lineHeight: 1.55,
  color: '#3d2c19',
}

const supportBox: CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
  background: 'rgba(255,248,234,.55)',
  border: '1px solid #b29364',
  padding: '24px',
}

const supportTitle: CSSProperties = {
  fontSize: '30px',
  margin: '0 0 12px',
  color: '#5b3a1b',
}

const supportText: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1.55,
  margin: '0 auto 20px',
  color: '#3d2c19',
}

const supportButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '12px 20px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
  fontWeight: 700,
}

function formatSlugName(value: string | null) {
  if (
    !value ||
    value === 'unknown' ||
    value === 'unknown-driver' ||
    value === 'unknown-track' ||
    value === 'unknown-credit' ||
    value === 'unknown-photographer'
  ) {
    return 'Unknown'
  }

  const acronymMap: Record<string, string> = {
    abc: 'ABC',
    artgo: 'ARTGO',
    asa: 'ASA',
    imca: 'IMCA',
    usac: 'USAC',
    wissota: 'WISSOTA',
    ira: 'IRA',
    wir: 'WIR',
  }

  return value
    .split('-')
    .map((w) => acronymMap[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getCreditLabel(type: string | null, fileName?: string) {
  if (fileName?.includes('_photo_')) return 'Photograph'
  if (fileName?.includes('_post_')) return 'Post'

  switch (type) {
    case 'post':
      return 'Post'
    case 'program':
      return 'Program'
    case 'flyer':
      return 'Flyer'
    default:
      return 'Photo'
  }
}

const featureBody: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  justifyContent: 'space-between', // 🔥 ADD THIS
}

const featureCaption: CSSProperties = {
  fontSize: '13px',
  marginBottom: '10px',
  color: '#5b472f',
}

const featureLogoFrame: CSSProperties = {
  width: '100%',
  height: '190px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#d8c39d',
  border: '1px solid #b29364',
  marginBottom: '14px',
  overflow: 'hidden',
}

const explorePanel: CSSProperties = {
  background:
    'linear-gradient(135deg, #e8dcc1 0%, #d7bf91 100%)',
  border: '3px solid #4e3922',
  padding: '30px',
  boxShadow: '6px 6px 0 rgba(58,42,26,.18)',
}

const exploreTop: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.4fr 0.8fr',
  gap: '24px',
  marginBottom: '28px',
}

const searchArea: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const exploreEyebrow: CSSProperties = {
  fontSize: '13px',
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  fontWeight: 900,
  color: '#7a5827',
  marginBottom: '14px',
}

const exploreTitle: CSSProperties = {
  fontSize: '42px',
  lineHeight: 1.1,
  margin: '0 0 22px',
  color: '#24180f',
}

const searchBarWrap: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
}

const searchInput: CSSProperties = {
  flex: 1,
  minWidth: '260px',
  padding: '16px 18px',
  fontSize: '18px',
  border: '2px solid #b29364',
  background: '#fff8ea',
  color: '#2f2417',
  outline: 'none',
}

const searchButton: CSSProperties = {
  background: '#3a2a1a',
  color: '#fff8ea',
  border: '2px solid #24170c',
  padding: '16px 22px',
  fontWeight: 800,
  cursor: 'pointer',
}

const archiveStatus: CSSProperties = {
  background: 'rgba(255,248,234,.55)',
  border: '2px solid rgba(78,57,34,.28)',
  padding: '22px',
}

const archiveStatusHeader: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '16px',
  color: '#5b3a1b',
}

const archiveList: CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
  lineHeight: 1.8,
  fontSize: '16px',
}

const eraSection: CSSProperties = {
  borderTop: '1px solid rgba(78,57,34,.22)',
  paddingTop: '24px',
}

const eraGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '14px',
}

const eraCard: CSSProperties = {
  background: '#efe4ca',
  border: '1px solid #b29364',
  padding: '24px 10px',
  textAlign: 'center',
  textDecoration: 'none',
  color: '#24180f',
  transition: 'all .2s ease',
}

const eraYear: CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
}

const featureLogoFallback: CSSProperties = {
  fontSize: '14px',
  color: '#5b472f',
  fontStyle: 'italic',
  textAlign: 'center',
}
const featureGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))',
  gap: '18px',
  alignItems: 'stretch',
}