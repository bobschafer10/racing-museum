import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { getPhotoUrl } from '@/lib/photos'
import styles from './room.module.css'
import { BOB_PORTRAIT } from './bobPortrait'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Bob Bergeron | Media Member of the Month | Upper Midwest Auto Racing Museum',
  description: 'The inaugural Media Member of the Month room honoring photographer, writer, and racing-media contributor Bob Bergeron.',
}

type PhotoRow = {
  photo_id: number
  file_name: string
  track_slug: string | null
  driver_slug: string | null
  year: string | null
  photographer_slug: string | null
  credit_type: string | null
  sequence: number | null
  needs_review: boolean | null
}

type TrackSummary = {
  slug: string
  count: number
  identified: number
  dated: number
}

const BOB_SLUGS = ['bob-bergeron', 'bob-bergeronr']
const HERO_FILE = 'leos-speedway_1967_harlin-krueger_bob-bergeron_photo_001.jpg'
const PERIOD_PROFILE_URL = getPhotoUrl(
  'photos/master/unknown-track/unknown-year/unknown-track_unknown-year_bob-bergeron-fox-valley-new_bob-bergeron_post_001.jpg',
)
const WISCONSIN_MAP_URL = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Wi_outline.png'
const WISCONSIN_MAP_CREDIT_URL = 'https://commons.wikimedia.org/wiki/File:Wi_outline.png'

const TRACK_MAP_POSITIONS: Record<string, { left: string; top: string }> = {
  'leos-speedway': { left: '71%', top: '49%' },
  'wisconsin-international-raceway': { left: '76%', top: '45%' },
  'brown-county-speedway': { left: '80%', top: '37%' },
  'shawano-speedway': { left: '65%', top: '34%' },
  'seymour-speedway': { left: '73%', top: '39%' },
  'outagamie-speedway': { left: '72%', top: '44%' },
  'golden-sands-speedway': { left: '53%', top: '51%' },
  'oregon-legion-speedway': { left: '58%', top: '76%' },
  '141-speedway': { left: '84%', top: '41%' },
  'beaver-dam-raceway': { left: '63%', top: '63%' },
  'shiocton-speedway': { left: '66%', top: '42%' },
}

const FEATURED_FILES = [
  '141-speedway_1972_ron-van-roy_bob-bergeron_photo_001.jpg',
  'brown-county-speedway_1972_jj-smith_bob-bergeron_photo_001.jpg',
  'shawano-speedway_1970_doug-larson_bob-bergeron_photo_001.jpg',
  'wisconsin-international-raceway_1981_jim-sauter_bob-bergeron_photo_001.jpg',
  'outagamie-speedway_1970_leroy-arnold_bob-bergeron_photo_555.png',
  'seymour-speedway_1972_doug-larson_bob-bergeron_photo_001.jpg',
  'oregon-legion-speedway_1965_john-mcfaul_bob-bergeron_photo_44.jpg',
  HERO_FILE,
]

function roomSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}

