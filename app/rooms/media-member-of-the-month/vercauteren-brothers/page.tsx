import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { getPhotoUrl } from '@/lib/photos'
import styles from './room.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Gary & Pete Vercauteren | Media Room 002 | Upper Midwest Auto Racing Museum',
  description: 'Room 002 honors the Vercauteren brothers: Gary and Pete, their photography, Midwest Racing News coverage, Wisconsin International Raceway publicity, and the Mid-American Stock Car Series.',
}

type PhotoRecord = {
  photo_id: number
  file_name: string
  track_slug: string | null
  driver_slug: string | null
  photographer_slug: string | null
  credit_type: string | null
  year: string | null
}
type ArchiveLink = { publication: string; date: string; page: number; headline: string; author: string; note: string }

const PETE_SLUGS = ['pete-vercauteren', 'pete-vercauteran']
const GARY_SLUG = 'gary-vercauteren'
const ARCHIVE_LINKS: ArchiveLink[] = [
  {
    publication: 'midwest-racing-news', date: '1970-09-10', page: 8,
    headline: 'Derr wins the IMCA Badger 100 at Marshfield', author: 'Gary Vercauteren',
    note: 'A 1970 national stock-car event report beyond the northeast Wisconsin circuit.',
  },
  {
    publication: 'midwest-racing-news', date: '1972-05-11', page: 6,
    headline: 'Shawano opener stopped by drivers’ strike', author: 'Gary Vercauteren',
    note: 'A primary report showing that the brothers documented the difficult moments as well as the victories.',
  },
  {
    publication: 'checkered-flag-racing-news', date: '1972-05-31', page: 1,
    headline: 'Entries arrive for the first Red race', author: 'Gary Vercauteren',
    note: 'The first season of WIR’s Red, White and Blue championship was being promoted in real time.',
  },
  {
    publication: 'midwest-racing-news', date: '1972-06-29', page: 2,
    headline: 'Trickle edges Rank in the inaugural Red race', author: 'Gary Vercauteren',
    note: 'One of the exhibit’s most important historical links: the first Red event in 1972.',
  },
  {
    publication: 'midwest-racing-news', date: '1973-04-26', page: 9,
    headline: 'N.E. Wis. Race News: looking toward 1973', author: 'Pete Vercauteren',
    note: 'A surviving example of Pete’s recurring regional column.',
  },
  {
    publication: 'midwest-racing-news', date: '1973-06-14', page: 6,
    headline: 'Roger Paul sweeps at De Pere', author: 'Pete Vercauteren',
    note: 'Brown County Fairgrounds late-model reporting from the height of the circuit.',
  },
  {
    publication: 'midwest-racing-news', date: '1973-06-21', page: 7,
    headline: 'Kleinschmit repeats at Leo’s', author: 'Pete Vercauteren',
    note: 'Pete’s coverage extended to the Oshkosh track and the wider Fox Valley.',
  },
  {
    publication: 'midwest-racing-news', date: '1970-07-30', page: 11,
    headline: 'Shawano sweep for J. J. Smith', author: 'Pete Vercauteren',
    note: 'A contemporary race report carrying Pete’s byline.',
  },
  {
    publication: 'midwest-racing-news', date: '1970-08-20', page: 14,
    headline: 'Capacity De Pere crowd', author: 'Gary Vercauteren',
    note: 'Gary reports on the Brown County Fairgrounds and the Tri-Circuit.',
  },
  {
    publication: 'checkered-flag-racing-news', date: '1979-05-30', page: 7,
    headline: 'J.J.’s flying at Shawano', author: 'Pete Vercauteren',
    note: 'The Shawano coverage also appeared in Checkered Flag Racing News.',
  },
  {
    publication: 'midwest-racing-news', date: '1979-05-17', page: 5,
    headline: 'Shawano 1979 opening race', author: 'Pete Vercauteren',
    note: 'A surviving MRN byline on the 1979 season opener.',
  },
  {
    publication: 'midwest-racing-news', date: '1992-02-06', page: 13,
    headline: 'Wisconsin Shortracks', author: 'Gary Vercauteren',
    note: 'An example of Gary’s recurring regional racing column.',
  },
  {
    publication: 'midwest-racing-news', date: '1992-05-07', page: 2,
    headline: 'Weber wins WIR Spring Classic', author: 'Gary Vercauteren',
    note: 'A race report documenting Gary’s continued WIR coverage.',
  },
]

