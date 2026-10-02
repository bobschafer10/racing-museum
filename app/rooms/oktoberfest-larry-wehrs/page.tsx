import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getRacePrograms, type RaceProgram } from '@/lib/race-programs'
import styles from '../oktoberfest-room.module.css'

export const revalidate = 300

const SERIES_ID = 114
const TRACK_PHOTO_SLUG = 'lacrosse-interstate-speedway'
const TRACK_PAGE_SLUG = 'lacrosse-fairgrounds-wi'
const MEDIA_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szvkleurojiwqkkztxtr.supabase.co') +
  '/storage/v1/object/public/media/'

const WEHRS_WATERMARK =
  MEDIA_BASE +
  'programs/1980-lacrosse-interstate-speedway-wi-yearbook/1981%20LaCrosse%20Speedway%20program_030.jpg'

type ResultRow = {
  id: number
  finishing_position: number | null
  car_number: string | null
  driver_name: string
  driver_slug: string | null
}

type EventRow = {
  id: number
  race_date: string
  winner_name: string | null
  SeriesEventResults: ResultRow[]
}

type PhotoRow = {
  file_name: string
  year: string | number | null
  driver_slug: string | null
  photographer_slug: string | null
  credit_type: string | null
}

type WinnerSummary = {
  name: string
  years: number[]
  slug: string | null
}

