import Link from 'next/link'
import styles from './home.module.css'

export default function MuseumRoomsHomeFeature() {
  return (
    <section className={styles.roomsHome} aria-labelledby="museum-rooms-home-title">
      <div className={styles.roomsHomeInner}>
        <div className={styles.roomsHomeIntro}>
          <div className={styles.roomsHomeEyebrow}>Curated Exhibits</div>
          <h2 id="museum-rooms-home-title">Museum Rooms</h2>
          <p>
            Step inside focused exhibits that tell the stories of the people, tracks,
            races, and eras that shaped Upper Midwest auto racing.
          </p>
          <Link href="/rooms" className={styles.roomsHomeAll}>
            Explore All Rooms →
          </Link>
        </div>

        <div className={styles.roomsHomeNext} aria-label="Museum Room 002 coming soon">
          <span className={styles.roomsHomeNumber}>Room 002 • In Development</span>
          <div className={styles.roomsHomeNextCopy}>
            <strong>The Numbers of Dick Trickle</strong>
            <small>Cars, numbers, owners, victories, and the stories behind them.</small>
            <em>Coming Soon</em>
          </div>
        </div>
      </div>
    </section>
  )
}
