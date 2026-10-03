import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './room.module.css'

export const revalidate = 300

const SERIES_ID = 114
const ROOM_PATH = '/rooms/oktoberfest-larry-wehrs'
const ROOM_LABEL = 'Return to Oktoberfest Museum Room'
const MEDIA_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szvkleurojiwqkkztxtr.supabase.co') +
  '/storage/v1/object/public/media/'

const FALLBACK_WEHRS =
  MEDIA_BASE + 'newspapers/checkered-flag-racing-news/1979-10-10/001.jpg'
const PAST_WINNERS_1978 =
  MEDIA_BASE +
  'programs/1978-lacrosse-interstate-speedway-wi-yearbook/1978%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_004.jpg'

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

type WinnerImage = {
  src: string
  position?: string
  size?: string
}

const raceStoryLinks: Record<number, string> = {
  1970: '/media/newspapers/midwest-racing-news/1970-10-01?sourcePage=4&q=Oktoberfest',
  1971: '/media/newspapers/midwest-racing-news/1971-10-07?sourcePage=1&q=Oktoberfest',
  1972: '/media/newspapers/checkered-flag-racing-news/1972-12-15?sourcePage=2&q=Oktoberfest',
  1973: '/media/newspapers/midwest-racing-news/1973-12-13?sourcePage=19&q=Oktoberfest',
  1974: '/media/newspapers/checkered-flag-racing-news/1974-12-11?sourcePage=7&q=Oktoberfest',
  1975: '/media/newspapers/checkered-flag-racing-news/1975-12-10?sourcePage=2&q=Oktoberfest',
  1976: '/media/newspapers/midwest-racing-news/1976-10-07?sourcePage=5&q=Oktoberfest',
  1977: '/media/newspapers/midwest-racing-news/1977-10-06?sourcePage=1&q=Oktoberfest',
  1978: '/media/newspapers/midwest-racing-news/1978-10-05?sourcePage=2&q=Oktoberfest',
  1979: '/media/newspapers/midwest-racing-news/1979-10-04?sourcePage=1&q=Oktoberfest',
  1980: '/media/newspapers/midwest-racing-news/1980-12-11?sourcePage=19&q=Oktoberfest',
  1981: '/media/newspapers/midwest-racing-news/1981-12-10?sourcePage=24&q=Oktoberfest',
  1982: '/media/newspapers/midwest-racing-news/1982-10-07?sourcePage=1&q=Oktoberfest',
  1983: '/media/newspapers/midwest-racing-news/1983-10-20?sourcePage=5&q=Oktoberfest',
  1984: '/media/newspapers/midwest-racing-news/1984-10-18?sourcePage=9&q=Oktoberfest',
  1985: '/media/newspapers/midwest-racing-news/1985-11-14?sourcePage=5&q=Oktoberfest',
  1986: '/media/newspapers/midwest-racing-news/1986-10-16?sourcePage=3&q=Oktoberfest',
}

const winnerImages: Record<number, WinnerImage> = {
  1970: { src: '/rooms/oktoberfest/1970-tom-reffner.svg' },
  1971: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/001.jpg',
    size: '255% auto',
    position: '7% 65%',
  },
  1974: {
    src:
      MEDIA_BASE +
      'photos/master/lacrosse-interstate-speedway/1974/lacrosse-interstate-speedway_1974_jerry-makara_unknown-photographer_photo_001.jpg',
    position: 'center 35%',
  },
  1977: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1977-10-06/003.jpg',
    size: '255% auto',
    position: '7% 14%',
  },
  1978: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1978-10-05/002.jpg',
    size: '255% auto',
    position: '7% 13%',
  },
  1979: {
    src: MEDIA_BASE + 'newspapers/checkered-flag-racing-news/1979-10-10/001.jpg',
    size: '260% auto',
    position: '12% 39%',
  },
  1980: { src: '/rooms/oktoberfest/1980-mark-martin.svg' },
  1981: { src: '/rooms/oktoberfest/1981-junior-hanley.svg' },
  1982: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1982-10-07/1.jpg',
    size: '245% auto',
    position: '8% 82%',
  },
  1984: { src: '/rooms/oktoberfest/1984-bryan-reffner.svg' },
  1986: { src: '/rooms/oktoberfest/1986-rich-bickle-jr.jpg', position: 'center 25%' },
}