const PROGRAMS = [
  { slug: '1979-wisconsin-international-raceway-wi-yearbook', path: 'programs/1979-wisconsin-international-raceway-wi-yearbook/5.jpg', year: '1979', title: 'Alan Kulwicki drives faster than he talks', attribution: 'Article by Gary Vercauteren', note: 'A signed driver profile in the WIR yearbook.' },
  { slug: '1979-wisconsin-international-raceway-wi-yearbook', path: 'programs/1979-wisconsin-international-raceway-wi-yearbook/3.jpg', year: '1979', title: 'Pete Parker profile', attribution: 'Text and photographs credited to Gary Vercauteren', note: 'A driver story from the northeastern Wisconsin late-model era.' },
  { slug: '1982-wisconsin-international-raceway-wi-yearbook', path: 'programs/1982-wisconsin-international-raceway-wi-yearbook/1982 - WIR PROGRAM 1_003.jpg', year: '1982', title: 'Larry Detjens remembered', attribution: 'Article by Gary Vercauteren', note: 'A contemporary tribute in the WIR annual.' },
  { slug: '1982-wisconsin-international-raceway-wi-yearbook', path: 'programs/1982-wisconsin-international-raceway-wi-yearbook/1982 - WIR PROGRAM 1_005.jpg', year: '1982', title: 'Marv Marzofka profile', attribution: 'Article by Gary; photograph credited to Jim Vercauteren', note: 'An example of the family’s combined newspaper and photo work.' },
  { slug: '1986-wisconsin-international-raceway-wi-yearbook', path: 'programs/1986-wisconsin-international-raceway-wi-yearbook/1986 - WIR PROGRAM 1_008.jpg', year: '1986', title: 'Red, White and Blue preview', attribution: 'Photo credited to Pete Vercauteren', note: 'Pete’s photo credit survives in a WIR publication.' },
  { slug: '1993-artgo-challenge-series-yearbook', path: 'programs/1993-artgo-challenge-series-yearbook/019.jpg', year: '1993', title: 'Mid-American’s rising profile', attribution: 'ARTGO yearbook', note: 'The source identifies Gary as president of the Mid-American Stock Car Series.' },
]

function programUrl(program: (typeof PROGRAMS)[number]): string {
  return '/media/race-programs/' + program.slug + '?ocrPath=' + encodeURIComponent(program.path) + '&q=Vercauteren'
}

const MEMORIAL_WINNERS = [
  { year: 1990, winner: 'Wayne Strand' },
  { year: 1991, winner: 'Larry Richards' },
  { year: 1992, winner: 'Jerry Wenzel' },
  { year: 1993, winner: 'Eddie Hoffman' },
  { year: 1994, winner: 'Brian Lambie' },
  { year: 1995, winner: 'Eddie Hoffman' },
  { year: 1996, winner: 'Pat Kelly' },
  { year: 1997, winner: 'Bill Prietzel' },
  { year: 1998, winner: 'Pat Kelly' },
  { year: 1999, winner: 'Gregg Haese' },
  { year: 2000, winner: 'Mark Pluer' },
  { year: 2001, winner: 'Peter Hernandez' },
  { year: 2002, winner: 'Peter Hernandez' },
  { year: 2003, winner: 'Jeremy Spoonmore' },
  { year: 2004, winner: 'Bill Prietzel' },
  { year: 2005, winner: 'Brett Piontek' },
  { year: 2006, winner: 'James Swan' },
  { year: 2007, winner: 'Kevin Damrow' },
  { year: 2008, winner: 'Jake Finney' },
]

