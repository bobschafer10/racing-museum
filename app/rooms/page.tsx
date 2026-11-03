import Link from 'next/link'
import { getPhotoUrl } from '@/lib/photos'
import styles from './rooms.module.css'

const bergeronHero = getPhotoUrl('photos/master/leos-speedway/1967/leos-speedway_1967_harlin-krueger_bob-bergeron_photo_001.jpg')
const vercauterenHero = getPhotoUrl('photos/master/brown-county-speedway/1972/brown-county-speedway_1972_bob-bennett_pete-vercauteren_photo_001.jpg')

export default function MuseumRoomsPage() {
  return (
    <main className={styles.roomsPage}>
      <section className={styles.roomsHero}>
        <div className={styles.roomsHeroInner}>
          <div className={styles.eyebrow}>Curated Exhibits</div>
          <h1>Museum Rooms</h1>
          <p>
            Focused exhibits combining results, photography, newspapers, programs,
            and eyewitness accounts to preserve the people and stories of Upper Midwest racing.
          </p>
        </div>
      </section>

      <div className={styles.roomsShell}>
        <div className={styles.roomsGrid}>
          <Link href="/rooms/media-member-of-the-month/vercauteren-brothers" className={styles.roomCard}>
            <img src={vercauterenHero} alt="A 1972 Brown County Speedway racing photograph credited to Pete Vercauteren" className={styles.roomCardImage} />
            <div className={styles.roomCardShade} />
            <div className={styles.roomCardCopy}>
              <span className={styles.roomNumber}>Media Room 002 • Research Exhibit</span>
              <h2>The Vercauteren Brothers</h2>
              <p>
                Gary and Pete Vercauteren: the De Pere roots, the Midwest Racing News
                bylines, the photographs, Wisconsin International Raceway, and the
                founding of Mid-American.
              </p>
              <span className={styles.roomCta}>Explore Room 002 →</span>
            </div>
          </Link>

          <Link href="/rooms/media-member-of-the-month/bob-bergeron" className={styles.roomCard}>
            <img src={bergeronHero} alt="Bob Bergeron racing photograph from the museum collection" className={styles.roomCardImage} />
            <div className={styles.roomCardShade} />
            <div className={styles.roomCardCopy}>
              <span className={styles.roomNumber}>Media Room 001 • October</span>
              <h2>Bob Bergeron</h2>
              <p>
                Revisit the inaugural Media Member of the Month: photography,
                regional newspaper work, track connections, and the
                unidentified-driver research project.
              </p>
              <span className={styles.roomCta}>Revisit Room 001 →</span>
            </div>
          </Link>
        </div>

        <div className={styles.roomsNote}>
          Museum Rooms remain permanently available as new media exhibits rotate into view.
          Future exhibits, including <strong>The Numbers of Dick Trickle</strong>, remain in development
          and have not yet been assigned a media-room number.
        </div>
      </div>
    </main>
  )
}
