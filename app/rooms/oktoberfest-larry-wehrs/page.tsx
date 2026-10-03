import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './room-final.module.css'

export const revalidate = 300

const SERIES_ID = 114
const ROOM_PATH = '/rooms/oktoberfest-larry-wehrs'
const ROOM_LABEL = 'Return to Oktoberfest Museum Room'
const MEDIA_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szvkleurojiwqkkztxtr.supabase.co') +
  '/storage/v1/object/public/media/'

const SPRITE = '/rooms/oktoberfest/room001-winner-sprite.jpg?v=room001-photos-20261003'
const WEHRS_WATERMARK = '/rooms/oktoberfest/larry-wehrs-watermark.jpg?v=room001-photos-20261003'

const heroImage =
  MEDIA_BASE +
  'photos/master/lacrosse-interstate-speedway/1981/lacrosse-interstate-speedway_1981_dick-trickle_stan-kalwasinski_photo_555.jpg'
const originImage =
  MEDIA_BASE +
  'photos/master/lacrosse-interstate-speedway/1974/lacrosse-interstate-speedway_1974_dick-trickle_unknown-photographer_photo_001.jpg'

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

type SpritePosition = { x: number; y: number }

const spritePositions: Record<number, SpritePosition> = {
  1970: { x: 0, y: 0 },
  1971: { x: 33.333, y: 0 },
  1972: { x: 66.667, y: 0 },
  1974: { x: 100, y: 0 },
  1975: { x: 0, y: 50 },
  1976: { x: 33.333, y: 50 },
  1977: { x: 66.667, y: 50 },
  1978: { x: 100, y: 50 },
  1979: { x: 0, y: 100 },
  1982: { x: 33.333, y: 100 },
  1983: { x: 66.667, y: 100 },
  1986: { x: 100, y: 100 },
}

