import Link from 'next/link'
import { getPhotoUrl } from '@/lib/photos'
import styles from './rooms.module.css'

const bergeronHero = getPhotoUrl('photos/master/leos-speedway/1967/leos-speedway_1967_harlin-krueger_bob-bergeron_photo_001.jpg')

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
          <Link href="/rooms/media-member-of-the-month/bob-bergeron" className={styles.roomCard}>
            <img src={bergeronHero} alt="Bob Bergeron racing photograph from the museum collection" className={styles.roomCardImage} />
            <div className={styles.roomCardShade} />
            <div className={styles.roomCardCopy}>
              <span className={styles.roomNumber}>Room 001 • Media Member of the Month</span>
              <h2>Bob Bergeron</h2>
              <p>
                The inaugural Media Member of the Month: a curated room devoted to Bergeron&apos;s photographs,
                track connections, newspaper bylines, photo credits, and the Fox Valley racing-media story.
              </p>
              <span className={styles.roomCta}>Enter Room →</span>
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
