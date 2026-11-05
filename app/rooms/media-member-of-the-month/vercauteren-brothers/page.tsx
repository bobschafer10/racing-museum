import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
    publication: 'midwest-racing-news', date: '1993-01-14', page: 10,
    headline: 'Gary reflects on Alan Kulwicki’s championship', author: 'Gary Vercauteren',
    note: 'Gary’s Wisconsin Shortracks column recalls a call from Kulwicki after the 1992 NASCAR title.',
  },
  {
    publication: 'midwest-racing-news', date: '1993-02-11', page: 15,
    headline: 'Mid-American president announces memorial plans', author: 'Contemporary news report quoting Gary',
    note: 'A crucial early series document: the memorial’s move to WIR and Rockford’s planned April series opener.',
  },
  {
    publication: 'midwest-racing-news', date: '1993-05-06', page: 8,
    headline: 'Mid-American memorial event advertisement', author: 'Series publicity / paid event advertisement',
    note: 'The printed advertisement names Harold and Regina Vercauteren; presented as publicity, not an article by Gary.',
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
  { slug: '1982-wisconsin-international-raceway-wi-yearbook', path: 'programs/1982-wisconsin-international-raceway-wi-yearbook/1982 - WIR PROGRAM 1_008.jpg', year: '1982', title: 'Vercauteren Publishing advertisement', attribution: 'Original publishing-company advertisement', note: 'An archival clue connecting the family to Chilton printing and area newspapers.' },
  { slug: '1993-artgo-challenge-series-yearbook', path: 'programs/1993-artgo-challenge-series-yearbook/002.jpg', year: '1993', title: 'ARTGO’s publishing and direct-mail credits', attribution: 'ARTGO yearbook', note: 'A contemporary program identifies Vercauteren Publishing as part of racing marketing operations.' },
  { slug: '1993-artgo-challenge-series-yearbook', path: 'programs/1993-artgo-challenge-series-yearbook/019.jpg', year: '1993', title: 'Mid-American’s rising profile', attribution: 'ARTGO yearbook', note: 'The source identifies Gary as president of the Mid-American Stock Car Series.' },
]

function programScanUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return base + '/storage/v1/object/public/media/' + encoded
}

function programUrl(program: (typeof PROGRAMS)[number]): string {
  return '/media/race-programs/' + program.slug + '?ocrPath=' + encodeURIComponent(program.path) + '&q=Vercauteren'
}

const MEMORIAL_WINNERS = [
  { year: 1990, winner: 'Wayne Strand', venue: 'Chilton' },
  { year: 1991, winner: 'Larry Richards', venue: 'Chilton' },
  { year: 1992, winner: 'Jerry Wenzel', venue: 'Chilton' },
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
  { year: 2007, winner: 'Kevin Damrow', venue: '141 Speedway' },
  { year: 2008, winner: 'Jake Finney' },
  { year: 2009, winner: 'Greg Haese', venue: '141 Speedway' },
  { year: 2010, winner: 'Bill Prietzel', venue: 'Road America' },
]