const TIMELINE = [
  { year: 'The beginning', title: 'Growing up beside the race track', description: 'Gary and Pete grew up near the Brown County Fairgrounds in De Pere. Racing was part of family life, long before their names appeared in the press.' },
  { year: '1970', title: 'Bylines in the racing papers', description: 'Surviving Midwest Racing News issues carry separate Pete and Gary bylines on Shawano, Seymour, and De Pere racing.' },
  { year: '1972', title: 'Gary takes a role at WIR', description: 'Gary was appointed public-relations director at Wisconsin International Raceway, where he helped develop the Red, White and Blue State Championship Series.' },
  { year: '1990', title: 'The Vercauteren Memorial begins', description: 'The original memorial race honored the brothers’ parents, Harold and Regina Vercauteren, beginning at Chilton.' },
  { year: '1993', title: 'Founding Mid-American', description: 'Gary and Pete launched the Mid-American Stock Car Series, taking a Wisconsin grand-national-inspired concept to paved tracks across the Midwest.' },
  { year: '2005 and beyond', title: 'A lasting family legacy', description: 'After Gary’s death in October 2005, the annual memorial also became a tribute to his life and influence on the sport.' },
]
const SOURCES = [
  { title: 'Pete Vercauteren — oral history', author: 'Joe Verdegan, September 30, 2020', href: 'https://joeverdegan.com/pete-vercauteren/', description: 'Family origins, the Tri-track circuit, race photography, MRN distribution and the people who made northeastern Wisconsin racing.' },
  { title: 'Gary Vercauteren Memorial, 2026', author: 'Mid-Am Racing Series, May 17, 2026', href: 'https://www.midamracing.com/post/from-victory-lane-to-graduation-stage-vandermeir-wins-gary-vercauteren-memorial', description: 'The contemporary series records Cameron Vandermeir’s 2026 memorial victory at WIR and the family’s continuing place in the series.' },
  { title: 'Vercauteren Memorial returns to WIR', author: 'Keith Vercauteren, April 30, 2014', href: 'https://www.carsandracingstuff.com/library/articles/24845.php', description: 'Family perspective on Gary’s WIR years, 1972 publicity work, the memorial and the founding of Mid-American.' },
  { title: 'Pete Vercauteren with father Harold — captioned period photograph', author: 'Photo reproduced in Joe Verdegan’s oral history', href: 'https://joeverdegan.com/pete-vercauteren/', description: 'A source-captioned photo of Pete beside Harold and a copy of Midwest Racing News; permission for museum reproduction not yet established.' },
  { title: 'The Vercauteren Memorial history', author: 'Mid-American Stock Car Series, 2009', href: 'https://www.carsandracingstuff.com/library/articles/25038.php', description: 'Chronology of the traveling trophy and recorded memorial winners.' },
  { title: 'WIR and the birth of Red, White and Blue', author: 'Joe Verdegan', href: 'https://joeverdegan.com/1972-the-birth-of-wirs-red-white-blue-state-championship-series/', description: 'Retrospective with Dave Watson crediting Gary with promotion of the new state championship.' },
  { title: 'Larry Richards and the grand nationals', author: 'Joe Verdegan', href: 'https://joeverdegan.com/larry-richards-an-original-grand-national-outlaw/', description: 'Context on the Chilton grand national class and the origins of Mid-American.' },
]

function pretty(value: string | null, fallback: string): string {
  if (!value || value.startsWith('unknown-')) return fallback
  return value.split('-').filter(Boolean).map((v) => v === 'jj' ? 'J.J.' : v.charAt(0).toUpperCase() + v.slice(1)).join(' ')
}

function photoUrl(photo: PhotoRecord): string {
  const track = photo.track_slug || 'unknown-track'
  const year = photo.year || 'unknown-year'
  return getPhotoUrl(['photos/master', track, year, photo.file_name].join('/'))
}

function newspaperUrl(article: ArchiveLink): string {
  return '/media/newspapers/' + article.publication + '/' + article.date + '?sourcePage=' + article.page + '&q=Vercauteren'
}