const artifacts = [
  {
    kind: 'Race story',
    title: 'Trickle Best at Oktoberfest',
    note: 'The 1971 MRN front page places Dick Trickle in victory lane after the second Oktoberfest 200.',
    href: '/media/newspapers/midwest-racing-news/1971-10-07?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/001.jpg',
  },
  {
    kind: 'Race story',
    title: 'Butch Miller Edges Trickle',
    note: 'The 1979 contemporary report preserves the two-100 format and the overall championship.',
    href: '/media/newspapers/midwest-racing-news/1979-10-04?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1979-10-04/001.jpg',
  },
  {
    kind: 'Race story',
    title: 'Bickle Wins La Crosse Fest 100',
    note: 'The final Oktoberfest of the Larry Wehrs promotional era, reported by Midwest Racing News.',
    href: '/media/newspapers/midwest-racing-news/1986-10-16?sourcePage=3&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1986-10-16/003.jpg',
  },
  {
    kind: 'Program',
    title: '1978 Oktoberfest Program',
    note: 'Larry and Bernadine Wehrs welcome the fans alongside race-weekend material and driver features.',
    href: '/media/race-programs/1978-lacrosse-interstate-speedway-wi-yearbook',
    image:
      MEDIA_BASE +
      'programs/1978-lacrosse-interstate-speedway-wi-yearbook/1978%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_001.jpg',
  },
  {
    kind: 'Program',
    title: '1981 Oktoberfest Program',
    note: 'Includes the 1980 Mark Martin/Joe Shear recap, a Larry Detjens retrospective, and all-time statistics.',
    href: '/media/race-programs/1981-lacrosse-interstate-speedway-wi-yearbook',
    image:
      MEDIA_BASE +
      'programs/1981-lacrosse-interstate-speedway-wi-yearbook/1981%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_006.jpg',
  },
  {
    kind: 'Program',
    title: '16th Annual Oktoberfest',
    note: 'The 1985 publication preserves biographies, statistics, advertising, and the all-time money list.',
    href: '/media/race-programs/1985-lacrosse-interstate-speedway-wi-yearbook',
    image:
      MEDIA_BASE +
      'programs/1985-lacrosse-interstate-speedway-wi-yearbook/1985%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_013.jpg',
  },
]

function yearOf(date: string) {
  return Number(date.slice(0, 4))
}

function prettyDate(date: string) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function withReturn(href: string, year: number) {
  const joiner = href.includes('?') ? '&' : '?'
  return (
    href +
    joiner +
    'returnTo=' +
    encodeURIComponent(ROOM_PATH + '#year-' + year) +
    '&returnLabel=' +
    encodeURIComponent(ROOM_LABEL)
  )
}

