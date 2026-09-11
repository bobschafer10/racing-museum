import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getPhotoUrl } from '@/lib/photos'
import TrackLogo from './tracks/[slug]/TrackLogo'
import styles from './home.module.css'

export const revalidate = 300

type StatsRow = {
  drivers_count?: number | null
  tracks_count?: number | null
  events_count?: number | null
  results_count?: number | null
}

type DriverRow = {
  driver_name?: string | null
  driver_slug?: string | null
  hometown?: string | null
  state?: string | null
  recorded_results?: number | null
  recorded_wins?: number | null
  photo_count?: number | null
}

type TrackRow = {
  track_name?: string | null
  slug?: string | null
  city?: string | null
  state?: string | null
  first_year?: number | null
  last_year?: number | null
}

type SeriesRow = {
  series_name?: string | null
  slug?: string | null
  region?: string | null
  description?: string | null
  years_active?: string | null
  first_year?: number | null
  last_year?: number | null
}

type PhotoRow = {
  file_name?: string | null
  driver_slug?: string | null
  track_slug?: string | null
  photographer_slug?: string | null
  credit_type?: string | null
  year?: string | number | null
  sequence?: number | null
}

function dailyPick<T>(items: T[]): T | null {
  if (!items.length) return null
  const day = Math.floor(Date.now() / 86_400_000)
  return items[day % items.length] ?? null
}

function photoStorageUrl(photo?: PhotoRow | null) {
  if (!photo?.file_name || !photo?.track_slug) return ''
  return getPhotoUrl(
    `photos/master/${photo.track_slug}/${photo.year || 'unknown-year'}/${photo.file_name}`,
  )
}