function galleryFor(rows: PhotoRecord[], person: 'pete' | 'gary'): PhotoRecord[] {
  const own = rows.filter((row) => person === 'pete'
    ? PETE_SLUGS.includes(row.photographer_slug || '')
    : row.photographer_slug === GARY_SLUG)
  const dated = own.filter((row) => row.credit_type === 'photo'
    && row.driver_slug && row.driver_slug !== 'unknown-driver'
    && row.year && /^\d{4}$/.test(row.year))
  const identified = own.filter((row) => row.credit_type === 'photo'
    && row.driver_slug && row.driver_slug !== 'unknown-driver')
  const selected: PhotoRecord[] = []
  for (const photo of [...dated, ...identified, ...own]) {
    if (selected.some((row) => row.photo_id === photo.photo_id)) continue
    selected.push(photo)
    if (selected.length === 6) break
  }
  return selected
}

function PhotoCard({ photo }: { photo: PhotoRecord }) {
  return (
    <Link href={'/photo/' + encodeURIComponent(photo.file_name)} className={styles.photoCard}>
      <img src={photoUrl(photo)} loading="lazy" alt={pretty(photo.driver_slug, 'Unidentified race car') + ' at ' + pretty(photo.track_slug, 'an unidentified track')} />
      <span className={styles.photoCaption}>
        <strong>{pretty(photo.driver_slug, 'Unidentified driver')}</strong>
        <small>{pretty(photo.track_slug, 'Track not yet identified')} • {photo.year && /^\d{4}$/.test(photo.year) ? photo.year : 'Date unknown'}</small>
        <em>Credit: {pretty(photo.photographer_slug, 'Vercauteren collection')}</em>
      </span>
    </Link>
  )
}