export default async function OktoberfestLarryWehrsRoom() {
  const [{ data: eventData }, { data: assetData }] = await Promise.all([
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
      .from('museum_room_assets')
      .select('data_base64,mime_type')
      .eq('asset_key', 'oktoberfest-larry-wehrs-watermark')
      .maybeSingle(),
  ])

  const events = ((eventData || []) as EventRow[]).map((event) => ({
    ...event,
    SeriesEventResults: [...(event.SeriesEventResults || [])].sort(
      (a, b) => (a.finishing_position || 999) - (b.finishing_position || 999),
    ),
  }))

  const resultRows = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)
  const winnerMap = new Map<string, { years: number[]; slug: string | null }>()

  for (const event of events) {
    const winnerResult = event.SeriesEventResults.find((row) => row.finishing_position === 1)
    const name = event.winner_name || winnerResult?.driver_name || 'Winner not listed'
    const existing = winnerMap.get(name) || { years: [], slug: winnerResult?.driver_slug || null }
    existing.years.push(yearOf(event.race_date))
    if (!existing.slug && winnerResult?.driver_slug) existing.slug = winnerResult.driver_slug
    winnerMap.set(name, existing)
  }

  const champions = [...winnerMap.entries()].sort(
    (a, b) => b[1].years.length - a[1].years.length || a[1].years[0] - b[1].years[0],
  )

  const watermarkSrc =
    assetData?.data_base64 && assetData?.mime_type
      ? 'data:' + assetData.mime_type + ';base64,' + assetData.data_base64
      : FALLBACK_WEHRS

  const heroImage =
    MEDIA_BASE +
    'photos/master/lacrosse-interstate-speedway/1981/lacrosse-interstate-speedway_1981_dick-trickle_stan-kalwasinski_photo_555.jpg'
  const introImage =
    MEDIA_BASE +
    'photos/master/lacrosse-interstate-speedway/1974/lacrosse-interstate-speedway_1974_dick-trickle_unknown-photographer_photo_001.jpg'

  return (
    <main className={styles.page}>
      <section className={styles.hero} style={{ backgroundImage: 'url(' + heroImage + ')' }}>
        <div className={styles.heroInner}>
          <div className={styles.crumbs}>
            <Link href="/">Home</Link><span>›</span><Link href="/rooms">Museum Rooms</Link><span>›</span>
            <span>Oktoberfest</span>
          </div>
          <div className={styles.badge}>Museum Room 001</div>
          <img className={styles.logo} src="/logos/series/oktoberfest-race-weekend.jpg" alt="Oktoberfest Race Weekend" />
          <h1>The Larry Wehrs Years</h1>
          <div className={styles.years}>1970–1986</div>
          <p className={styles.lede}>
            The first seventeen Oktoberfest championships at LaCrosse — presented as an exhibit,
            with the deeper race results, driver profiles and original source material one click away.
          </p>
          <div className={styles.stats}>
            <div><strong>{events.length || 17}</strong><span>Wehrs-era editions</span></div>
            <div><strong>{champions.length || 14}</strong><span>Different champions</span></div>
            <div><strong>{resultRows.toLocaleString('en-US')}</strong><span>Preserved result rows</span></div>
          </div>
        </div>
      </section>

      <nav className={styles.nav} aria-label="Oktoberfest room sections">
        <div className={styles.navInner}>
          <a href="#story">The Story</a>
          <a href="#winners">Winners Wall</a>
          <a href="#artifacts">Artifacts</a>
          <a href="#legacy">Legacy</a>
        </div>
      </nav>

      <div className={styles.shell}>
        <section className={styles.intro} id="story">
          <div className={styles.watermark} style={{ backgroundImage: 'url(' + watermarkSrc + ')' }} aria-hidden="true" />
          <div className={styles.introCopy}>
            <div className={styles.kicker}>The Birth of Fest</div>
            <h2>A New Era at LaCrosse</h2>
            <p>
              The paved LaCrosse Interstate Speedway era began in 1970. That first season closed with
              Tom Reffner winning the inaugural Oktoberfest 200, beginning a fall tradition that quickly
              became one of the Upper Midwest's defining late-model gatherings.
            </p>
            <p>
              Larry Wehrs became sole promoter in 1972. This room follows the seventeen Oktoberfest
              champions from 1970 through 1986 without turning the exhibit itself into a database dump.
              The preserved fields, race stories and driver records remain available from each year below.
            </p>
            <div className={styles.sourceLinks}>
              <a href="https://oktoberfestraceweekend.com/history/" target="_blank" rel="noreferrer">Official Oktoberfest History ↗</a>
              <Link href="/tracks/lacrosse-fairgrounds-wi">LaCrosse Track Archive →</Link>
            </div>
          </div>
          <figure className={styles.introPhoto}>
            <img src={introImage} alt="Dick Trickle at LaCrosse Interstate Speedway in 1974" />
            <figcaption>Dick Trickle at LaCrosse Interstate Speedway, 1974 • Museum photo archive</figcaption>
          </figure>
        </section>

        <section className={styles.section} id="winners">
          <div className={styles.head}>
            <div>
              <div className={styles.kicker}>The Larry Wehrs Years</div>
              <h2>Winners Wall • 1970–1986</h2>
            </div>
            <p>One year, one champion, one doorway into the preserved record. No full fields on the wall.</p>
          </div>

          <div className={styles.winnerGrid}>
            {events.map((event) => {
              const year = yearOf(event.race_date)
              const winnerResult = event.SeriesEventResults.find((row) => row.finishing_position === 1)
              const winner = event.winner_name || winnerResult?.driver_name || 'Winner not listed'
              const image = winnerImages[year]
              const story = raceStoryLinks[year]
              return (
                <article className={styles.yearCard} id={'year-' + year} key={event.id}>
                  {image ? (
                    <div
                      className={styles.photo}
                      role="img"
                      aria-label={winner + ' — ' + year + ' Oktoberfest winner'}
                      style={{
                        backgroundImage: 'url(' + image.src + ')',
                        backgroundPosition: image.position || 'center',
                        backgroundSize: image.size || 'cover',
                      }}
                    />
                  ) : (
                    <div className={styles.plaque} aria-label={year + ' Oktoberfest winner plaque'}>{year}</div>
                  )}
                  <div className={styles.cardBody}>
                    <div className={styles.yearTop}><span>{year}</span><small>{prettyDate(event.race_date)}</small></div>
                    <h3>{winner}</h3>
                    <div className={styles.depth}>{event.SeriesEventResults.length} finishing positions preserved</div>
                    <div className={styles.yearLinks}>
                      {story ? <Link href={withReturn(story, year)}>Race Story →</Link> : null}
                      {winnerResult?.driver_slug ? (
                        <Link href={withReturn('/drivers/' + winnerResult.driver_slug, year)}>Winner Profile →</Link>
                      ) : null}
                      <Link href={withReturn('/results/' + event.race_date, year)}>Race Data →</Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className={styles.championBar}>
            <strong>The drivers who won Fest</strong>
            <div className={styles.champions}>
              {champions.map(([name, data]) => (
                <span key={name}>{name} • {data.years.join(', ')}</span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="artifacts">
          <div className={styles.head}>
            <div>
              <div className={styles.kicker}>Original Source Material</div>
              <h2>Artifacts &amp; Media</h2>
            </div>
            <p>A small display case from the larger archive — not every clipping and program page at once.</p>
          </div>

          <div className={styles.artifactGrid}>
            {artifacts.map((artifact) => (
              <Link className={styles.artifact} href={artifact.href} key={artifact.href}>
                <div className={styles.artifactImage} style={{ backgroundImage: 'url(' + artifact.image + ')' }} />
                <div className={styles.artifactBody}>
                  <span>{artifact.kind}</span>
                  <strong>{artifact.title}</strong>
                  <p>{artifact.note}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className={styles.archiveLinks}>
            <Link href="/media/newspapers?q=Oktoberfest">Search all Oktoberfest newspaper OCR →</Link>
            <Link href="/media/race-programs">Browse race programs →</Link>
            <Link href="/photos">Browse museum photos →</Link>
          </div>
        </section>

        <section className={styles.legacy} id="legacy">
          <div className={styles.kicker}>The Transition</div>
          <h2>Rich Bickle Closes the Wehrs Years</h2>
          <p>
            Rich Bickle Jr.'s 1986 victory closes this first museum room. The race continued, but the
            Larry Wehrs promotional era had reached its finish. The deeper archive remains connected to
            this exhibit through the 1986 race story, race data and driver record.
          </p>
          <div className={styles.legacyLinks}>
            <Link href={withReturn(raceStoryLinks[1986], 1986)}>1986 Race Story</Link>
            <Link href={withReturn('/drivers/rich-bickle-jr', 1986)}>Rich Bickle Jr. Profile</Link>
            <Link href={withReturn('/results/1986-09-28', 1986)}>1986 Race Data</Link>
          </div>
        </section>

        <Link className={styles.back} href="/rooms">← Return to Museum Rooms</Link>
      </div>
    </main>
  )
}