function fmt(value: string | null | undefined, fallback = 'Unknown') {
  if (!value || value === 'unknown-driver' || value === 'unknown-track' || value === 'unknown-year') return fallback
  return value
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function imageUrl(photo: PhotoRow) {
  const track = photo.track_slug || 'unknown-track'
  const year = photo.year || 'unknown-year'
  return getPhotoUrl(`photos/master/${track}/${year}/${photo.file_name}`)
}

function isKnownYear(value: string | null) {
  return Boolean(value && /^\d{4}$/.test(value))
}

function buildTrackSummary(rows: PhotoRow[]): TrackSummary[] {
  const map = new Map<string, TrackSummary>()

  rows.forEach((row) => {
    if (!row.track_slug || row.track_slug === 'unknown-track') return
    const current = map.get(row.track_slug) || { slug: row.track_slug, count: 0, identified: 0, dated: 0 }
    current.count += 1
    if (row.driver_slug && row.driver_slug !== 'unknown-driver') current.identified += 1
    if (isKnownYear(row.year)) current.dated += 1
    map.set(row.track_slug, current)
  })

  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
}

function PhotoCard({ photo }: { photo: PhotoRow }) {
  const driverKnown = Boolean(photo.driver_slug && photo.driver_slug !== 'unknown-driver')
  const trackKnown = Boolean(photo.track_slug && photo.track_slug !== 'unknown-track')

  return (
    <article className={styles.photoCard}>
      <Link href={`/photo/${encodeURIComponent(photo.file_name)}`} className={styles.photoLink}>
        <img src={imageUrl(photo)} alt={`${fmt(photo.driver_slug, 'Unidentified driver')} — ${fmt(photo.track_slug, 'Track unknown')}`} loading="lazy" />
      </Link>
      <div className={styles.photoMeta}>
        <h3>{driverKnown ? fmt(photo.driver_slug) : 'Unknown Driver'}</h3>
        <p>{trackKnown ? fmt(photo.track_slug) : 'Track unknown'} <span>•</span> {isKnownYear(photo.year) ? photo.year : 'Unknown Year'}</p>
        <em>Photo by Bob Bergeron</em>
      </div>
    </article>
  )
}

export default async function BobBergeronMediaMemberRoom() {
  const roomSupabase = roomSupabaseClient()
  const { data, error } = await roomSupabase
    .from('photos')
    .select('photo_id,file_name,track_slug,driver_slug,year,photographer_slug,credit_type,sequence,needs_review')
    .in('photographer_slug', BOB_SLUGS)
    .order('photo_id', { ascending: true })
    .limit(1000)

  if (error) console.error('[Bob Bergeron room] photo query failed:', error.message)

  const rows = (data || []) as PhotoRow[]
  const totalItems = rows.length
  const explicitPhotos = rows.filter((row) => row.credit_type === 'photo').length
  const identifiedDrivers = new Set(rows.map((row) => row.driver_slug).filter((slug) => slug && slug !== 'unknown-driver')).size
  const unknownDrivers = rows.filter((row) => row.driver_slug === 'unknown-driver').length
  const unknownYears = rows.filter((row) => !isKnownYear(row.year)).length
  const datedYears = rows.map((row) => Number(row.year)).filter((year) => Number.isFinite(year) && year > 1900 && year < 2100)
  const earliestYear = datedYears.length ? Math.min(...datedYears) : null
  const latestYear = datedYears.length ? Math.max(...datedYears) : null
  const tracks = buildTrackSummary(rows)
  const hero = rows.find((row) => row.file_name === HERO_FILE) || rows.find((row) => row.driver_slug !== 'unknown-driver') || rows[0]

  const featuredByFile = new Map(rows.map((row) => [row.file_name, row]))
  const featured = FEATURED_FILES.map((file) => featuredByFile.get(file)).filter(Boolean) as PhotoRow[]
  const gallery = featured.length >= 4
    ? featured.slice(0, 4)
    : rows.filter((row) => row.driver_slug !== 'unknown-driver' && isKnownYear(row.year)).slice(0, 4)
  const identify = rows.filter((row) => row.driver_slug === 'unknown-driver').slice(0, 4)
  const filmstrip = rows.filter((row) => isKnownYear(row.year)).slice(0, 10)
  const range = earliestYear && latestYear ? `${earliestYear} – ${latestYear}` : 'Date range developing'

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        style={hero ? { backgroundImage: `linear-gradient(90deg, rgba(5,6,6,.9), rgba(5,6,6,.44) 55%, rgba(5,6,6,.2)), url(${imageUrl(hero)})` } : undefined}
      >
        <div className={styles.heroPortraitWrap}>
          <img src={BOB_PORTRAIT} alt="Bob Bergeron" className={styles.heroPortrait} />
        </div>

        <div className={styles.heroCopyWrap}>
          <div className={styles.heroRibbon}>Media Member of the Month</div>
          <h1>Bob Bergeron</h1>
          <p>Preserving racing history<br />through the lens</p>
        </div>

        <div className={styles.heroNote}>
          <strong>{totalItems.toLocaleString()} Photos</strong>
          <strong>{tracks.length.toLocaleString()} Tracks</strong>
          <span>{range}</span>
        </div>
      </section>

      <nav className={styles.roomNav} aria-label="Bob Bergeron room navigation">
        <a href="#overview">Overview</a>
        <a href="#featured-photos">Featured Photos</a>
        <a href="#tracks">Tracks</a>
        <a href="#identify-drivers">Drivers</a>
        <a href="#racing-press">Racing Press</a>
        <a href="#identify-drivers">Identify These Drivers</a>
        <Link href="/photographers/bob-bergeron">All {totalItems.toLocaleString()} Photos</Link>
      </nav>

      <div className={styles.roomBody}>
        <section id="overview" className={`${styles.paperPanel} ${styles.overviewPanel}`}>
          <div className={styles.aboutCopy}>
            <div className={styles.redHeading}>About Bob Bergeron</div>
            <p>
              Bob Bergeron was a dedicated racing photographer and writer who helped document the rich history of Upper Midwest short track racing.
              His photographs capture the cars, drivers, tracks and fans that made this era special, while his writing in the regional racing press gave fans deeper insight into the sport he loved.
            </p>
            <p>
              A surviving period profile called Bergeron the publication&apos;s <strong>“ace camera man.”</strong> It identified him as being from Kaukauna, Wisconsin,
              said he was 20 years old at the time, and noted that he also wrote a weekly column for <em>Racing Wheels</em>.
            </p>
            <p>
              Through hundreds of photographs and numerous articles — including his recurring <em>Badger Bulletin</em> — Bob&apos;s work remains an important part of our region&apos;s racing history.
            </p>
          </div>

          <div className={styles.collectionStats}>
            <div className={styles.blueHeading}>The Collection</div>
            <div><b>{totalItems.toLocaleString()}</b><span>Photos</span></div>
            <div><b>{tracks.length.toLocaleString()}</b><span>Tracks</span></div>
            <div><b>{identifiedDrivers.toLocaleString()}</b><span>Identified Drivers</span></div>
            <div><b>{range}</b><span>Known Date Range</span></div>
          </div>

          <figure className={styles.portraitCard}>
            <a href={PERIOD_PROFILE_URL} target="_blank" rel="noreferrer">
              <img
                src={`${PERIOD_PROFILE_URL}?v=room001-period-portrait-20261015b`}
                alt="Bob Bergeron period profile"
              />
            </a>
            <figcaption>Bob Bergeron, period profile</figcaption>
          </figure>
        </section>

        <section id="featured-photos" className={styles.featureSection}>
          <div className={styles.sectionTitleRow}>
            <div className={styles.redBanner}>Featured Photos</div>
            <Link href="/photographers/bob-bergeron" className={styles.redButton}>View All {totalItems.toLocaleString()} Photos →</Link>
          </div>
          <div className={styles.featureGrid}>
            {gallery.map((photo) => <PhotoCard key={photo.photo_id} photo={photo} />)}
          </div>
        </section>

        <section className={styles.twoColumnSection}>
          <div id="tracks" className={styles.paperPanel}>
            <div className={styles.redHeading}>Tracks in the Collection</div>
            <div className={styles.trackListGrid}>
              <div className={`${styles.trackMap} bob-track-map`}>
                <img className="bob-wisconsin-map" src={WISCONSIN_MAP_URL} alt="Outline map of Wisconsin" />
                <span className="bob-map-state-label" aria-hidden="true">WI</span>
                {tracks.slice(0, 11).map((track) => {
                  const position = TRACK_MAP_POSITIONS[track.slug]
                  if (!position) return null
                  return (
                    <span
                      key={track.slug}
                      className="bob-map-dot"
                      style={position}
                      title={fmt(track.slug)}
                      aria-hidden="true"
                    />
                  )
                })}
              </div>
              <ul>
                {tracks.slice(0, 11).map((track) => (
                  <li key={track.slug}><Link href={`/tracks/${track.slug}`}>{fmt(track.slug)}</Link></li>
                ))}
                {tracks.length > 11 ? <li>Other / Unknown</li> : null}
              </ul>
            </div>
            <div className="bob-map-credit">
              <a href={WISCONSIN_MAP_CREDIT_URL} target="_blank" rel="noreferrer">Wisconsin outline: CS-PROS / Wikimedia Commons, CC BY-SA 3.0</a>
            </div>
            <Link href="/photos?photographer=bob-bergeron" className={styles.redButton}>View Photos by Track →</Link>
          </div>

          <div id="racing-press" className={styles.paperPanel}>
            <div className={styles.blueBanner}>Racing Press &amp; Writing</div>

            <figure style={{ margin: '4px 0 14px', padding: 8, background: '#f5ead0', border: '1px solid #aa9979', boxShadow: '0 3px 8px rgba(0,0,0,.18)' }}>
              <a href={PERIOD_PROFILE_URL} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                <img
                  src={`${PERIOD_PROFILE_URL}?v=room001-ace-camera-man-20261015`}
                  alt="Period Bob Bergeron profile clipping calling him the ace camera man"
                  style={{ display: 'block', width: '100%', maxHeight: 430, objectFit: 'contain', background: '#d9ccb0' }}
                />
              </a>
              <figcaption style={{ padding: '7px 4px 2px', fontFamily: 'Georgia, Times New Roman, serif', fontSize: 13, fontStyle: 'italic' }}>
                Period profile of Bob Bergeron — “our ace camera man.” Click to enlarge.
              </figcaption>
            </figure>

            <div className={styles.pressMastheads}>
              <div><strong>Midwest Racing News</strong><span>By Bob Bergeron</span><em>Badger Bulletin</em></div>
              <div><strong>Checkered Flag Racing News</strong><span>Photos by Bob Bergeron</span></div>
            </div>
            <p>
              Bob Bergeron was a contributing writer for <em>Midwest Racing News</em> in 1966–68, including his recurring <em>Badger Bulletin</em>.
              By 1970–71, his photographs regularly appeared in both <em>Midwest Racing News</em> and <em>Checkered Flag Racing News</em>.
            </p>
            <div className={styles.pressFacts}>
              <span><b>June 30, 1966</b> — KK Sports Arena report by Bob Bergeron</span>
              <span><b>July 7, 1966</b> — Badger Bulletin on the Fox Valley Stock Car Club</span>
              <span><b>1970–71</b> — repeated Bergeron and Bergeron &amp; Deitz photo credits</span>
            </div>
            <a href="#press-research" className={styles.redButton}>Read the Full Story →</a>
          </div>
        </section>

        <section id="identify-drivers" className={styles.identifyRow}>
          <div className={styles.paperPanel}>
            <div className={styles.redHeading}>Can You Identify These Drivers?</div>
            <div className={styles.identifyTopline}>
              <p>There are {unknownDrivers.toLocaleString()} Bob Bergeron photos with unidentified drivers. Can you help us put names to these faces and cars?</p>
              <Link href="/photos?photographer=bob-bergeron&driver=unknown-driver" className={styles.redButton}>View Unidentified Photos →</Link>
            </div>
            <div className={styles.identifyGrid}>
              {identify.map((photo) => (
                <Link href={`/photo/${encodeURIComponent(photo.file_name)}`} key={photo.photo_id} className={styles.identifyCard}>
                  <img src={imageUrl(photo)} alt="Unidentified driver from the Bob Bergeron collection" loading="lazy" />
                  <span>{fmt(photo.track_slug, 'Track unknown')} • {isKnownYear(photo.year) ? photo.year : 'Year unknown'}</span>
                </Link>
              ))}
            </div>
          </div>

          <aside className={styles.quotePanel}>
            <span className={styles.quoteMark}>“</span>
            <p>
              Bob&apos;s photographs give us a front-row seat to a special time in Upper Midwest racing. His work not only captured the action, but also the people, places and atmosphere that made our local tracks so unique.
            </p>
            <strong>Upper Midwest Racing History Museum</strong>
            <img src={BOB_PORTRAIT} alt="Bob Bergeron" />
          </aside>
        </section>

        <section id="press-research" className={`${styles.paperPanel} ${styles.researchPanel}`}>
          <div className={styles.redHeading}>Research Notes &amp; Primary Sources</div>
          <div className={styles.researchColumns}>
            <div>
              <h3>Period profile</h3>
              <p>
                The original clipping shown above identifies Bergeron as the publication&apos;s “ace camera man,” from Kaukauna, age 20, with photographs of nearly every car in the club.
                It also says he wrote a weekly column for <em>Racing Wheels</em>. The museum is displaying the primary source itself rather than only paraphrasing it.
              </p>
            </div>
            <div>
              <h3>Fox Valley Racing News</h3>
              <p>
                Fox Valley Racing News remains an important part of the Bergeron research trail. The museum will continue separating confirmed Bergeron credits from publication material until a byline, caption or other primary source identifies his role.
              </p>
            </div>
            <div>
              <h3>Archive status</h3>
              <p>
                {explicitPhotos.toLocaleString()} records are explicitly typed as photographs, {unknownYears.toLocaleString()} items still need a confirmed year, and the unidentified-driver queue remains active.
              </p>
            </div>
          </div>
        </section>
      </div>

      {filmstrip.length > 0 ? (
        <div className={styles.filmstrip} aria-label="Bob Bergeron photo filmstrip">
          {filmstrip.map((photo) => (
            <Link href={`/photo/${encodeURIComponent(photo.file_name)}`} key={photo.photo_id}>
              <img src={imageUrl(photo)} alt={fmt(photo.driver_slug, 'Bob Bergeron archive photo')} loading="lazy" />
            </Link>
          ))}
        </div>
      ) : null}
    </main>
  )
}