type NewspaperClipping = {
  id: string
  date: string
  page: number
  title: string
  author: string
  caption: string
  rect: { x: number; y: number; w: number; h: number }
  original: { w: number; h: number }
}
const NEWSPAPER_CLIPPINGS: NewspaperClipping[] = [
  { id: 'pete-1972', date: '1972-04-27', page: 8, title: 'N.E. Wis. Race News', author: 'Pete Vercauteren',
    caption: 'Pete’s column, printed beside his brother Gary’s column in the same issue.',
    rect: { x: .067, y: .029, w: .355, h: .335 }, original: { w: 3151, h: 4692 } },
  { id: 'gary-1972', date: '1972-04-27', page: 8, title: 'Wisconsin Review', author: 'Gary Vercauteren',
    caption: 'Gary’s recurring column on the right side of the same original MRN page.',
    rect: { x: .634, y: .029, w: .347, h: .335 }, original: { w: 3151, h: 4692 } },
  { id: 'pete-1973', date: '1973-04-26', page: 9, title: 'N.E. Wis. Race News', author: 'Pete Vercauteren',
    caption: 'A second byline from Pete’s northeastern Wisconsin racing column.',
    rect: { x: .094, y: .101, w: .315, h: .33 }, original: { w: 3328, h: 4845 } },
  { id: 'gary-1970', date: '1970-08-20', page: 14, title: 'Capacity De Pere Crowd', author: 'Gary Vercauteren',
    caption: 'One of Gary’s early reports from Brown County Fairgrounds Speedway.',
    rect: { x: .193, y: .405, w: .386, h: .245 }, original: { w: 3151, h: 4666 } },
  { id: 'gary-tribute-2005', date: '2005-10-19', page: 5, title: 'Gary Vercauteren remembered', author: 'Midwest Racing News editors',
    caption: 'Original MRN obituary. The article summarizes his work at the Chilton Times-Journal, WIR and Mid-American.',
    rect: { x: .521, y: .023, w: .463, h: .365 }, original: { w: 2103, h: 2530 } },
]
function NewspaperClippingCard({ clipping }: { clipping: NewspaperClipping }) {
  const { rect, original } = clipping
  // Coordinates from the original image's OCR line_layout, preserving source pixels.
  const src = 'https://newspapers.uppermidwestautoracingmuseum.org/newspapers/midwest-racing-news/'
    + clipping.date + '/' + String(clipping.page).padStart(3, '0') + '.jpg'
  const href = '/media/newspapers/midwest-racing-news/' + clipping.date
    + '?sourcePage=' + clipping.page + '&q=Vercauteren'
  return (
    <Link href={href} className={styles.clippingCard}>
      <div className={styles.clippingViewport} style={{aspectRatio: (original.w * rect.w) + ' / ' + (original.h * rect.h)}}>
        <img src={src} loading="lazy" decoding="async"
          alt={'Authentic Midwest Racing News clipping: ' + clipping.title + ', by ' + clipping.author}
          style={{
            position: 'absolute',
            width: (100 / rect.w) + '%',
            maxWidth: 'none',
            left: (-100 * rect.x / rect.w) + '%',
            top: (-100 * rect.y / rect.h) + '%',
          }}
        />
      </div>
      <div className={styles.clippingCopy}>
        <small>ORIGINAL MIDWEST RACING NEWS · {clipping.date} · P. {clipping.page}</small>
        <strong>{clipping.title}</strong>
        <span>By {clipping.author}</span>
        <p>{clipping.caption}</p>
        <em>Open uncropped newspaper scan →</em>
      </div>
    </Link>
  )
}