const newspaperArtifacts = [
  {
    year: 1970,
    publication: 'Midwest Racing News',
    date: 'October 1, 1970',
    title: 'The First Annual Oktoberfest 200',
    note: 'MRN carried the original race advertisement: 200 laps, 110 miles, a $8,000 purse, $1,000 to win, and the fastest 33 cars starting.',
    href: '/media/newspapers/midwest-racing-news/1970-10-01?sourcePage=4&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1970-10-01/004.jpg',
  },
  {
    year: 1971,
    publication: 'Midwest Racing News',
    date: 'October 7, 1971',
    title: 'Trickle Best at Oktoberfest',
    note: 'The MRN front page put Dick Trickle in victory lane after he captured the second Oktoberfest 200.',
    href: '/media/newspapers/midwest-racing-news/1971-10-07?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/001.jpg',
  },
  {
    year: 1972,
    publication: 'Checkered Flag Racing News',
    date: 'December 15, 1972',
    title: 'One of Shear’s Big Wins',
    note: 'CFRN revisited Joe Shear’s dominant Oktoberfest run, including the late pit stop, 200-lap finish, and top three.',
    href: '/media/newspapers/checkered-flag-racing-news/1972-12-15?sourcePage=2&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/checkered-flag-racing-news/1972-12-15/002.jpg',
  },
  {
    year: 1973,
    publication: 'Midwest Racing News',
    date: 'October 4, 1973',
    title: 'Shear Returns as Defending Oktoberfest Champion',
    note: 'A period MRN race advertisement promoted Joe Shear, LaCrosse track champion Jim Back, and Milwaukee-area champion Al Schill for the weekend.',
    href: '/media/newspapers/midwest-racing-news/1973-10-04?sourcePage=7&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1973-10-04/007.jpg',
  },
  {
    year: 1974,
    publication: 'Midwest Racing News',
    date: 'October 3, 1974',
    title: 'Top Canadian Driver in La Crosse Fest',
    note: 'MRN announced Canadian champion Jerry “The Bear” Makara as the latest entry for the $12,000 two-day Oktoberfest program. He went on to win it.',
    href: '/media/newspapers/midwest-racing-news/1974-10-03?sourcePage=2&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1974-10-03/002.jpg',
  },
  {
    year: 1975,
    publication: 'Midwest Racing News',
    date: 'October 2, 1975',
    title: 'Sixth Oktoberfest 200 Slated at La Crosse',
    note: 'MRN previewed a three-day show with roughly 150 expected drivers and a $15,000 purse.',
    href: '/media/newspapers/midwest-racing-news/1975-10-02?sourcePage=3&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1975-10-02/003.jpg',
  },
  {
    year: 1976,
    publication: 'Midwest Racing News',
    date: 'October 7, 1976',
    title: 'Detjens Wins Two Mains in La Crosse’s Oktoberfest',
    note: 'Dick Johnson’s report details Larry Detjens winning a 50-lapper and the 100-lap championship feature.',
    href: '/media/newspapers/midwest-racing-news/1976-10-07?sourcePage=5&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1976-10-07/005.jpg',
  },
  {
    year: 1977,
    publication: 'Midwest Racing News',
    date: 'October 6, 1977',
    title: 'Detjens Wins at Fest',
    note: 'MRN documented Detjens holding off Steve Burgess in the 100-lap feature and Dick Trickle’s costly wall contact.',
    href: '/media/newspapers/midwest-racing-news/1977-10-06?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1977-10-06/001.jpg',
  },
  {
    year: 1978,
    publication: 'Midwest Racing News',
    date: 'October 5, 1978',
    title: 'Watson Overcomes Trouble to Win Fest',
    note: 'Dave Watson survived an engine failure after a 50-lap victory and still claimed the 100-lap championship feature and overall title.',
    href: '/media/newspapers/midwest-racing-news/1978-10-05?sourcePage=2&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1978-10-05/002.jpg',
  },
  {
    year: 1979,
    publication: 'Midwest Racing News',
    date: 'October 4, 1979',
    title: 'Butch Miller Edges Trickle',
    note: 'The MRN front page captured the two-100 format: Miller won the overall title while Dick Trickle won the second 100-lapper.',
    href: '/media/newspapers/midwest-racing-news/1979-10-04?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1979-10-04/001.jpg',
  },
  {
    year: 1980,
    publication: 'Midwest Racing News',
    date: 'October 2, 1980',
    title: 'Rain Interrupts the 1980 Oktoberfest',
    note: 'MRN preserved the completed Friday and Saturday support-division action while the late-model program waited for its October 12 raindate.',
    href: '/media/newspapers/midwest-racing-news/1980-10-02?sourcePage=10&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1980-10-02/010.jpg',
  },
  {
    year: 1981,
    publication: 'Midwest Racing News',
    date: 'October 1, 1981',
    title: 'Entries Mount for Oktoberfest',
    note: 'Joe Shear, Jim Sauter, and Junior Hanley were among the late entries highlighted before the 12th annual weekend.',
    href: '/media/newspapers/midwest-racing-news/1981-10-01?sourcePage=6&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1981-10-01/6.jpg',
  },
  {
    year: 1982,
    publication: 'Midwest Racing News',
    date: 'October 7, 1982',
    title: 'It Pays Off for Back',
    note: 'MRN showed Larry Wehrs presenting Jim Back with the victory banner after second- and third-place finishes produced the overall title.',
    href: '/media/newspapers/midwest-racing-news/1982-10-07?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1982-10-07/1.jpg',
  },
  {
    year: 1983,
    publication: 'Midwest Racing News',
    date: 'October 20, 1983',
    title: 'Reffner Wins La Crosse’s Fest 200',
    note: 'Tom Reffner won the 100-lap championship feature and secured his third overall Oktoberfest title.',
    href: '/media/newspapers/midwest-racing-news/1983-10-20?sourcePage=5&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1983-10-20/005.jpg',
  },
  {
    year: 1984,
    publication: 'Midwest Racing News',
    date: 'October 18, 1984',
    title: 'Bryan Reffner Snares Close Oktoberfest 100',
    note: 'At age 20, Bryan Reffner held off Ted Musgrave and father Tom Reffner for the biggest victory of his young career.',
    href: '/media/newspapers/midwest-racing-news/1984-10-18?sourcePage=9&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1984-10-18/009.jpg',
  },
  {
    year: 1985,
    publication: 'Midwest Racing News',
    date: 'October 17, 1985',
    title: 'Fest Waits on the Weather',
    note: 'MRN documented the delayed 1985 program and the revised schedule that led into the rescheduled Oktoberfest weekend.',
    href: '/media/newspapers/midwest-racing-news/1985-10-17?sourcePage=5&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1985-10-17/005.jpg',
  },
  {
    year: 1986,
    publication: 'Midwest Racing News',
    date: 'October 16, 1986',
    title: 'Bickle Wins La Crosse Fest 100',
    note: 'Dick Johnson’s report records Rich Bickle Jr. edging Steve Holzhausen in the final Oktoberfest of the Larry Wehrs promotional era.',
    href: '/media/newspapers/midwest-racing-news/1986-10-16?sourcePage=3&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1986-10-16/003.jpg',
  },
]

