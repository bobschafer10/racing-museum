import Link from 'next/link'
import styles from './rooms.module.css'

const OKTOBERFEST_IMAGE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/lacrosse-interstate-speedway/1981/lacrosse-interstate-speedway_1981_dick-trickle_stan-kalwasinski_photo_555.jpg'

export default function MuseumRoomsPage() {
  return (
    <main className={styles.roomsPage}>
      <section className={styles.roomsHero}>
        <div className={styles.roomsHeroInner}>
          <div className={styles.eyebrow}>Curated Exhibits</div>
          <h1>Museum Rooms</h1>
          <p>
            Focused exhibits that combine race results, photographs, newspapers, programs,
            yearbooks, and museum research to tell the deeper stories behind Upper Midwest racing.
          </p>
        </div>
      </section>

      <div className={styles.roomsShell}>
        <div className={styles.roomsGrid}>
          <Link className={styles.roomCard} href="/rooms/oktoberfest-larry-wehrs">
            <img
              className={styles.roomCardImage}
              src={OKTOBERFEST_IMAGE}
              alt="Historic racing at LaCrosse Interstate Speedway"
            />
            <span className={styles.roomCardShade} aria-hidden="true" />
            <div className={styles.roomCardCopy}>
              <span className={styles.roomNumber}>Room 001 • Now Showing</span>
              <img
                className={styles.roomLogo}
                src="/logos/series/oktoberfest-race-weekend.jpg"
                alt="Oktoberfest Race Weekend"
              />
              <h2>The Larry Wehrs Years</h2>
              <p>1970–1986 • Seventeen falls that helped define Midwest short-track racing.</p>
              <span className={styles.roomCta}>Enter the Room →</span>
            </div>
          </Link>

          <article className={styles.roomComingSoon}>
            <span className={styles.roomNumber}>Room 002 • In Development</span>
            <h2>The Numbers of Dick Trickle</h2>
            <p>
              A visual history of the numbers, cars, owners, tracks, and victories associated
              with one of the Upper Midwest’s most recognizable racers.
            </p>
            <span className={styles.roomCta}>Coming Soon</span>
          </article>
        </div>

        <div className={styles.roomsNote}>
          Museum Rooms are curated exhibits. The detailed archive remains one level deeper whenever you want it.
        </div>
      </div>
    </main>
  )
}