const TIMELINE = [
  { year: 'The beginning', title: 'Growing up beside the race track', description: 'Gary and Pete grew up near the Brown County Fairgrounds in De Pere. Racing was part of family life, long before their names appeared in the press.' },
  { year: '1970', title: 'Bylines in the racing papers', description: 'Surviving Midwest Racing News issues carry separate Pete and Gary bylines on Shawano, Seymour, and De Pere racing.' },
  { year: '1972', title: 'Gary takes a role at WIR', description: 'Gary was appointed public-relations director at Wisconsin International Raceway, where he helped develop the Red, White and Blue State Championship Series.' },
  { year: '1990', title: 'The Vercauteren Memorial begins', description: 'The original memorial race honored the brothers’ parents, Harold and Regina Vercauteren, beginning at Chilton.' },
  { year: '1993', title: 'Founding Mid-American', description: 'Gary and Pete launched the Mid-American Stock Car Series, taking a Wisconsin grand-national-inspired concept to paved tracks across the Midwest.' },
  { year: '2005', title: 'Remembering Gary', description: 'Gary died in October 2005, aged 55. The Vercauteren Memorial continued as a tribute to his parents and to Gary’s influence on regional racing.' },
  { year: '2024', title: 'Remembering Pete', description: 'Pete died on November 25, 2024, aged 75. His extensive eyewitness account of the De Pere–Shawano–Seymour racing scene remains a remarkable firsthand record.' },
]
const SOURCES = [
  { title: 'Pete Vercauteren — life and obituary', author: 'Hansen Family Funeral & Cremation Services, November 2024', href: 'https://www.hansenfuneralservice.com/obituaries/Peter-Pete-Vercauteren', description: 'Confirms Pete’s December 30, 1948 birth and November 25, 2024 death. Includes family photo and tribute leads; reproduction rights not yet established.' },
  { title: 'Gary Vercauteren, in his own words: W.I.R. — Joe’s Challenge', author: 'Gary Vercauteren; republished by Mid-American, August 2006', href: 'https://www.carsandracingstuff.com/library/articles/24973.php', description: 'A firsthand account recalling his 1972 meeting with Joe Van Daalwyk and the development of Wisconsin International Raceway.' },
  { title: 'Roger Van Daalwyk on Gary’s WIR contributions', author: 'Interview by Joe Verdegan, November 23, 2022', href: 'https://joeverdegan.com/roger-van-daalwyk-became-wirs-gm-at-18-years-old/', description: 'Independent recollections of Gary’s public-relations work and the creation of the Red, White and Blue Series.' },
  { title: 'Pete Vercauteren — oral history', author: 'Joe Verdegan, September 30, 2020', href: 'https://joeverdegan.com/pete-vercauteren/', description: 'Family origins, the Tri-track circuit, race photography, MRN distribution and the people who made northeastern Wisconsin racing.' },
  { title: 'Gary Vercauteren Memorial, 2026', author: 'Mid-Am Racing Series, May 17, 2026', href: 'https://www.midamracing.com/post/from-victory-lane-to-graduation-stage-vandermeir-wins-gary-vercauteren-memorial', description: 'The contemporary series records Cameron Vandermeir’s 2026 memorial victory at WIR and the family’s continuing place in the series.' },
  { title: 'Memorial travels to Norway in 2011', author: 'Matt Panure, Mid-American Stock Car Series, August 3, 2011', href: 'https://www.carsandracingstuff.com/library/articles/24935.php', description: 'The memorial’s first 21 winners, original traveling trophy, and Pete’s role as an early series vice president.' },
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
  const heroRacePhoto = rows.find((row) => row.file_name === 'brown-county-speedway_1972_bob-bennett_pete-vercauteren_photo_001.jpg') || peteGallery[0] || garyGallery[0]
  const heroRacePhotoUrl = heroRacePhoto ? photoUrl(heroRacePhoto) : null
  const authenticatedSpotlights = [
    { file: 'brown-county-speedway_1973_al-schill_pete-vercauteren_photo_001.jpg', title: 'Al Schill · De Pere, 1973', caption: 'Photograph credited to Pete Vercauteren' },
    { file: 'seymour-speedway_1974_pete-parker_pete-vercauteren_photo_001.jpg', title: 'Pete Parker · Seymour, 1974', caption: 'Photograph credited to Pete Vercauteren' },
    { file: 'rockford-speedway_1984_dick-trickle_gary-vercauteren_photo_001.jpg', title: 'Dick Trickle · Rockford, 1984', caption: 'Photograph credited to Gary Vercauteren' },
    { file: 'wisconsin-international-raceway_1987_tim-nooner_gary-vercauteren_photo_555.jpg', title: 'Tim Nooner · WIR, 1987', caption: 'Photograph credited to Gary Vercauteren' },
  ].flatMap((item) => {
    const photo = rows.find((row) => row.file_name === item.file)
    return photo ? [{ ...item, photo }] : []
  })


  return (
    <main className={styles.page}>
      <header className={styles.hero} style={heroRacePhotoUrl ? {
        backgroundImage: 'linear-gradient(90deg, rgba(9,7,5,.98) 0%, rgba(9,7,5,.97) 39%, rgba(9,7,5,.89) 69%, rgba(9,7,5,.80)), url("' + heroRacePhotoUrl + '")',
      } : undefined}>
        <div className={styles.heroLayout}>
          <div className={styles.heroInner}>
            <Link href="/rooms" className={styles.back}>← Museum Rooms</Link>
            <div className={styles.kicker}>A new room in the museum</div>
            <p className={styles.heroRoomLine}>ROOM 002 · MEDIA MEMBER OF THE MONTH</p>
            <h1>The Vercauteren<br /><span>Brothers</span></h1>
            <p className={styles.heroNames}>Gary &amp; Pete Vercauteren</p>
            <p className={styles.heroLead}>Two voices behind the racing news: photographers, writers and promoters who documented northeast Wisconsin's golden age of short-track racing.</p>
            <div className={styles.heroLinks}>
              <a href="#the-story">Enter Room 002 →</a>
              <a href="#original-columns">Read their original 1972 columns →</a>
            </div>
            <p className={styles.heroOriginalLabel}>Original photographs and newspaper scans — no reconstructed faces or articles.</p>
          </div>
          <div className={styles.heroArchive} aria-label="Original portraits and newspaper columns of Gary and Pete Vercauteren">
            <div className={styles.heroArchiveHeading}>
              <span>FROM THE MUSEUM ARCHIVE</span>
              <strong>THE PEOPLE BEHIND THE BYLINES</strong>
            </div>
            <div className={styles.heroPortraitRow}>
              <Link href="/media/newspapers/midwest-racing-news/2005-10-19?sourcePage=5&q=Vercauteren" className={styles.heroPortraitCard}>
                <div className={styles.heroPortraitImage}>
                  <div className={styles.heroGaryFace}>
                    <img
                      src="https://newspapers.uppermidwestautoracingmuseum.org/newspapers/midwest-racing-news/2005-10-19/005.jpg"
                      alt="Gary Vercauteren in his original October 19, 2005 Midwest Racing News obituary"
                      style={{position:'absolute', width:(100/.146)+'%', maxWidth:'none', left:(-100*.515/.146)+'%', top:(-100*.081/.142)+'%'}}
                    />
                  </div>
                </div>
                <div className={styles.heroPortraitCaption}>
                  <strong>GARY VERCAUTEREN</strong>
                  <small>2005 · Midwest Racing News portrait</small>
                </div>
              </Link>
              <a href="https://www.hansenfuneralservice.com/obituaries/Peter-Pete-Vercauteren/" target="_blank" rel="noreferrer" className={styles.heroPortraitCard}>
                <div className={styles.heroPortraitImage}>
                  <img className={styles.heroPeteFace}
                    src="https://cdn.f1connect.net/photo/tributes/t/8/r/207x207/7903305/Peter-Pete-Vercauteren-1732645088.jpg"
                    alt="Pete Vercauteren in a later portrait published with his 2024 obituary" />
                </div>
                <div className={styles.heroPortraitCaption}>
                  <strong>PETE VERCAUTEREN</strong>
                  <small>2024 · Hansen Family Funeral portrait</small>
                </div>
              </a>
            </div>
            <div className={styles.heroColumnHeading}>
              <span>APRIL 27, 1972 · MIDWEST RACING NEWS · PAGE 8</span>
              <strong>Two brothers. One newspaper page.</strong>
            </div>
            <div className={styles.heroColumnRow}>
              {NEWSPAPER_CLIPPINGS.slice(0,2).map((clipping) => {
                const { rect, original } = clipping
                const src = 'https://newspapers.uppermidwestautoracingmuseum.org/newspapers/midwest-racing-news/' + clipping.date + '/008.jpg'
                return (
                  <Link key={clipping.id}
                    href={'/media/newspapers/midwest-racing-news/' + clipping.date + '?sourcePage=8&q=Vercauteren'}
                    className={styles.heroColumnCard}>
                    <div className={styles.heroColumnScan} style={{aspectRatio:(original.w * rect.w) + ' / ' + (original.h * rect.h)}}>
                      <img src={src}
                        alt={'Original 1972 Midwest Racing News ' + clipping.title + ' column by ' + clipping.author}
                        style={{
                          position:'absolute', width:(100/rect.w)+'%', maxWidth:'none',
                          left:(-100*rect.x/rect.w)+'%', top:(-100*rect.y/rect.h)+'%',
                        }} />
                    </div>
                    <div className={styles.heroColumnCaption}>
                      <strong>{clipping.title}</strong>
                      <small>By {clipping.author}</small>
                    </div>
                  </Link>
                )
              })}
            </div>
            <p className={styles.heroSourceNote}>
              Gary: museum MRN scan · Pete: Hansen Family Funeral (external portrait; reuse permission pending).
              Both columns: original MRN, April 27, 1972.
            </p>
          </div>
        </div>
      </header>

      <nav className={styles.navigation} aria-label="Room 002 sections">
        <a href="#the-story">Their Story</a>
        <a href="#the-brothers">Their Lives</a>
        <a href="#original-columns">Original Columns</a>
        <a href="#timeline">Timeline</a>
        <a href="#photographs">Photography</a>
        <a href="#newsroom">Racing Press</a>
        <a href="#programs">Yearbooks</a>
        <a href="#publisher">Publishing</a>
        <a href="#legacy">Legacy &amp; Sources</a>
        <a href="#memorial">The Memorial</a>
      </nav>

      <div className={styles.content}>
        <section id="the-story" className={styles.intro}>
          <div>
            <span className={styles.sectionKicker}>From the Brown County Fairgrounds to the Midwest</span>
            <h2>More than a pair of names in a photo credit.</h2>
            <p>Gary and Pete grew up within sight of the racing at De Pere. Their work became a family enterprise: their father Harold sold <em>Midwest Racing News</em>, their mother Regina sold photographs, and the brothers — both students at St. Norbert College — documented racing through results, pictures, driver features and track publicity. Brother Jim also developed a significant photographic role, with credits preserved in the WIR programs.</p>
            <p>At a time before instant racing updates, the family reported selling as many as 1,200–1,500 copies of Midwest Racing News over a racing weekend. Their coverage helped fans follow the rivalries, cars and personalities at De Pere, Shawano, Seymour, and beyond. In later decades they also helped shape the racing itself.</p>
          </div>
          <aside className={styles.stats}>
            <div><strong>{photos.toLocaleString()}</strong><span>Records typed as photographs</span></div>
            <div><strong>{pete.length.toLocaleString()}</strong><span>Pete collection records</span></div>
            <div><strong>{gary.length.toLocaleString()}</strong><span>Gary collection records</span></div>
            <div><strong>{tracks.toLocaleString()}</strong><span>Track labels represented</span></div>
            <p>Live counts from the museum’s photographic database. Posts and untyped records are excluded from the photograph total; duplicate or misspelled track labels may still need review.</p>
          </aside>
        </section>

        <section id="the-brothers" className={styles.peopleSection}>
          <span className={styles.sectionKicker}>Two brothers. Distinct voices. A shared purpose.</span>
          <h2>Gary and Pete: the people behind the racing pages</h2>
          <div className={styles.peopleGrid}>
            <article className={styles.personCard}>
              <span className={styles.personLabel}>Gary Vercauteren · 1950–2005</span>
              <figure className={styles.garyHeadshot}>
                <div className={styles.garyHeadshotCrop} style={{aspectRatio: (2103 * .146) + ' / ' + (2530 * .142)}}>
                  <img
                    src="https://newspapers.uppermidwestautoracingmuseum.org/newspapers/midwest-racing-news/2005-10-19/005.jpg"
                    loading="lazy" decoding="async"
                    alt="Historical photograph printed beside Gary Vercauteren's obituary in Midwest Racing News, October 19, 2005"
                    style={{position:'absolute', width:(100/.146)+'%', maxWidth:'none', left:(-100*.515/.146)+'%', top:(-100*.081/.142)+'%'}}
                  />
                </div>
                <figcaption>Gary Vercauteren — original 2005 MRN obituary portrait. <Link href="/media/newspapers/midwest-racing-news/2005-10-19?sourcePage=5&q=Vercauteren">View scan</Link></figcaption>
              </figure>

              <h3>The writer, publicist and series builder</h3>
              <p>Gary covered De Pere, Shawano and Wisconsin International Raceway, becoming WIR’s public-relations director in 1972. His reporting, original driver profiles, promotional work and the Red, White and Blue State Championship Series helped put Wisconsin short-track racing before a much wider audience.</p>
              <p>In <em>W.I.R. — Joe’s Challenge</em>, Gary recalled meeting Joe Van Daalwyk in March 1972 as the speedway was being rebuilt from the troubled KK Sports Arena era. His own account is an especially important source for this room.</p>
              <p>Gary became president of the Mid-American Stock Car Series, whose first season was 1993. He died in October 2005.</p>
              <a href="https://www.carsandracingstuff.com/library/articles/24973.php" rel="noreferrer" target="_blank">Read Gary’s account of WIR’s early years →</a>
            </article>
            <article className={styles.personCard}>
              <span className={styles.personLabel}>Pete Vercauteren · 1948–2024</span>
              <h3>The eyewitness to northeast Wisconsin racing</h3>
              <p>Pete helped chronicle the De Pere–Shawano–Seymour circuit through race reports, feature stories, photography and his <em>N.E. Wis. Race News</em> column. His memories preserve the drivers, crowded grandstands, lively rivalries and grassroots culture of the era.</p>
              <p>With his family, Pete helped distribute <em>Midwest Racing News</em> and make local racing information available to fans every week. He later helped Gary launch Mid-American and served in the organization’s early leadership.</p>
              <p>Pete died November 25, 2024, at age 75. His 2020 interview with historian Joe Verdegan remains an essential oral-history source.</p>
              <p><strong>Images located:</strong> a period photograph showing Pete and his father Harold selling Midwest Racing News, and a later funeral-home obituary portrait. Both remain externally sourced pending permission for museum reproduction.</p>
              <a href="https://joeverdegan.com/pete-vercauteren/" rel="noreferrer" target="_blank">Read Pete’s racing memories →</a>
              <a href="https://www.hansenfuneralservice.com/obituaries/Peter-Pete-Vercauteren" rel="noreferrer" target="_blank">Pete’s family obituary and tribute →</a>
            </article>
          </div>
          <div className={styles.portraitNotice}>
            <strong>Portrait research</strong>
            <p>Joe Verdegan’s interview includes a captioned period image identifying Pete beside his father Harold with a copy of Midwest Racing News. The family obituary is another photographic lead. The original October 19, 2005 MRN obituary contains a portrait printed beside Gary’s life story, and that source photograph now appears in his biography. Pete's sourced historical family photograph and obituary portrait are linked here, pending permission to reproduce them in the museum. No imagined portraits are used.</p>
            <div className={styles.portraitLeads}>
              <a href="https://joeverdegan.com/pete-vercauteren/" rel="noreferrer" target="_blank">Period image: Pete with father Harold and Midwest Racing News →</a>
              <a href="https://www.hansenfuneralservice.com/obituaries/Peter-Pete-Vercauteren/" rel="noreferrer" target="_blank">Pete’s obituary portrait: Hansen Family Funeral →</a>
              <Link href="/media/newspapers/midwest-racing-news/2005-10-19?sourcePage=5&q=Vercauteren">Gary’s original 2005 MRN obituary and portrait →</Link>
            </div>
          </div>
        </section>

        <section id="original-columns" className={styles.columnSection}>
          <span className={styles.sectionKicker}>Original MRN clippings · 1970s and Gary’s 2005 tribute</span>
          <h2>Their names in print</h2>
          <p>These are authentic cropped views of the museum’s original newspaper scans, not retyped or AI-created headlines. On April 27, 1972, the brothers’ columns appeared <strong>on the same page</strong>. Select any clipping to inspect the uncropped source in the museum viewer.</p>
          <div className={styles.columnGrid}>
            {NEWSPAPER_CLIPPINGS.map((clipping) => <NewspaperClippingCard key={clipping.id} clipping={clipping} />)}
          </div>
          <div className={styles.columnContext}>
            <strong>Also discovered: Gary’s MRN obituary</strong>
            <p>The October 19, 2005 MRN page contains Gary’s original obituary with a photograph printed alongside the biographical text. A non-AI crop from the museum’s scan now appears with Gary’s individual biography.</p>
            <Link href="/media/newspapers/midwest-racing-news/2005-10-19?sourcePage=5&q=Vercauteren">Open the 2005 MRN tribute →</Link>
          </div>
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
          {authenticatedSpotlights.length > 0 ? (
            <div className={styles.authenticGallery} aria-label="Verified museum racing photographs">
              {authenticatedSpotlights.map(({ photo, file, title, caption }) => (
                <Link key={file} href={'/photo/' + encodeURIComponent(file)} className={styles.authenticPhoto}>
                  <img loading="lazy" src={photoUrl(photo)} alt={title + ', ' + caption} />
                  <span><strong>{title}</strong><small>{caption}</small></span>
                </Link>
              ))}
            </div>
          ) : null}
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
          <div className={styles.pressInventory} aria-label="Research index overview">
            <div><strong>1,462</strong><span>Distinct newspaper pages with Gary or Pete byline patterns</span></div>
            <div><strong>715</strong><span>Publication-and-issue combinations represented</span></div>
            <div><strong>16</strong><span>Selected print artifacts linked below</span></div>
          </div>
          <div className={styles.newspaperGrid}>
            {ARCHIVE_LINKS.map((article) => <Link key={article.publication + article.date + article.page} href={newspaperUrl(article)} className={styles.newspaperCard}>
              <span>{article.publication === 'midwest-racing-news' ? 'MIDWEST RACING NEWS' : 'CHECKERED FLAG RACING NEWS'}</span>
              <strong>{article.headline}</strong>
              <small>{article.date} · Page {article.page} · {article.author === 'Gary Vercauteren' || article.author === 'Pete Vercauteren' ? 'By ' + article.author : article.author}</small>
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
          <div className={styles.artifactShelf} aria-label="Authentic scanned program and yearbook pages">
            {[PROGRAMS[0], PROGRAMS[2], PROGRAMS[4], PROGRAMS[7]].map((item) => (
              <Link className={styles.artifactFrame} href={programUrl(item)} key={item.path}>
                <div className={styles.artifactImage}>
                  <img loading="lazy" decoding="async" src={programScanUrl(item.path)} alt={'Original ' + item.year + ' archival page: ' + item.title} />
                </div>
                <div className={styles.artifactCaption}>
                  <small>ORIGINAL SCANNED PAGE · {item.year}</small>
                  <strong>{item.title}</strong>
                  <span>View in the museum archive →</span>
                </div>
              </Link>
            ))}
          </div>
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

        <section id="publisher" className={styles.publisherSection}>
          <div className={styles.publisherCopy}>
            <span className={styles.sectionKicker}>The business behind the race program</span>
            <h2>Vercauteren Publishing</h2>
            <p>Gary and Pete’s work reached beyond the photographers’ pit gate and the newspaper byline. An advertisement in the museum’s <strong>1982 Wisconsin International Raceway program</strong> names Vercauteren Publishing, Inc. of Chilton and connects its printing business to area publications. The <strong>1993 ARTGO program</strong> names the publisher in racing’s direct-mail and sponsor network.</p>
            <p>Keith Vercauteren’s family account describes the hours spent preparing event flyers and WIR race programs in Chilton. The printed artifacts now provide a tangible counterpart to that recollection. The program scans also contain credits for <strong>Jim Vercauteren</strong>; his photographs should be attributed separately from Gary’s and Pete’s.</p>
          </div>
          <aside className={styles.publisherSource}>
            <strong>Primary evidence in the museum</strong>
            <Link href={'/media/race-programs/1982-wisconsin-international-raceway-wi-yearbook?ocrPath=' + encodeURIComponent('programs/1982-wisconsin-international-raceway-wi-yearbook/1982 - WIR PROGRAM 1_008.jpg') + '&q=Vercauteren'}>1982 WIR publishing-company advertisement →</Link>
            <Link href={'/media/race-programs/1993-artgo-challenge-series-yearbook?ocrPath=' + encodeURIComponent('programs/1993-artgo-challenge-series-yearbook/002.jpg') + '&q=Vercauteren'}>1993 ARTGO advertising and mailing credits →</Link>
            <a href="https://www.carsandracingstuff.com/library/articles/24845.php" rel="noreferrer" target="_blank">Keith Vercauteren’s family account →</a>
          </aside>
        </section>

        <section id="legacy" className={styles.legacySection}>
          <div className={styles.legacyCopy}>
            <span className={styles.sectionKicker}>The work lived beyond the printed page</span>
            <h2>Wisconsin International Raceway and Mid-American</h2>
            <p>Gary became public-relations director at Wisconsin International Raceway in 1972. He was involved in building the Red, White and Blue State Championship Series and the race programs that gave fans more than statistics. Pete and Gary later launched the Mid-American Stock Car Series for the 1993 racing season, drawing on the successful grand-national racing formula in northeast Wisconsin.</p>
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
          <p><strong>Documented in the racing press:</strong> <Link href="/media/newspapers/midwest-racing-news/1993-02-11?sourcePage=15&q=Vercauteren">Read the February 11, 1993 MRN report</Link>, which quotes Gary as series president and announces the memorial’s planned move to WIR.</p>
          <p>The 1990–2008 winners below are transcribed from a 2009 <a href="https://www.carsandracingstuff.com/library/articles/25038.php" target="_blank" rel="noreferrer">Mid-American series account</a>; 2009 and 2010 are confirmed in a <a href="https://www.carsandracingstuff.com/library/articles/24935.php" target="_blank" rel="noreferrer">2011 series account</a>. They represent this particular memorial race, not all Mid-American feature winners. Event-level links to museum results will be added after checking each race and venue.</p>
          <div className={styles.memorialGrid}>
            {MEMORIAL_WINNERS.map((item) => <div className={styles.memorialWinner} key={item.year}>
              <span>{item.year}</span><strong>{item.winner}</strong>{'venue' in item ? <small>{item.venue}</small> : null}
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
