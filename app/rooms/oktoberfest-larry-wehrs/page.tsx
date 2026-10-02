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
    publication: 'Midwest Racing News',
    date: 'October 7, 1971',
    note: 'Contemporary Oktoberfest coverage following Dick Trickle’s victory.',
    href: '/media/newspapers/midwest-racing-news/1971-10-07',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/front-cover.jpg',
  },
  {
    publication: 'Checkered Flag Racing News',
    date: 'October 4, 1972',
    note: 'A period preview of the Oktoberfest 200 and the close of Wisconsin’s late-model season.',
    href: '/media/newspapers/checkered-flag-racing-news/1972-10-04',
    image: MEDIA_BASE + 'newspapers/checkered-flag-racing-news/1972-10-04/005.jpg',
  },
  {
    publication: 'Checkered Flag Racing News',
    date: 'October 13, 1976',
    note: 'Oktoberfest coverage from the year Larry Detjens began his back-to-back run.',
    href: '/media/newspapers/checkered-flag-racing-news/1976-10-13',
    image: MEDIA_BASE + 'newspapers/checkered-flag-racing-news/1976-10-13/front-cover.jpg',
  },
  {
    publication: 'Midwest Racing News',
    date: 'October 16, 1986',
    note: 'Coverage from the final Oktoberfest season of the Larry Wehrs era.',
    href: '/media/newspapers/midwest-racing-news/1986-10-16',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1986-10-16/003.jpg',
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

function programYear(program: RaceProgram) {
  const raw = String(program.year || '')
  const match = raw.match(/\d{4}/)
  return match ? Number(match[0]) : null
}

function programMatchesRoom(program: RaceProgram) {
  const year = programYear(program)
  if (!year || year < 1970 || year > 1986) return false
  const haystack = [
    program.title,
    program.track,
    program.track_slug,
    program.series,
    program.series_slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes('lacrosse') || haystack.includes('oktoberfest')
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

  const roomPrograms = programs
    .filter(programMatchesRoom)
    .sort((a, b) => (programYear(a) || 9999) - (programYear(b) || 9999))
    .slice(0, 8)

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

        <section className={styles.section} id="year-by-year">
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
              <h2>MRN &amp; Checkered Flag Racing News</h2>
            </div>
            <p>Contemporary reporting lets the races tell their story in the language of the era.</p>
          </div>
          <div className={styles.newspaperGrid}>
            {newspaperArtifacts.map((artifact) => (
              <Link href={artifact.href} className={styles.newspaperCard} key={artifact.href}>
                <div className={styles.newspaperImageWrap}>
                  <img src={artifact.image} alt={artifact.publication + ' — ' + artifact.date} />
                </div>
                <div className={styles.newspaperBody}>
                  <span>{artifact.date}</span>
                  <strong>{artifact.publication}</strong>
                  <p>{artifact.note}</p>
                  <b>Open Issue →</b>
                </div>
              </Link>
            ))}
          </div>
          <div className={styles.centerLink}>
            <Link href="/media/newspapers">Search the Newspaper OCR Archive →</Link>
          </div>
        </section>

        <section className={styles.section} id="programs">
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.kicker}>Programs &amp; Yearbooks</div>
              <h2>Race Night Preserved on Paper</h2>
            </div>
            <p>Scanned publications from LaCrosse and the Oktoberfest era.</p>
          </div>

          {roomPrograms.length ? (
            <div className={styles.programGrid}>
              {roomPrograms.map((program) => (
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
                  <span>{program.year || 'Year unknown'}</span>
                  <strong>{program.title}</strong>
                  <small>{program.track || program.series || 'Museum printed archive'}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.archiveCallout}>
              LaCrosse programs and yearbooks are available through the museum printed archive.
            </div>
          )}
          <div className={styles.centerLink}>
            <Link href="/media/race-programs">Browse Programs &amp; Yearbooks →</Link>
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