const featuredProgramSlugs = [
  '1978-lacrosse-interstate-speedway-wi-yearbook',
  '1979-lacrosse-interstate-speedway-wi-yearbook',
  '1981-lacrosse-interstate-speedway-wi-yearbook',
  '1985-lacrosse-interstate-speedway-wi-yearbook',
]

const programArtifactNotes: Record<string, { label: string; note: string }> = {
  '1978-lacrosse-interstate-speedway-wi-yearbook': {
    label: '1978 Oktoberfest Program',
    note: 'Includes Larry and Bernadine Wehrs’ welcome, a season review, driver profiles, starting-lineup pages, and Oktoberfest lap-sponsor material.',
  },
  '1979-lacrosse-interstate-speedway-wi-yearbook': {
    label: '10th Annual Oktoberfest',
    note: 'Preserves the Wehrs welcome, 1970–78 Oktoberfest money-winner tables, track point standings, and the event’s growing statistical record.',
  },
  '1981-lacrosse-interstate-speedway-wi-yearbook': {
    label: '1981 Oktoberfest Program',
    note: 'Contains a detailed 1980 Mark Martin/Joe Shear recap, a Larry Detjens retrospective, all-time Oktoberfest money totals, and race-weekend material.',
  },
  '1985-lacrosse-interstate-speedway-wi-yearbook': {
    label: '16th Annual Oktoberfest',
    note: 'Features the 1984 Bryan Reffner victory recap, top-50 Oktoberfest money winners through 1984, biographies, statistics, and contemporary advertising.',
  },
}

const winnerImages: Record<number, {
  src: string
  alt: string
  note: string
  crop?: { size: string; position: string }
}> = {
  1970: {
    src: '/rooms/oktoberfest/1970-tom-reffner.svg',
    alt: 'Tom Reffner in the 1970 Oktoberfest-winning car at LaCrosse Interstate Speedway',
    note: 'Tom Reffner • 1970 Oktoberfest winner',
  },
  1971: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/001.jpg',
    alt: 'Dick Trickle in the winner circle after the 1971 Oktoberfest 200',
    note: 'Dick Trickle • 1971 winner circle • Midwest Racing News / Gary Schmidt',
    crop: { size: '255% auto', position: '7% 65%' },
  },
  1977: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1977-10-06/003.jpg',
    alt: 'Larry Detjens with promoter Larry Wehrs after the 1977 Oktoberfest victory',
    note: 'Larry Detjens with Larry Wehrs • 1977 Oktoberfest • Midwest Racing News / Wayne Mioskowski',
    crop: { size: '255% auto', position: '7% 14%' },
  },
  1978: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1978-10-05/002.jpg',
    alt: 'Dave Watson after winning the 1978 Oktoberfest at LaCrosse Interstate Speedway',
    note: 'Dave Watson • 1978 Oktoberfest victory • Midwest Racing News / Wayne Mioskowski',
    crop: { size: '255% auto', position: '7% 13%' },
  },
  1979: {
    src: MEDIA_BASE + 'newspapers/checkered-flag-racing-news/1979-10-10/001.jpg',
    alt: 'Butch Miller being congratulated by promoter Larry Wehrs as the 1979 Oktoberfest overall winner',
    note: 'Butch Miller with Larry Wehrs • 1979 overall winner • Checkered Flag Racing News / John Quinn',
    crop: { size: '260% auto', position: '12% 39%' },
  },
  1980: {
    src: '/rooms/oktoberfest/1980-mark-martin.svg',
    alt: 'Mark Martin with the 1980 Oktoberfest winner sign at LaCrosse Interstate Speedway',
    note: 'Mark Martin • 1980 Oktoberfest winner',
  },
  1981: {
    src: '/rooms/oktoberfest/1981-junior-hanley.svg',
    alt: 'Junior Hanley in victory lane after winning the 1981 Oktoberfest',
    note: 'Junior Hanley • 1981 Oktoberfest winner',
  },
  1982: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1982-10-07/1.jpg',
    alt: 'Jim Back with promoter Larry Wehrs after winning the 1982 Oktoberfest',
    note: 'Jim Back with Larry Wehrs • 1982 Oktoberfest • Midwest Racing News / Lee Foster',
    crop: { size: '245% auto', position: '8% 82%' },
  },
  1984: {
    src: '/rooms/oktoberfest/1984-bryan-reffner.svg',
    alt: 'Bryan Reffner with his car and winner sign after the 1984 Oktoberfest',
    note: 'Bryan Reffner • 1984 Oktoberfest winner',
  },
  1986: {
    src: '/rooms/oktoberfest/1986-rich-bickle-jr.jpg',
    alt: 'Rich Bickle Jr. in victory lane with the Oktoberfest trophy and checkered flag in 1986',
    note: 'Rich Bickle Jr. • 1986 Oktoberfest winner',
  },
}

