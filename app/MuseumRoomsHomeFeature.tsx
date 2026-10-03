import Link from 'next/link'
import RoomDoorLink from './rooms/RoomDoorLink'
import styles from './home.module.css'

const OKTOBERFEST_ROOM_IMAGE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/lacrosse-interstate-speedway/1981/lacrosse-interstate-speedway_1981_dick-trickle_stan-kalwasinski_photo_555.jpg'

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

        <RoomDoorLink
          href="/rooms/oktoberfest-larry-wehrs"
          className={styles.roomsHomeFeatured}
        >
          <img
            src={OKTOBERFEST_ROOM_IMAGE}
            alt="Historic racing at LaCrosse Interstate Speedway"
            className={styles.roomsHomeFeaturedImage}
          />
          <span className={styles.roomsHomeFeaturedShade} aria-hidden="true" />
          <span className={styles.roomsHomeNumber}>Room 001 • Now Showing</span>
          <span className={styles.roomsHomeFeaturedCopy}>
            <img
              src="/logos/series/oktoberfest-race-weekend.jpg"
              alt="Oktoberfest Race Weekend"
              className={styles.roomsHomeLogo}
            />
            <strong>The Larry Wehrs Years</strong>
            <small>1970–1986 • Seventeen falls that helped define Midwest short-track racing</small>
            <b>Enter the Room →</b>
          </span>
        </RoomDoorLink>

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
