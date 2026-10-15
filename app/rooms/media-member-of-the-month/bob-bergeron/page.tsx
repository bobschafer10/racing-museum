import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getPhotoUrl } from '@/lib/photos'
import styles from './room.module.css'

export const revalidate = 43200

export const metadata: Metadata = {
  title: 'Bob Bergeron | Media Member of the Month | Upper Midwest Auto Racing Museum',
  description: 'The inaugural Media Member of the Month exhibit honoring photographer, writer, and racing-media contributor Bob Bergeron.',
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
const FEATURED_FILES = [
  HERO_FILE,
  'wisconsin-international-raceway_1981_jim-sauter_bob-bergeron_photo_001.jpg',
  'brown-county-speedway_1972_jj-smith_bob-bergeron_photo_001.jpg',
  'outagamie-speedway_1970_leroy-arnold_bob-bergeron_photo_555.png',
  'shawano-speedway_1970_doug-larson_bob-bergeron_photo_001.jpg',
  'seymour-speedway_1972_doug-larson_bob-bergeron_photo_001.jpg',
  '141-speedway_1972_ron-van-roy_bob-bergeron_photo_001.jpg',
  'oregon-legion-speedway_1965_john-mcfaul_bob-bergeron_photo_44.jpg',
]

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

function GalleryCard({ photo }: { photo: PhotoRow }) {
  const driverKnown = Boolean(photo.driver_slug && photo.driver_slug !== 'unknown-driver')
  const trackKnown = Boolean(photo.track_slug && photo.track_slug !== 'unknown-track')

  return (
    <article className={styles.photoCard}>
      <Link href={`/photo/${encodeURIComponent(photo.file_name)}`} className={styles.photoLink}>
        <img src={imageUrl(photo)} alt={`${fmt(photo.driver_slug, 'Unidentified driver')} — ${fmt(photo.track_slug, 'Track unknown')}`} loading="lazy" />
      </Link>
      <div className={styles.photoMeta}>
        <div className={styles.photoYear}>{isKnownYear(photo.year) ? photo.year : 'Year unknown'}</div>
        <h3>
          {driverKnown ? <Link href={`/drivers/${photo.driver_slug}`}>{fmt(photo.driver_slug)}</Link> : 'Unidentified driver'}
        </h3>
        <p>
          {trackKnown ? <Link href={`/tracks/${photo.track_slug}`}>{fmt(photo.track_slug)}</Link> : 'Track unknown'}
        </p>
        <span>Photo credit: Bob Bergeron</span>
      </div>
    </article>
  )
}

export default async function BobBergeronMediaMemberRoom() {
  const { data } = await supabase
    .from('photos')
    .select('photo_id,file_name,track_slug,driver_slug,year,photographer_slug,credit_type,sequence,needs_review')
    .in('photographer_slug', BOB_SLUGS)
    .limit(1000)

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
  const gallery = featured.length >= 6
    ? featured
    : rows.filter((row) => row.driver_slug !== 'unknown-driver' && isKnownYear(row.year)).slice(0, 8)
  const identify = rows.filter((row) => row.driver_slug === 'unknown-driver').slice(0, 8)

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        style={hero ? { backgroundImage: `linear-gradient(90deg, rgba(12,8,5,.97), rgba(12,8,5,.78) 53%, rgba(12,8,5,.35)), url(${imageUrl(hero)})` } : undefined}
      >
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span><Link href="/rooms">Museum Rooms</Link><span>›</span><span>Media Member of the Month</span>
          </div>
          <div className={styles.kicker}>Media Member of the Month • Inaugural Honoree</div>
          <h1>Bob Bergeron</h1>
          <p className={styles.heroLine}>Photographer. Writer. A firsthand witness to the Fox Valley racing scene.</p>
          <p className={styles.heroCopy}>
            Bob Bergeron helped preserve Upper Midwest racing from ground level — photographing drivers and cars,
            reporting from the tracks, and contributing to the regional racing press. This room brings his surviving museum material together as one growing historical record.
          </p>
          <div className={styles.heroActions}>
            <Link href="/photographers/bob-bergeron" className={styles.primaryButton}>Open Complete Bergeron Archive</Link>
            <Link href="/photos?photographer=bob-bergeron&driver=unknown-driver" className={styles.secondaryButton}>Identify Bergeron Drivers</Link>
          </div>
        </div>
      </section>

      <section className={styles.stats} aria-label="Bob Bergeron museum collection statistics">
        <div><strong>{totalItems.toLocaleString()}</strong><span>Archived Bergeron Items</span></div>
        <div><strong>{tracks.length.toLocaleString()}</strong><span>Known Tracks</span></div>
        <div><strong>{unknownDrivers.toLocaleString()}</strong><span>Drivers Still Unidentified</span></div>
        <div><strong>{earliestYear && latestYear ? `${earliestYear}–${latestYear}` : '—'}</strong><span>Known Dated Range</span></div>
      </section>

      <section className={styles.introSection}>
        <div className={styles.sectionLabel}>Who Was Bob Bergeron?</div>
        <div className={styles.introGrid}>
          <div>
            <h2>A young photographer already recognized inside the racing world.</h2>
            <p>
              A surviving period profile describes Bob Bergeron as the publication&apos;s “ace camera man.” It identifies him as being from Kaukauna, Wisconsin,
              says he was 20 years old at the time, and credits him with producing much of the publication&apos;s racing photography.
            </p>
            <p>
              The same profile says Bergeron also wrote a weekly column for <em>Racing Wheels</em>, described there as a West Coast paper.
              It notes that he had photographed nearly every car in the club and invited owners and drivers to find him in the pits for copies and enlargements.
            </p>
            <p>
              That small piece of period writing changes the picture considerably: Bergeron was not simply taking occasional snapshots.
              He was already functioning as a photographer, writer, and racing-media contributor while still a very young man.
            </p>
          </div>
          <aside className={styles.researchBox}>
            <div className={styles.researchKicker}>Period Source</div>
            <strong>“Ace camera man”</strong><span>How Bergeron was described in the surviving profile.</span>
            <strong>Kaukauna</strong><span>His hometown as identified by the period source.</span>
            <strong>Age 20</strong><span>His age when that profile was published; the exact issue date is still being verified.</span>
          </aside>
        </div>
      </section>

      <section className={styles.introSection}>
        <div className={styles.sectionLabel}>The Museum Collection</div>
        <div className={styles.introGrid}>
          <div>
            <h2>A racing-media footprint that reaches beyond a photo credit.</h2>
            <p>
              Bergeron&apos;s museum collection is centered in Wisconsin&apos;s Fox Valley and northeastern Wisconsin racing scene.
              Leo&apos;s Speedway, Wisconsin International Raceway, Brown County Speedway, Shawano Speedway, Seymour Speedway,
              and other regional tracks appear throughout the preserved material.
            </p>
            <p>
              The archive is still being identified. That makes this room both an exhibit and an active research project:
              every confirmed driver, track, and year strengthens the historical record behind the photographs.
            </p>
          </div>
          <aside className={styles.researchBox}>
            <div className={styles.researchKicker}>Archive Status</div>
            <strong>{explicitPhotos.toLocaleString()}</strong><span>records explicitly typed as photos</span>
            <strong>{identifiedDrivers.toLocaleString()}</strong><span>different identified drivers represented</span>
            <strong>{unknownYears.toLocaleString()}</strong><span>items still needing a confirmed year</span>
          </aside>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className={styles.gallerySection}>
          <div className={styles.sectionHeading}>
            <div>
              <div className={styles.sectionLabel}>Through Bob Bergeron&apos;s Lens</div>
              <h2>Featured photographs</h2>
            </div>
            <Link href="/photographers/bob-bergeron">View all Bergeron material →</Link>
          </div>
          <div className={styles.galleryGrid}>
            {gallery.map((photo) => <GalleryCard key={photo.photo_id} photo={photo} />)}
          </div>
        </section>
      )}

      <section className={styles.trackSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionLabel}>Where He Worked</div>
            <h2>The Bergeron track footprint</h2>
          </div>
        </div>
        <div className={styles.trackGrid}>
          {tracks.slice(0, 8).map((track) => (
            <Link href={`/tracks/${track.slug}`} className={styles.trackCard} key={track.slug}>
              <span>{track.count.toLocaleString()} archived items</span>
              <h3>{fmt(track.slug)}</h3>
              <p>{track.identified.toLocaleString()} identified-driver records • {track.dated.toLocaleString()} dated records</p>
              <strong>Open track archive →</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.pressSection}>
        <div className={styles.pressLead}>
          <div className={styles.sectionLabel}>The Racing Press</div>
          <h2>Writer as well as photographer.</h2>
          <p>
            The museum newspaper archive establishes Bergeron as more than a name on the back of a photograph. Midwest Racing News
            carried Bob Bergeron bylines and listed him among its contributing writers, while later Checkered Flag Racing News issues carried Bergeron photo credits.
          </p>
          <p>
            The museum also now has 1965 Fox Valley Racing News material in its archive. Additional 1966–1969 pages remain to be processed,
            giving this exhibit a clear path for future expansion as more primary-source material becomes searchable.
          </p>
        </div>
        <div className={styles.timeline}>
          <article><span>Period profile</span><h3>Photographer and writer</h3><p>Bergeron is described as the publication&apos;s “ace camera man” and as the writer of a weekly column for Racing Wheels.</p></article>
          <article><span>June 30, 1966</span><h3>Midwest Racing News</h3><p>A KK Sports Arena race report appears under the byline “By Bob Bergeron.”</p></article>
          <article><span>July 7, 1966</span><h3>Badger Bulletin</h3><p>Bergeron&apos;s column discusses the Fox Valley Stock Car Club and the northeastern Wisconsin racing scene.</p></article>
          <article><span>April 16, 1970</span><h3>Fox Valley Racing News</h3><p>Checkered Flag Racing News describes KK Sports Arena, Outagamie Speedway, and Leo&apos;s Speedway as tracks formerly covered by the then-discontinued Fox Valley Racing News.</p></article>
          <article><span>1970–1971</span><h3>Photo credits</h3><p>Checkered Flag Racing News and Midwest Racing News repeatedly identify photographs as Bob Bergeron or Bergeron &amp; Deitz photos.</p></article>
        </div>
        <div className={styles.cautionNote}>
          <strong>Research note:</strong> Fox Valley Racing News is now an important part of the Bergeron research trail, but the museum will distinguish between
          confirmed Bob Bergeron credits and material that is simply part of the publication until a page, caption, byline, or other primary source identifies his role.
        </div>
      </section>

      {identify.length > 0 && (
        <section className={styles.identifySection}>
          <div className={styles.sectionHeading}>
            <div>
              <div className={styles.sectionLabel}>Help Complete the Record</div>
              <h2>Can you identify these drivers?</h2>
            </div>
            <Link href="/photos?photographer=bob-bergeron&driver=unknown-driver">Open all unidentified Bergeron photos →</Link>
          </div>
          <p className={styles.identifyIntro}>
            More than one hundred Bergeron-tagged museum images still lack a confirmed driver identification. These photographs are preserved rather than discarded so research can reconnect the people, tracks, and years behind them.
          </p>
          <div className={styles.identifyGrid}>
            {identify.map((photo) => (
              <Link href={`/photo/${encodeURIComponent(photo.file_name)}`} key={photo.photo_id} className={styles.identifyCard}>
                <img src={imageUrl(photo)} alt="Unidentified driver from the Bob Bergeron collection" loading="lazy" />
                <div><strong>Driver unidentified</strong><span>{fmt(photo.track_slug, 'Track unknown')} • {isKnownYear(photo.year) ? photo.year : 'Year unknown'}</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.introSection}>
        <div className={styles.sectionLabel}>This Archive Is Still Growing</div>
        <div className={styles.introGrid}>
          <div>
            <h2>The first version of this room is a beginning, not an endpoint.</h2>
            <p>
              The museum already holds the Bergeron photo collection and a growing body of racing-publication evidence. The 1965 Fox Valley Racing News material provides another layer,
              while the 1966–1969 collections remain a future archival project. As those pages are processed, the exhibit can add direct photo credits, bylines, dates, track references, and other primary-source evidence.
            </p>
            <p>
              The same is true of the photographs themselves. Driver identifications made through the museum research workflow will automatically improve the collection behind this room.
            </p>
          </div>
          <aside className={styles.researchBox}>
            <div className={styles.researchKicker}>Next Research Priorities</div>
            <strong>1965</strong><span>Audit the Fox Valley Racing News material already uploaded.</span>
            <strong>1966–1969</strong><span>Process the remaining Fox Valley Racing News pages when resources allow.</span>
            <strong>{unknownDrivers.toLocaleString()}</strong><span>Bergeron driver identifications still available for review.</span>
          </aside>
        </div>
      </section>

      <section className={styles.footerSection}>
        <div>
          <div className={styles.sectionLabel}>A Permanent Museum Series</div>
          <h2>Media Member of the Month</h2>
          <p>
            Bob Bergeron is the inaugural honoree. Future photographers, writers, announcers, publishers,
            historians, and other media contributors can be featured here while every past honoree remains in the permanent museum archive.
          </p>
        </div>
        <Link href="/rooms" className={styles.primaryButton}>Return to Museum Rooms</Link>
      </section>
    </main>
  )
}