const programPageArtifacts = [
  {
    year: 1978,
    title: 'Welcome to the 1978 Oktoberfest 200',
    note: 'Larry and Bernadine Wehrs welcome the fans and thank them for supporting both the special events and the regular Wednesday-night program.',
    href: '/media/race-programs/1978-lacrosse-interstate-speedway-wi-yearbook',
    image: MEDIA_BASE + 'programs/1978-lacrosse-interstate-speedway-wi-yearbook/1978%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_001.jpg',
  },
  {
    year: 1979,
    title: 'Oktoberfest Overall Money Winners',
    note: 'The tenth-anniversary publication tabulates cumulative late-model money winners from 1970 through 1978 and hobby-stock totals beginning in 1974.',
    href: '/media/race-programs/1979-lacrosse-interstate-speedway-wi-yearbook',
    image: MEDIA_BASE + 'programs/1979-lacrosse-interstate-speedway-wi-yearbook/Page%2036-37.jpg',
  },
  {
    year: 1981,
    title: 'Martin and Shear Split the 1980 Hundreds',
    note: 'The 1981 book retells the rain-delayed 1980 race and explains how Mark Martin won the overall championship on the qualifying tiebreaker.',
    href: '/media/race-programs/1981-lacrosse-interstate-speedway-wi-yearbook',
    image: MEDIA_BASE + 'programs/1981-lacrosse-interstate-speedway-wi-yearbook/1981%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_006.jpg',
  },
  {
    year: 1985,
    title: 'The All-Time Oktoberfest Money List',
    note: 'The 1985 program records the top 50 overall late-model money winners through 1984, led by Joe Shear and Tom Reffner.',
    href: '/media/race-programs/1985-lacrosse-interstate-speedway-wi-yearbook',
    image: MEDIA_BASE + 'programs/1985-lacrosse-interstate-speedway-wi-yearbook/1985%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_013.jpg',
  },
]


function yearOf(date: string) {
  return Number(date.slice(0, 4))
}