function formatSlugName(value?: string | null) {
  if (!value || value.startsWith('unknown')) return 'Archive photo'
  return value
    .replace(/---/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatExact(value?: number | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatApprox(value?: number | null) {
  const number = Number(value || 0)
  if (!number) return '0+'
  if (number >= 100_000) return `${Math.floor(number / 10_000) * 10_000}+`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (number >= 1_000) return `${Math.floor(number / 1_000) * 1_000}+`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (number >= 100) return `${Math.floor(number / 10) * 10}+`
  return `${number}+`
}

function trackYears(track?: TrackRow | null) {
  if (!track?.first_year && !track?.last_year) return 'Historic racing venue'
  return `${track.first_year || '?'}–${track.last_year || 'Present'}`
}

function seriesYears(series?: SeriesRow | null) {
  if (!series) return 'Historic racing series'
  if (series.years_active) return series.years_active
  if (series.first_year || series.last_year) return `${series.first_year || '?'}–${series.last_year || 'Present'}`
  return 'Historic racing series'
}

export default async function Home() {
  const [statsResult, driversResult, tracksResult, seriesResult, photosResult] = await Promise.all([
    supabase.from('homepage_stats_view').select('*').single(),
    supabase
      .from('driver_landing_directory_view')
      .select('driver_name,driver_slug,hometown,state,recorded_results,recorded_wins,photo_count')
      .gt('photo_count', 0)
      .order('recorded_wins', { ascending: false, nullsFirst: false })
      .limit(80),
    supabase.from('homepage_featured_tracks_view').select('*').limit(160),
    supabase.from('Series').select('*').eq('is_published', true).not('slug', 'is', null).limit(160),
    supabase
      .from('photos')
      .select('file_name,driver_slug,track_slug,photographer_slug,credit_type,year,sequence')
      .not('driver_slug', 'is', null)
      .not('track_slug', 'is', null)
      .not('driver_slug', 'in', '("unknown-driver","unknown")')
      .not('track_slug', 'in', '("unknown-track","unknown")')
      .order('sequence', { ascending: false, nullsFirst: false })
      .limit(180),
  ])

  const stats = (statsResult.data || {}) as StatsRow
  const drivers = (driversResult.data || []) as DriverRow[]
  const tracks = (tracksResult.data || []) as TrackRow[]
  const seriesRows = (seriesResult.data || []) as SeriesRow[]
  const photos = (photosResult.data || []) as PhotoRow[]

  const featuredDriver = dailyPick(drivers)
  const featuredTrack = dailyPick(tracks)
  const featuredSeries =
    seriesRows.find((series) => series.slug === 'tundra-super-late-model-series') ||
    dailyPick(seriesRows)

  let featuredDriverPhoto: PhotoRow | null = null
  if (featuredDriver?.driver_slug) {
    const { data } = await supabase
      .from('photos')
      .select('file_name,driver_slug,track_slug,photographer_slug,credit_type,year,sequence')
      .eq('driver_slug', featuredDriver.driver_slug)
      .not('track_slug', 'is', null)
      .not('track_slug', 'in', '("unknown-track","unknown")')
      .order('sequence', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    featuredDriverPhoto = (data || null) as PhotoRow | null
  }

  const featuredTrackPhoto = featuredTrack?.slug
    ? photos.find((photo) => photo.track_slug === featuredTrack.slug) || null
    : null

  const spotlightPhoto = dailyPick(photos.slice(0, 90))
  const supportPhoto = photos.find((photo) => photo.file_name !== spotlightPhoto?.file_name) || spotlightPhoto
  const gatewayTrackPhoto = featuredTrackPhoto || photos[2] || photos[0] || null
  const recentAdditions = photos.slice(0, 6)
  const seriesLogo = featuredSeries?.slug ? `/logos/series/${featuredSeries.slug}.jpg` : null

  const gateways = [
    {
      title: 'Drivers',
      text: 'Explore the careers, hometowns, victories, photographs, and records of the racers who made Upper Midwest racing history.',
      href: '/drivers',
      button: 'View Drivers →',
      image: featuredDriverPhoto ? photoStorageUrl(featuredDriverPhoto) : '/media/home/photographers.jpg',
      imageAlt: featuredDriver?.driver_name || 'Historic racing driver',
      icon: 'DR',
    },
    {
      title: 'Tracks',
      text: 'From hometown ovals to historic speedways, discover tracks by state and follow their history across generations.',
      href: '/tracks',
      button: 'Explore Tracks →',
      image: gatewayTrackPhoto ? photoStorageUrl(gatewayTrackPhoto) : '/media/home/event-flyers.jpg',
      imageAlt: featuredTrack?.track_name || 'Historic race track',
      icon: 'TR',
    },
    {
      title: 'Series',
      text: 'Browse sanctioning bodies, touring series, champions, standings, and full race histories from across the region.',
      href: '/series',
      button: 'View Series →',
      image: '/logos/series/tundra-super-late-model-series.jpg',
      imageAlt: 'TUNDRA Super Late Model Series',
      logo: true,
      icon: 'SR',
    },
    {
      title: 'Special Events',
      text: 'Relive marquee races such as Oktoberfest, the Slinger Nationals, WISSOTA 100, USA Nationals, and more.',
      href: '/events',
      button: 'View Events →',
      image: '/logos/series/oktoberfest-race-weekend.jpg',
      imageAlt: 'Oktoberfest Race Weekend',
      logo: true,
      icon: 'EV',
    },
    {
      title: 'Results',
      text: 'Dive into race results, feature winners, season records, and year-by-year history preserved across the museum.',
      href: '/results',
      button: 'Browse Results →',
      image: '/media/home/featured-newspaper.jpg',
      imageAlt: 'Historic racing results archive',
      icon: 'RS',
    },
    {
      title: 'Photos & Media',
      text: 'Thousands of racing photographs, newspapers, programs, flyers, yearbooks, and photographer collections.',
      href: '/media',
      button: 'Explore Media →',
      image: '/media/home/photographers.jpg',
      imageAlt: 'Historic racing photographers',
      icon: 'PH',
    },
  ]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image src="/museum-bg.png" alt="Museum hallway" fill priority className={styles.heroBg} />
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <Image
            src="/museum-logo.png"
            alt="Virtual Upper Midwest Auto Racing Museum"
            width={520}
            height={300}
            priority
            className={styles.heroLogo}
          />
          <div className={styles.heroCopy}>
            <div className={`${styles.eyebrow} ${styles.heroEyebrow}`}>A living archive of racing history</div>
            <h1 className={styles.heroTitle}>
              <span>Preserving the History of</span>
              <span>Upper Midwest Auto Racing</span>
            </h1>
            <p className={styles.heroText}>
              Explore drivers, tracks, race results, series, special events, and historic photographs — preserved for future generations.
            </p>
            <div className={styles.heroRegion}>WI • MN • Upper MI • Northern IL • Chicagoland • and beyond</div>
          </div>
        </div>
      </section>

      <section className={styles.statsBand}>
        <div className={styles.statsInner}>
          <Stat label="Drivers" value={formatApprox(stats.drivers_count)} />
          <Stat label="Tracks" value={formatApprox(stats.tracks_count)} />
          <Stat label="Race Events" value={formatApprox(stats.events_count)} />
          <Stat label="Results" value={formatApprox(stats.results_count)} />
          <Stat label="Photos & Media" value="38,000+" />
          <div className={styles.statQuote}>Every click opens another piece of racing history.</div>
        </div>
      </section>

      <div className={styles.shell}>
        <section className={styles.section}>
          <div className={styles.researchPanel}>
            <div className={styles.researchFlag} aria-hidden="true" />
            <div className={styles.researchMain}>
              <div className={styles.eyebrow}>Museum Research Collection</div>
              <h2 className={styles.researchTitle}>Victory Lane Research Center</h2>
              <p className={styles.researchText}>
                Search a growing archive of drivers, tracks, series, results, and feature-race history. Start with a driver search or jump directly into the museum’s major research collections.
              </p>
              <form action="/drivers" method="get" className={styles.searchForm}>
                <input
                  className={styles.searchInput}
                  type="search"
                  name="q"
                  aria-label="Search drivers"
                  placeholder="Search a driver name…"
                />
                <button type="submit" className={styles.searchButton}>Search</button>
              </form>
              <div className={styles.quickLinks}>
                <Link href="/stats/feature-winners">Feature Win Research →</Link>
                <Link href="/tracks">Tracks by State →</Link>
                <Link href="/series">Series Archive →</Link>
                <Link href="/events">Special Events →</Link>
              </div>
            </div>
            <aside className={styles.numberPanel}>
              <div className={styles.smallEyebrow}>Museum by the Numbers</div>
              <div className={styles.numberGrid}>
                <NumberCell value={formatExact(stats.results_count)} label="Archive Results" />
                <NumberCell value={formatExact(stats.drivers_count)} label="Drivers" />
                <NumberCell value={formatExact(stats.tracks_count)} label="Tracks" />
                <NumberCell value="1903–2026" label="Coverage" />
              </div>
              <p className={styles.numberNote}>More than a century of racing history, preserved and growing.</p>
            </aside>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Explore the Museum</h2>
            <div className={styles.sectionNote}>Six gateways into Upper Midwest racing history</div>
          </div>
          <div className={styles.gatewayGrid}>
            {gateways.map((gateway) => (
              <article key={gateway.title} className={styles.gatewayCard}>
                <div className={`${styles.gatewayMedia} ${gateway.logo ? styles.gatewayMediaLogo : ''}`}>
                  {gateway.image ? (
                    <img src={gateway.image} alt={gateway.imageAlt} />
                  ) : (
                    <div className={styles.gatewayIcon}>{gateway.icon}</div>
                  )}
                </div>
                <div className={styles.gatewayBody}>
                  <h3 className={styles.gatewayTitle}>{gateway.title}</h3>
                  <p className={styles.gatewayText}>{gateway.text}</p>
                  <Link href={gateway.href} className={styles.cardButton}>{gateway.button}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.twoCol}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Recently Added to the Archive</h3>
                <Link href="/photos">View Latest →</Link>
              </div>
              <div className={styles.recentList}>
                {recentAdditions.length ? recentAdditions.map((photo, index) => (
                  <div key={`${photo.file_name}-${index}`} className={styles.recentRow}>
                    <span className={styles.recentDate}>
                      {photo.sequence ? `#${photo.sequence.toLocaleString('en-US')}` : 'Latest'}
                    </span>
                    <span className={styles.recentText}>
                      New photo: {formatSlugName(photo.driver_slug)} at {formatSlugName(photo.track_slug)}
                    </span>
                    <span className={styles.badge}>Photo</span>
                  </div>
                )) : (
                  <div className={styles.recentRow}>
                    <span className={styles.recentDate}>Archive</span>
                    <span className={styles.recentText}>New racing history is being added throughout the museum.</span>
                    <span className={styles.badge}>New</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Featured From the Archive</h3>
                <Link href="/photos">Browse Archive →</Link>
              </div>
              <div className={styles.featureGrid}>
                <article className={styles.featureCard}>
                  <div className={styles.featureLabel}>Featured Driver</div>
                  <div className={styles.featureMedia}>
                    {featuredDriverPhoto ? (
                      <img src={photoStorageUrl(featuredDriverPhoto)} alt={featuredDriver?.driver_name || 'Featured driver'} />
                    ) : (
                      <div className={styles.gatewayIcon}>DR</div>
                    )}
                  </div>
                  <div className={styles.featureBody}>
                    <h4 className={styles.featureTitle}>{featuredDriver?.driver_name || 'Driver Archive'}</h4>
                    <div className={styles.featureMeta}>
                      {[featuredDriver?.hometown, featuredDriver?.state].filter(Boolean).join(', ') || 'Upper Midwest'}
                    </div>
                    <p className={styles.featureText}>
                      {featuredDriver ? `${formatExact(featuredDriver.recorded_wins)} recorded feature wins in the museum archive.` : 'Discover thousands of driver profiles.'}
                    </p>
                    <Link href={featuredDriver?.driver_slug ? `/drivers/${featuredDriver.driver_slug}` : '/drivers'} className={styles.smallButton}>
                      View Profile →
                    </Link>
                  </div>
                </article>

                <article className={styles.featureCard}>
                  <div className={styles.featureLabel}>Featured Track</div>
                  <div className={`${styles.featureMedia} ${styles.featureMediaLogo}`}>
                    {featuredTrack?.slug ? (
                      featuredTrackPhoto ? (
                        <img src={photoStorageUrl(featuredTrackPhoto)} alt={featuredTrack.track_name || 'Featured track'} />
                      ) : (
                        <TrackLogo slug={featuredTrack.slug} trackName={featuredTrack.track_name || 'Featured track'} />
                      )
                    ) : (
                      <div className={styles.gatewayIcon}>TR</div>
                    )}
                  </div>
                  <div className={styles.featureBody}>
                    <h4 className={styles.featureTitle}>{featuredTrack?.track_name || 'Track Archive'}</h4>
                    <div className={styles.featureMeta}>
                      {[featuredTrack?.city, featuredTrack?.state].filter(Boolean).join(', ') || 'Upper Midwest'}
                    </div>
                    <p className={styles.featureText}>{trackYears(featuredTrack)}</p>
                    <Link href={featuredTrack?.slug ? `/tracks/${featuredTrack.slug}` : '/tracks'} className={styles.smallButton}>
                      View Track →
                    </Link>
                  </div>
                </article>

                <article className={styles.featureCard}>
                  <div className={styles.featureLabel}>Featured Series</div>
                  <div className={`${styles.featureMedia} ${styles.featureMediaLogo}`}>
                    {seriesLogo ? <img src={seriesLogo} alt={featuredSeries?.series_name || 'Featured series'} /> : <div className={styles.gatewayIcon}>SR</div>}
                  </div>
                  <div className={styles.featureBody}>
                    <h4 className={styles.featureTitle}>{featuredSeries?.series_name || 'Series Archive'}</h4>
                    <div className={styles.featureMeta}>{featuredSeries?.region || 'Upper Midwest'}</div>
                    <p className={styles.featureText}>{seriesYears(featuredSeries)}</p>
                    <Link href={featuredSeries?.slug ? `/series/${featuredSeries.slug}` : '/series'} className={styles.smallButton}>
                      Explore Series →
                    </Link>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="support-museum" className={styles.section}>
          <div className={styles.supportMilestone}>
            <div className={styles.supportPanel}>
              {supportPhoto ? (
                <img className={styles.supportImage} src={photoStorageUrl(supportPhoto)} alt="Upper Midwest racing history" />
              ) : (
                <img className={styles.supportImage} src="/media/home/event-flyers.jpg" alt="Historic racing archive material" />
              )}
              <div>
                <div className={styles.eyebrow}>Preserving Racing History</div>
                <h2 className={styles.supportTitle}>A Living Archive for Upper Midwest Auto Racing</h2>
                <p className={styles.supportText}>
                  The museum preserves the drivers, tracks, series, special events, photographs, newspapers, programs, and results that tell the story of racing across the region. Have something that belongs in the archive? Help us preserve it.
                </p>
                <a
                  className={styles.primaryButton}
                  href="mailto:autoracinghistory@gmail.com?subject=Museum Information Submission"
                >
                  Support the Archive →
                </a>
              </div>
            </div>

            <div className={styles.milestonePanel}>
              <div className={styles.eyebrow}>Museum Research Tools</div>
              <h2 className={styles.milestoneTitle}>Career Feature Win Milestones</h2>
              <p className={styles.milestoneText}>
                Follow the drivers who reached the region’s great career win marks — and the racers closing in on the next milestone.
              </p>
              <div className={styles.milestoneLinks}>
                <div className={styles.milestoneChip}>100+ Wins</div>
                <div className={styles.milestoneChip}>300+ Wins</div>
                <div className={styles.milestoneChip}>500+ Wins</div>
              </div>
              <Link href="/milestones" className={styles.primaryButton}>View Milestone Watch →</Link>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.mediaSpotlight}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Media & Archive Collections</h3>
                <Link href="/media">Explore All →</Link>
              </div>
              <div className={styles.collectionGrid}>
                <CollectionCard title="Newspapers" text="Historic news coverage and racing pages." href="/media/newspapers" image="/media/home/newspapers.jpg" />
                <CollectionCard title="Yearbooks" text="Track programs, yearbooks, and publications." href="/media/race-programs" image="/media/home/race-programs.jpg" />
                <CollectionCard title="Photographers" text="Collections from the people behind the lens." href="/photographers" image="/media/home/photographers.jpg" />
                <CollectionCard title="Special Events" text="Marquee races and event histories in one place." href="/events" image="/logos/series/slinger-nationals.jpg" />
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Photo Spotlight</h3>
                <Link href="/photos">Browse Photos →</Link>
              </div>
              <div className={styles.spotlightBody}>
                {spotlightPhoto ? (
                  <>
                    <Link href="/photos">
                      <img
                        className={styles.spotlightImage}
                        src={photoStorageUrl(spotlightPhoto)}
                        alt={`${formatSlugName(spotlightPhoto.driver_slug)} at ${formatSlugName(spotlightPhoto.track_slug)}`}
                      />
                    </Link>
                    <div className={styles.spotlightCaption}>
                      <strong>{formatSlugName(spotlightPhoto.driver_slug)}</strong>
                      <span>
                        {formatSlugName(spotlightPhoto.track_slug)}
                        {spotlightPhoto.year && spotlightPhoto.year !== 'unknown-year' ? ` • ${spotlightPhoto.year}` : ''}
                        {spotlightPhoto.photographer_slug && !spotlightPhoto.photographer_slug.startsWith('unknown')
                          ? ` • ${formatSlugName(spotlightPhoto.photographer_slug)}`
                          : ''}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className={styles.featureText}>Photo spotlight coming soon.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="museum-desk" className={styles.footerDesk}>
        <div className={styles.footerInner}>
          <div className={styles.footerCell}>
            <div className={styles.smallEyebrow}>Museum Desk</div>
            <h2 className={styles.footerTitle}>Keep Racing History Moving Forward</h2>
            <p>Information, updates, corrections, and ways to help preserve the archive.</p>
          </div>
          <div className={styles.footerCell}>
            <h3 className={styles.footerTitle}>Contact / Follow</h3>
            <p><a href="mailto:autoracinghistory@gmail.com">autoracinghistory@gmail.com</a></p>
            <p>
              <a href="https://www.facebook.com/uppermidwestautoracingmuseum" target="_blank" rel="noopener noreferrer">
                Follow the Museum on Facebook
              </a>
            </p>
          </div>
          <div className={styles.footerCell}>
            <h3 className={styles.footerTitle}>Most Recent Additions</h3>
            <p>See what has just been added to the photo and racing-history archive.</p>
            <p><Link href="/photos">View Latest Additions →</Link></p>
          </div>
          <div className={styles.footerCell}>
            <h3 className={styles.footerTitle}>What Doors Will Open Next</h3>
            <ul>
              <li>Expanded photographer archives</li>
              <li>More special-event histories</li>
              <li>Track and series timelines</li>
              <li>More year-by-year results</li>
            </ul>
            <p><Link href="/media">Explore the Collections →</Link></p>
          </div>
        </div>
        <div className={styles.bottomBar}>
          Virtual Upper Midwest Auto Racing Museum • Preserving Our Past. Fueling Tomorrow.
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  )
}

function NumberCell({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.numberCell}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function CollectionCard({
  title,
  text,
  href,
  image,
}: {
  title: string
  text: string
  href: string
  image: string
}) {
  return (
    <Link href={href} className={styles.collectionCard}>
      <img src={image} alt={title} />
      <div className={styles.collectionBody}>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </Link>
  )
}