export default async function VercauterenBrothersRoom() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await supabase.from('photos')
    .select('photo_id,file_name,track_slug,driver_slug,photographer_slug,credit_type,year')
    .in('photographer_slug', [...PETE_SLUGS, GARY_SLUG])
    .order('photo_id', { ascending: true }).limit(1000)

  if (error) console.error('[Media room 002] photograph inventory error:', error.message)
  const rows = (data || []) as PhotoRecord[]
  const pete = rows.filter((row) => PETE_SLUGS.includes(row.photographer_slug || ''))
  const gary = rows.filter((row) => row.photographer_slug === GARY_SLUG)
  const photos = rows.filter((row) => row.credit_type === 'photo').length
  const unidentified = rows.filter((row) => row.driver_slug === 'unknown-driver').length
  const tracks = new Set(rows.map((row) => row.track_slug).filter((slug) => slug && slug !== 'unknown-track')).size
  const peteGallery = galleryFor(rows, 'pete')
  const garyGallery = galleryFor(rows, 'gary')
  const hero = rows.find((row) => row.file_name === 'brown-county-speedway_1972_bob-bennett_pete-vercauteren_photo_001.jpg') || peteGallery[0] || garyGallery[0]
  const heroPhoto = hero ? photoUrl(hero) : null

  return (
    <main className={styles.page}>
      <header className={styles.hero} style={heroPhoto ? { backgroundImage: 'linear-gradient(90deg, rgba(10,7,5,.98), rgba(10,7,5,.84) 49%, rgba(10,7,5,.4)), url("' + heroPhoto + '")' } : undefined}>
        <div className={styles.heroInner}>
          <Link href="/rooms" className={styles.back}>← Museum Rooms</Link>
          <div className={styles.kicker}>Room 002 · Media Member of the Month</div>
          <h1>The Vercauteren<br /><span>Brothers</span></h1>
          <p className={styles.heroNames}>Gary &amp; Pete Vercauteren</p>
          <p className={styles.heroLead}>The people who brought the racing stories home — from the northeastern Wisconsin dirt tracks to the pages of the racing press, Wisconsin International Raceway, and the Mid-American Stock Car Series.</p>
          <div className={styles.heroLinks}>
            <a href="#the-story">Explore their story</a>
            <a href="#newsroom">Read the newspaper archive</a>
          </div>
        </div>
        <div className={styles.heroStamp}><span>Media Room</span><strong>002</strong><small>Research exhibit</small></div>
      </header>

      <nav className={styles.navigation} aria-label="Room 002 sections">
        <a href="#the-story">Their Story</a>
        <a href="#timeline">Timeline</a>
        <a href="#photographs">Photography</a>
        <a href="#newsroom">Racing Press</a>
        <a href="#programs">Yearbooks</a>
        <a href="#legacy">Legacy &amp; Sources</a>
        <a href="#memorial">The Memorial</a>
      </nav>

      <div className={styles.content}>
        <section id="the-story" className={styles.intro}>
          <div>
            <span className={styles.sectionKicker}>From the Brown County Fairgrounds to the Midwest</span>
            <h2>More than a pair of names in a photo credit.</h2>
            <p>Gary and Pete grew up within sight of the racing at De Pere. The family became a fixture in regional racing media: their father Harold sold <em>Midwest Racing News</em>, their mother Regina sold photographs, and the brothers documented the racing with reporting, pictures, driver features and track publicity.</p>
            <p>At a time before instant racing updates, their work helped fans follow the rivalries, fast cars and personalities at De Pere, Shawano, Seymour, and beyond. In later decades they also helped shape the racing itself.</p>
          </div>
          <aside className={styles.stats}>
            <div><strong>{photos.toLocaleString()}</strong><span>Records typed as photographs</span></div>
            <div><strong>{pete.length.toLocaleString()}</strong><span>Pete collection records</span></div>
            <div><strong>{gary.length.toLocaleString()}</strong><span>Gary collection records</span></div>
            <div><strong>{tracks.toLocaleString()}</strong><span>Track labels represented</span></div>
            <p>Live counts from the museum’s photographic database. Posts and untyped records are excluded from the photograph total; duplicate or misspelled track labels may still need review.</p>
          </aside>
        </section>

        <section id="timeline" className={styles.timelineSection}>
          <span className={styles.sectionKicker}>A family on both sides of the press box</span>
          <h2>Milestones in their racing history</h2>
          <div className={styles.timeline}>
            {TIMELINE.map((item) => <article key={item.year}>
              <span>{item.year}</span><div><h3>{item.title}</h3><p>{item.description}</p></div>
            </article>)}
          </div>
        </section>

        <section id="photographs" className={styles.gallerySection}>
          <span className={styles.sectionKicker}>From the original museum collection</span>
          <h2>Through their lenses</h2>
          <p>These are racing photographs credited to the brothers — not portraits of Gary or Pete. Each photograph opens its museum record and preserved attribution.</p>
          <div className={styles.collectionHead}>
            <h3>Pete Vercauteren</h3><Link href="/photographers/pete-vercauteren">Browse Pete’s collection →</Link>
          </div>
          <div className={styles.photoGrid}>{peteGallery.map((photo) => <PhotoCard key={photo.photo_id} photo={photo} />)}</div>
          <div className={styles.collectionHead}>
            <h3>Gary Vercauteren</h3><Link href="/photographers/gary-vercauteren">Browse Gary’s collection →</Link>
          </div>
          <div className={styles.photoGrid}>{garyGallery.map((photo) => <PhotoCard key={photo.photo_id} photo={photo} />)}</div>
        </section>

        <section id="newsroom" className={styles.pressSection}>
          <span className={styles.sectionKicker}>Original pages • Original bylines</span>
          <h2>The newsroom: MRN &amp; CFRN</h2>
          <p>These selected pages were located in the museum’s searchable newspaper OCR. Each link opens the original issue and page; OCR text may contain transcription errors.</p>
          <div className={styles.newspaperGrid}>
            {ARCHIVE_LINKS.map((article) => <Link key={article.publication + article.date + article.page} href={newspaperUrl(article)} className={styles.newspaperCard}>
              <span>{article.publication === 'midwest-racing-news' ? 'MIDWEST RACING NEWS' : 'CHECKERED FLAG RACING NEWS'}</span>
              <strong>{article.headline}</strong>
              <small>{article.date} · Page {article.page} · By {article.author}</small>
              <p>{article.note}</p>
              <em>Open original newspaper page →</em>
            </Link>)}
          </div>
          <p className={styles.archiveNote}>These examples are the first curated selection, not the full inventory. The surname appears on thousands of OCR pages, including repeated mastheads; those mentions must be separated from actual authored pieces and photo credits.</p>
        </section>


        <section id="programs" className={styles.programSection}>
          <span className={styles.sectionKicker}>The press box, preserved in print</span>
          <h2>Programs &amp; yearbooks</h2>
          <p>Original programs carry the brothers’ writing and photo credits. The museum’s OCR search currently identifies Vercauteren-name matches on 50 pages across 18 yearbooks; these are selected source-linked examples, not a complete publication credit list. Each should be checked against the original scan before final publication.</p>
          <div className={styles.programGrid}>
            {PROGRAMS.map((program) => <Link key={program.path} href={programUrl(program)} className={styles.programCard}>
              <span>{program.year} · ORIGINAL YEARBOOK</span>
              <strong>{program.title}</strong>
              <small>{program.attribution}</small>
              <p>{program.note}</p>
              <em>View original scanned page →</em>
            </Link>)}
          </div>
        </section>

        <section id="legacy" className={styles.legacySection}>
          <div className={styles.legacyCopy}>
            <span className={styles.sectionKicker}>The work lived beyond the printed page</span>
            <h2>Wisconsin International Raceway and Mid-American</h2>
            <p>Gary became public-relations director at Wisconsin International Raceway in 1972. He was involved in building the Red, White and Blue State Championship Series and the race programs that gave fans more than statistics. Pete and Gary later founded the Mid-American Stock Car Series in 1993, drawing on the successful grand-national racing formula in northeast Wisconsin.</p>
            <p>The annual Vercauteren Memorial began in 1990 in honor of their parents, Harold and Regina. Following Gary’s death in October 2005, the memorial became an enduring tribute to three generations of racing-community involvement.</p><p><Link href="/series/mid-american-racing-series" className={styles.seriesLink}>Explore the museum’s Mid-American Racing Series history →</Link></p>
          </div>
          <div className={styles.sources}>
            <h3>Historical sources</h3>
            {SOURCES.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
              <strong>{source.title}</strong><small>{source.author}</small><span>{source.description}</span>
            </a>)}
          </div>
        </section>

        <section id="memorial" className={styles.memorialSection}>
          <span className={styles.sectionKicker}>The traveling trophy and its keepers</span>
          <h2>The Vercauteren Memorial</h2>
          <p>The race began at Chilton in 1990 in memory of Harold and Regina Vercauteren. When Gary and Pete created Mid-American in 1993, the memorial and its traveling trophy joined the new pavement series. After Gary died in 2005, the family’s tradition came to honor him as well.</p>
          <p>The historical winners below are transcribed from a 2009 <a href="https://www.carsandracingstuff.com/library/articles/25038.php" target="_blank" rel="noreferrer">Mid-American series account</a>. They represent this particular memorial race, not all Mid-American feature winners. Event-level links to museum results will be added after checking each race and venue.</p>
          <div className={styles.memorialGrid}>
            {MEMORIAL_WINNERS.map((item) => <div className={styles.memorialWinner} key={item.year}>
              <span>{item.year}</span><strong>{item.winner}</strong>
            </div>)}
          </div>
          <div className={styles.memorialPresent}>
            <strong>The legacy continues</strong>
            <p>The official Mid-Am Racing Series reported Cameron Vandermeir winning the 2026 Gary Vercauteren Memorial at Wisconsin International Raceway. This modern event illustrates the lasting connection between the brothers’ work and present-day racing.</p>
            <a href="https://www.midamracing.com/post/from-victory-lane-to-graduation-stage-vandermeir-wins-gary-vercauteren-memorial" target="_blank" rel="noreferrer">Read the 2026 race report →</a>
          </div>
        </section>

        <section className={styles.researchNote}>
          <h2>Help complete Room 002</h2>
          <p>The museum is continuing to identify photographs of Gary, Pete and the wider Vercauteren family; original newspaper bylines; early WIR publicity and programs; Mid-American founding artifacts; and the Vercauteren Memorial trophy. We will distinguish original authorship from later reposts or family contributions.</p>
          <div className={styles.researchActions}>
            <Link href="/photos?photographer=pete-vercauteren&driver=unknown-driver">Review Pete’s unidentified-driver queue ({unidentified.toLocaleString()} records) →</Link>
            <Link href="/rooms/media-member-of-the-month/bob-bergeron">Revisit Room 001 — Bob Bergeron →</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