function prettyDate(date: string) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function titleize(value?: string | null) {
  if (!value || value.startsWith('unknown')) return 'Museum Archive'
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function photoUrl(photo: PhotoRow) {
  const year = photo.year ? String(photo.year) : 'unknown-year'
  return MEDIA_BASE + 'photos/master/' + TRACK_PHOTO_SLUG + '/' + year + '/' + photo.file_name
}

export default async function OktoberfestLarryWehrsRoom() {
  const [{ data: eventData }, { data: photoData }, programs] = await Promise.all([
    supabase
      .from('SeriesEvents')
      .select(
        'id,race_date,winner_name,SeriesEventResults(id,finishing_position,car_number,driver_name,driver_slug)',
      )
      .eq('series_id', SERIES_ID)
      .gte('race_date', '1970-01-01')
      .lte('race_date', '1986-12-31')
      .order('race_date', { ascending: true }),
    supabase
      .from('photos')
      .select('file_name,year,driver_slug,photographer_slug,credit_type')
      .eq('track_slug', TRACK_PHOTO_SLUG)
      .gte('year', '1970')
      .lte('year', '1986')
      .order('year', { ascending: true })
      .limit(80),
    getRacePrograms(),
  ])

  const events = ((eventData || []) as EventRow[]).map((event) => ({
    ...event,
    SeriesEventResults: [...(event.SeriesEventResults || [])].sort(
      (a, b) => (a.finishing_position || 999) - (b.finishing_position || 999),
    ),
  }))
  const photos = (photoData || []) as PhotoRow[]
  const resultRows = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)

  const winnerMap = new Map<string, WinnerSummary>()
  for (const event of events) {
    const name = event.winner_name || event.SeriesEventResults[0]?.driver_name || 'Winner not listed'
    const year = yearOf(event.race_date)
    const winnerResult = event.SeriesEventResults.find((row) => row.finishing_position === 1)
    const existing = winnerMap.get(name) || { name, years: [], slug: winnerResult?.driver_slug || null }
    existing.years.push(year)
    if (!existing.slug && winnerResult?.driver_slug) existing.slug = winnerResult.driver_slug
    winnerMap.set(name, existing)
  }

  const champions = [...winnerMap.values()].sort(
    (a, b) => b.years.length - a.years.length || a.years[0] - b.years[0],
  )

  const gallery = photos
    .filter((photo) => photo.file_name && photo.year)
    .filter(
      (photo, index, all) =>
        all.findIndex((candidate) => String(candidate.year) === String(photo.year)) === index,
    )
    .slice(0, 10)

  const roomPrograms = featuredProgramSlugs
    .map((slug) => programs.find((program) => program.slug === slug))
    .filter((program): program is RaceProgram => Boolean(program))

  const heroImage =
    MEDIA_BASE +
    'photos/master/lacrosse-interstate-speedway/1981/lacrosse-interstate-speedway_1981_dick-trickle_stan-kalwasinski_photo_555.jpg'
  const overviewImage =
    MEDIA_BASE +
    'photos/master/lacrosse-interstate-speedway/1974/lacrosse-interstate-speedway_1974_dick-trickle_unknown-photographer_photo_001.jpg'

  return (
    <main className={styles.page}>
      <section className={styles.hero} style={{ backgroundImage: 'url(' + heroImage + ')' }}>
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href="/rooms">Museum Rooms</Link>
            <span>›</span>
            <span>Oktoberfest — The Larry Wehrs Years</span>
          </div>

          <div className={styles.roomBadge}>Museum Room 001</div>
          <img
            src="/logos/series/oktoberfest-race-weekend.jpg"
            alt="Oktoberfest Race Weekend"
            className={styles.heroLogo}
          />
          <h1>The Larry Wehrs Years</h1>
          <div className={styles.heroYears}>1970–1986</div>
          <p className={styles.heroLede}>
            Seventeen falls. Seventeen Oktoberfest champions. The era that established LaCrosse’s
            October classic as one of the defining late-model gatherings in the Upper Midwest.
          </p>

          <div className={styles.heroStats}>
            <div><strong>{events.length || 17}</strong><span>Wehrs-era editions</span></div>
            <div><strong>{champions.length || 14}</strong><span>Different champions</span></div>
            <div><strong>{resultRows.toLocaleString('en-US')}</strong><span>Preserved result rows</span></div>
            <div><strong>200</strong><span>Classic race laps</span></div>
          </div>
        </div>
      </section>

      <nav className={styles.roomNav} aria-label="Oktoberfest room sections">
        <div className={styles.roomNavInner}>
          <a href="#overview">Overview</a>
          <a href="#year-by-year">Year-by-Year</a>
          <a href="#winners">Winners</a>
          <a href="#photos">Photos</a>
          <a href="#newspapers">Newspapers</a>
          <a href="#programs">Programs</a>
          <a href="#legacy">The Legacy</a>
        </div>
      </nav>

      <div className={styles.shell}>
        <section className={styles.overview} id="overview">
          <div className={styles.overviewCopy}>
            <div className={styles.kicker}>The Birth of Fest</div>
            <h2>A New Era at LaCrosse</h2>
            <p>
              In 1970, the fairgrounds oval became LaCrosse Interstate Speedway and was paved for
              weekly stock-car racing. Robert Morris served as president with Larry Wehrs as his
              partner. That first season ended with Tom Reffner winning the inaugural Oktoberfest
              200.
            </p>
            <p>
              Wehrs became sole promoter in 1972. The official Oktoberfest history identifies every
              race from 1970 through 1986 as part of the Larry Wehrs promotional era, with the Super
              Late Model rules following the popular Central Wisconsin Racing Association formula.
            </p>
            <div className={styles.sourceLinks}>
              <a href="https://oktoberfestraceweekend.com/history/" target="_blank" rel="noreferrer">
                Official Oktoberfest History ↗
              </a>
              <a href="https://lacrossespeedway.com/history-records/" target="_blank" rel="noreferrer">
                LaCrosse Speedway History ↗
              </a>
            </div>
          </div>
          <figure className={styles.overviewPhoto}>
            <img src={overviewImage} alt="Dick Trickle at LaCrosse Interstate Speedway in 1974" />
            <figcaption>Dick Trickle at LaCrosse Interstate Speedway, 1974 • Museum photo archive</figcaption>
          </figure>
        </section>

        <section className={[styles.section, styles.yearByYearSection].join(' ')} id="year-by-year">
          <div
            className={styles.wehrsWatermark}
            style={{ backgroundImage: 'url(' + WEHRS_WATERMARK + ')' }}
            aria-hidden="true"
          />
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.kicker}>The Larry Wehrs Years</div>
              <h2>Year by Year • 1970–1986</h2>
            </div>
            <p>Every Wehrs-era Oktoberfest winner with the museum’s preserved finishing order.</p>
          </div>

          <div className={styles.yearGrid}>
            {events.map((event) => {
              const year = yearOf(event.race_date)
              const topThree = event.SeriesEventResults.filter(
                (row) => row.finishing_position && row.finishing_position <= 3,
              )
              const winnerResult = event.SeriesEventResults.find((row) => row.finishing_position === 1)
              return (
                <article className={styles.yearCard} id={'year-' + year} key={event.id}>
                  <div className={styles.yearCardTop}>
                    <span>{year}</span>
                    <small>{prettyDate(event.race_date)}</small>
                  </div>
                  <h3>{event.winner_name || winnerResult?.driver_name || 'Winner not listed'}</h3>
                  {winnerImages[year] ? (
                    <figure className={styles.yearWinnerPhoto}>
                      {winnerImages[year].crop ? (
                        <div
                          className={styles.yearWinnerCrop}
                          role="img"
                          aria-label={winnerImages[year].alt}
                          style={{
                            backgroundImage: 'url(' + winnerImages[year].src + ')',
                            backgroundSize: winnerImages[year].crop!.size,
                            backgroundPosition: winnerImages[year].crop!.position,
                          }}
                        />
                      ) : (
                        <img src={winnerImages[year].src} alt={winnerImages[year].alt} />
                      )}
                      <figcaption>{winnerImages[year].note}</figcaption>
                    </figure>
                  ) : null}
                  <div className={styles.yearResultDepth}>
                    {event.SeriesEventResults.length
                      ? event.SeriesEventResults.length + ' finishing positions preserved'
                      : 'Winner chronology preserved'}
                  </div>
                  {topThree.length ? (
                    <div className={styles.podium}>
                      {topThree.map((row) => (
                        <div key={row.id}>
                          <span>{row.finishing_position}</span>
                          <strong>{row.driver_name}</strong>
                          <small>{row.car_number ? '#' + row.car_number : 'Car number not listed'}</small>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {event.SeriesEventResults.length ? (
                    <details className={styles.fullField}>
                      <summary>View full preserved field</summary>
                      <div className={styles.fullFieldRows}>
                        {event.SeriesEventResults.map((row) => (
                          <div key={row.id}>
                            <span>{row.finishing_position || '—'}</span>
                            <strong>{row.driver_name}</strong>
                            <small>{row.car_number ? '#' + row.car_number : '—'}</small>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <div className={styles.yearLinks}>
                    <Link href={'/results/' + event.race_date}>Full Race Result →</Link>
                    {winnerResult?.driver_slug ? (
                      <Link href={'/drivers/' + winnerResult.driver_slug}>Winner Profile →</Link>
                    ) : null}
                    {newspaperArtifacts.find((artifact) => artifact.year === year) ? (
                      <Link href={newspaperArtifacts.find((artifact) => artifact.year === year)!.href}>
                        Period Coverage →
                      </Link>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className={styles.darkSection} id="winners">
          <div className={styles.darkSectionHead}>
            <div>
              <div className={styles.kicker}>Champions Wall</div>
              <h2>The Drivers Who Won Fest</h2>
            </div>
            <p>Fourteen different drivers captured the seventeen Wehrs-era Oktoberfest titles.</p>
          </div>
          <div className={styles.championsGrid}>
            {champions.map((champion) => (
              <article key={champion.name} className={styles.championCard}>
                <span>{champion.years.length > 1 ? champion.years.length + '× Champion' : 'Champion'}</span>
                <strong>{champion.name}</strong>
                <small>{champion.years.join(' • ')}</small>
                {champion.slug ? <Link href={'/drivers/' + champion.slug}>Driver Profile →</Link> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="photos">
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.kicker}>Faces of the Era</div>
              <h2>LaCrosse in the 1970s &amp; 1980s</h2>
            </div>
            <p>Period photographs from the museum archive, shown with year and source credit.</p>
          </div>
          <div className={styles.photoGrid}>
            {gallery.map((photo) => (
              <figure key={photo.file_name} className={styles.photoCard}>
                <img
                  src={photoUrl(photo)}
                  alt={titleize(photo.driver_slug) + ' at LaCrosse Interstate Speedway'}
                />
                <figcaption>
                  <strong>{titleize(photo.driver_slug)}</strong>
                  <span>
                    {String(photo.year)} • {titleize(photo.photographer_slug)}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className={styles.centerLink}>
            <Link href="/photos">Browse the Full Museum Photo Archive →</Link>
          </div>
        </section>

        <section className={styles.paperSection} id="newspapers">
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.kicker}>From the Newspapers</div>
              <h2>The Contemporary Story of Fest</h2>
            </div>
            <p>
              Selected MRN and Checkered Flag Racing News pages are linked to the exact scanned page
              so visitors can move directly from the exhibit into the original coverage.
            </p>
          </div>

          <div className={styles.archiveStrip}>
            <div>
              <strong>{newspaperArtifacts.length}</strong>
              <span>Curated newspaper artifacts</span>
            </div>
            <div>
              <strong>MRN + CFRN</strong>
              <span>Two major regional racing publications</span>
            </div>
            <div>
              <strong>1970–1986</strong>
              <span>Coverage from the Wehrs era</span>
            </div>
          </div>

          <div className={styles.newspaperGrid}>
            {newspaperArtifacts.map((artifact) => (
              <Link href={artifact.href} className={styles.newspaperCard} key={artifact.href}>
                <div className={styles.newspaperImageWrap}>
                  <img src={artifact.image} alt={artifact.publication + ' — ' + artifact.date} />
                  <span className={styles.paperYear}>{artifact.year}</span>
                </div>
                <div className={styles.newspaperBody}>
                  <span>{artifact.publication} • {artifact.date}</span>
                  <strong>{artifact.title}</strong>
                  <p>{artifact.note}</p>
                  <b>Open Exact Page in the Archive →</b>
                </div>
              </Link>
            ))}
          </div>
          <div className={styles.centerLink}>
            <Link href="/media/newspapers?q=Oktoberfest">Search All Oktoberfest Newspaper OCR →</Link>
          </div>
        </section>

        <section className={styles.section} id="programs">
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.kicker}>Programs &amp; Yearbooks</div>
              <h2>The Original Oktoberfest Shelf</h2>
            </div>
            <p>
              Four digitized LaCrosse publications currently anchor the room, with the scanned pages
              and OCR preserving far more than the covers.
            </p>
          </div>

          {roomPrograms.length ? (
            <div className={styles.programGrid}>
              {roomPrograms.map((program) => {
                const artifact = programArtifactNotes[program.slug]
                return (
                  <Link
                    href={'/media/race-programs/' + program.slug}
                    className={styles.programCard}
                    key={program.slug}
                  >
                    <div className={styles.programCover}>
                      {program.coverImage ? (
                        <img src={program.coverImage} alt={program.title} />
                      ) : (
                        <div>Cover not available</div>
                      )}
                    </div>
                    <span>{artifact?.label || program.year || 'Year unknown'}</span>
                    <strong>{program.title}</strong>
                    <p className={styles.programNote}>
                      {artifact?.note || 'Open the complete digitized publication in the museum archive.'}
                    </p>
                    <small>{program.images.length} scanned images • Open publication →</small>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className={styles.archiveCallout}>
              LaCrosse programs and yearbooks are available through the museum printed archive.
            </div>
          )}

          <div className={styles.programHighlights}>
            <article>
              <span>1978</span>
              <strong>Larry &amp; Bernadine Wehrs Welcome the Fans</strong>
              <p>
                The opening program message thanks supporters of both special events and weekly
                Wednesday-night racing, followed by a season review and Oktoberfest line-up material.
              </p>
            </article>
            <article>
              <span>1979</span>
              <strong>Ten Years of Fest in Numbers</strong>
              <p>
                The tenth-anniversary book preserves overall money-winner tables dating to 1970,
                hobby-stock totals from 1974, and the season’s point standings.
              </p>
            </article>
            <article>
              <span>1981</span>
              <strong>Martin vs. Shear — The 1980 Story Retold</strong>
              <p>
                The next year’s Oktoberfest book explains how Mark Martin and Joe Shear split the
                two 100-lappers and how qualifying broke the tie for the overall title.
              </p>
            </article>
            <article>
              <span>1985</span>
              <strong>Bryan Reffner Joins His Father</strong>
              <p>
                The 1985 program looks back at Bryan Reffner’s 1984 breakthrough and preserves an
                all-time top-50 Oktoberfest money-winner table through the end of 1984.
              </p>
            </article>
          </div>

          <div className={styles.artifactPageHead}>
            <div className={styles.kicker}>Pages from the Display Case</div>
            <h3>Open the Original Artifacts</h3>
          </div>
          <div className={styles.artifactPageGrid}>
            {programPageArtifacts.map((artifact) => (
              <Link href={artifact.href} className={styles.artifactPageCard} key={artifact.title}>
                <div className={styles.artifactPageImage}>
                  <img src={artifact.image} alt={artifact.title} />
                </div>
                <span>{artifact.year}</span>
                <strong>{artifact.title}</strong>
                <p>{artifact.note}</p>
                <b>Open Complete Publication →</b>
              </Link>
            ))}
          </div>

          <div className={styles.centerLink}>
            <Link href="/media/race-programs?decade=1970s">Browse the Full Printed Archive →</Link>
          </div>
        </section>

        <section className={styles.legacy} id="legacy">
          <div>
            <div className={styles.kicker}>1986 • The End of an Era</div>
            <h2>Rich Bickle Closes the Wehrs Years</h2>
            <p>
              Rich Bickle Jr. won the 1986 Oktoberfest, the seventeenth and final edition promoted
              during the Larry Wehrs era. Beginning in 1987, the event’s main touring-class race
              became the Oktoberfest champion event, opening the next chapter of the tradition.
            </p>
            <div className={styles.legacyLinks}>
              <Link href={'/tracks/' + TRACK_PAGE_SLUG}>Explore LaCrosse Fairgrounds Speedway →</Link>
              <Link href="/events">Return to Special Events →</Link>
            </div>
          </div>

          <aside className={styles.todayCard}>
            <span>The Story Continues</span>
            <strong>57th Oktoberfest Race Weekend</strong>
            <p>October 8–11, 2026 • LaCrosse Fairgrounds Speedway</p>
            <a href="https://oktoberfestraceweekend.com/" target="_blank" rel="noreferrer">
              Visit the Official 2026 Event Site ↗
            </a>
          </aside>
        </section>

        <footer className={styles.roomFooter}>
          <Link href="/rooms">← Back to Museum Rooms</Link>
          <span>Room 001 • Oktoberfest Race Weekend — The Larry Wehrs Years</span>
        </footer>
      </div>
    </main>
  )
}