const localWinnerImages: Record<number, string> = {
  1980: '/rooms/oktoberfest/1980-mark-martin.svg',
  1981: '/rooms/oktoberfest/1981-junior-hanley.svg',
  1984: '/rooms/oktoberfest/1984-bryan-reffner.svg',
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

const artifacts = [
  {
    eyebrow: '1971 • Midwest Racing News',
    title: 'Trickle Best at Oktoberfest',
    note: 'The contemporary front page puts Dick Trickle in victory lane after the second Oktoberfest 200.',
    href: '/media/newspapers/midwest-racing-news/1971-10-07?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/001.jpg',
  },
  {
    eyebrow: '1978 • Original Program',
    title: 'Larry & Bernadine Welcome the Fans',
    note: 'The program preserves the voice and atmosphere of Oktoberfest at the height of the Wehrs era.',
    href: '/media/race-programs/1978-lacrosse-interstate-speedway-wi-yearbook',
    image:
      MEDIA_BASE +
      'programs/1978-lacrosse-interstate-speedway-wi-yearbook/1978%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_001.jpg',
  },
  {
    eyebrow: '1981 • Original Program',
    title: 'Martin and Shear Split the Hundreds',
    note: 'The 1981 book revisits the rain-delayed 1980 race and the tiebreaker that made Mark Martin the overall champion.',
    href: '/media/race-programs/1981-lacrosse-interstate-speedway-wi-yearbook',
    image:
      MEDIA_BASE +
      'programs/1981-lacrosse-interstate-speedway-wi-yearbook/1981%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_006.jpg',
  },
  {
    eyebrow: '1985 • Original Program',
    title: 'The All-Time Oktoberfest Money List',
    note: 'The 1985 publication captures the event’s accumulated record through the closing years of the era.',
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

function withRoomReturn(href: string, year: number) {
  const separator = href.includes('?') ? '&' : '?'
  const returnTo = encodeURIComponent(`${ROOM_PATH}#year-${year}`)
  const returnLabel = encodeURIComponent(ROOM_LABEL)
  return `${href}${separator}returnTo=${returnTo}&returnLabel=${returnLabel}`
}

function WinnerVisual({ year, winner }: { year: number; winner: string }) {
  const sprite = spritePositions[year]
  if (sprite) {
    return (
      <div
        className={styles.spritePhoto}
        role="img"
        aria-label={`${winner}, ${year} Oktoberfest winner`}
        style={{
          backgroundImage: `url("${SPRITE}")`,
          backgroundPosition: `${sprite.x}% ${sprite.y}%`,
        }}
      />
    )
  }

  const localImage = localWinnerImages[year]
  if (localImage) {
    return <img className={styles.winnerPhoto} src={localImage} alt={`${winner}, ${year} Oktoberfest winner`} />
  }

  return (
    <div className={styles.yearPlaque} aria-label={`${year} ${winner}`}>
      <strong>{year}</strong>
      <span>Winner photograph pending</span>
    </div>
  )
}

export default async function OktoberfestLarryWehrsRoom() {
  const { data: eventData } = await supabase
    .from('SeriesEvents')
    .select(
      'id,race_date,winner_name,SeriesEventResults(id,finishing_position,car_number,driver_name,driver_slug)',
    )
    .eq('series_id', SERIES_ID)
    .gte('race_date', '1970-01-01')
    .lte('race_date', '1986-12-31')
    .order('race_date', { ascending: true })

  const events = ((eventData || []) as EventRow[]).map((event) => ({
    ...event,
    SeriesEventResults: [...(event.SeriesEventResults || [])].sort(
      (a, b) => (a.finishing_position || 999) - (b.finishing_position || 999),
    ),
  }))

  const winners = events.map((event) => {
    const first = event.SeriesEventResults.find((row) => row.finishing_position === 1)
    return first?.driver_name || event.winner_name || 'Winner not listed'
  })
  const champions = new Set(winners)
  const resultRows = events.reduce((total, event) => total + event.SeriesEventResults.length, 0)

  return (
    <main className={styles.page}>
      <section className={styles.hero} style={{ backgroundImage: `url("${heroImage}")` }}>
        <img className={styles.watermark} src={WEHRS_WATERMARK} alt="" aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>Museum Room 001 • Oktoberfest Race Weekend</div>
          <img className={styles.logo} src="/logos/series/oktoberfest-race-weekend.jpg" alt="Oktoberfest Race Weekend" />
          <h1>The Larry Wehrs Years</h1>
          <div className={styles.years}>1970–1986</div>
          <p className={styles.lede}>
            Seventeen autumn weekends that established LaCrosse’s Oktoberfest as one of the defining
            late-model gatherings in the Upper Midwest.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}><strong>{events.length || 17}</strong><span>Wehrs-era editions</span></div>
            <div className={styles.stat}><strong>{champions.size || 14}</strong><span>Different champions</span></div>
            <div className={styles.stat}><strong>{resultRows || 512}</strong><span>Preserved result rows</span></div>
            <div className={styles.stat}><strong>1970–86</strong><span>Era preserved</span></div>
          </div>
        </div>
      </section>

      <nav className={styles.nav} aria-label="Room navigation">
        <div className={styles.navInner}>
          <a href="#story">The Story</a>
          <a href="#winners">Winners Wall</a>
          <a href="#artifacts">Display Case</a>
          <a href="#legacy">Legacy</a>
        </div>
      </nav>

      <div className={styles.shell}>
        <section className={styles.story} id="story">
          <div>
            <div className={styles.sectionKicker}>The Birth of Fest</div>
            <h2>A New Era at LaCrosse</h2>
            <p>
              In 1970, the fairgrounds oval became LaCrosse Interstate Speedway and was paved for weekly
              stock-car racing. Robert Morris served as president with Larry Wehrs as his partner. That first
              season ended with Tom Reffner winning the inaugural Oktoberfest 200.
            </p>
            <p>
              Wehrs became sole promoter in 1972. Through 1986, Oktoberfest grew into a fall gathering where
              the region’s strongest late-model racers measured themselves against one another at season’s end.
              This room keeps the main floor focused on that story; the original race coverage and driver records
              are one click deeper.
            </p>
          </div>
          <figure>
            <img src={originImage} alt="Dick Trickle at LaCrosse Interstate Speedway in 1974" />
            <figcaption>Dick Trickle at LaCrosse Interstate Speedway, 1974 • Museum photo archive</figcaption>
          </figure>
        </section>

        <section className={styles.section} id="winners">
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionKicker}>The Larry Wehrs Years</div>
              <h2>Winners Wall • 1970–1986</h2>
            </div>
            <p>
              One champion, one year, one exhibit. Open a card only when you want the finishing-order snapshot,
              original race story, or winner profile.
            </p>
          </div>

          <div className={styles.winnerGrid}>
            {events.map((event) => {
              const year = yearOf(event.race_date)
              const first = event.SeriesEventResults.find((row) => row.finishing_position === 1)
              const winner = first?.driver_name || event.winner_name || 'Winner not listed'
              const topThree = event.SeriesEventResults
                .filter((row) => row.finishing_position && row.finishing_position <= 3)
                .slice(0, 3)

              return (
                <article className={styles.winnerCard} id={`year-${year}`} key={event.id}>
                  <WinnerVisual year={year} winner={winner} />
                  <div className={styles.winnerBody}>
                    <div className={styles.yearLine}>
                      <span>{year}</span>
                      <small>{prettyDate(event.race_date)}</small>
                    </div>
                    <h3>{winner}</h3>
                    <div className={styles.exhibit}>
                      <details>
                        <summary>Open exhibit</summary>
                        {topThree.length ? (
                          <div className={styles.podium}>
                            {topThree.map((row) => (
                              <div key={row.id}>
                                <span>{row.finishing_position}</span>
                                <strong>{row.driver_name}</strong>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className={styles.links}>
                          {raceStoryLinks[year] ? (
                            <Link href={withRoomReturn(raceStoryLinks[year], year)}>Full Race Result →</Link>
                          ) : null}
                          {first?.driver_slug ? (
                            <Link
                              className={styles.secondary}
                              href={withRoomReturn(`/drivers/${first.driver_slug}`, year)}
                            >
                              Winner Profile →
                            </Link>
                          ) : null}
                        </div>
                      </details>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className={styles.artifactSection} id="artifacts">
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionKicker}>Display Case</div>
              <h2>Four Pieces From the Archive</h2>
            </div>
            <p>A small curated shelf rather than a wall of scans. Each object opens into the museum archive.</p>
          </div>
          <div className={styles.artifactGrid}>
            {artifacts.map((artifact) => (
              <Link className={styles.artifactCard} href={artifact.href} key={artifact.href}>
                <img src={artifact.image} alt={artifact.title} />
                <div className={styles.artifactBody}>
                  <span>{artifact.eyebrow}</span>
                  <strong>{artifact.title}</strong>
                  <p>{artifact.note}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.legacy} id="legacy">
          <div>
            <div className={styles.sectionKicker}>The End of an Era</div>
            <h2>Rich Bickle Closes the Wehrs Years</h2>
            <p>
              Rich Bickle Jr. won the 1986 Oktoberfest, closing the seventeen-race promotional era preserved in
              this room. The event continued, but this is where the Larry Wehrs chapter ends.
            </p>
            <Link className={styles.backLink} href="/rooms">← Return to Museum Rooms</Link>
          </div>
          <div>
            <div
              className={styles.spritePhoto}
              role="img"
              aria-label="Rich Bickle Jr. in victory lane after the 1986 Oktoberfest"
              style={{
                backgroundImage: `url("${SPRITE}")`,
                backgroundPosition: '100% 100%',
              }}
            />
            <div className={styles.photoCaption}>Rich Bickle Jr. • 1986 Oktoberfest winner</div>
          </div>
        </section>
      </div>
    </main>
  )
}
