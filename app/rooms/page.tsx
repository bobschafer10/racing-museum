import RoomDoorLink from './RoomDoorLink'
import { getPublishedMuseumRoom, listPublishedMuseumRooms } from '@/lib/museum-rooms'
import styles from './rooms.module.css'

export const revalidate = 300

export default async function MuseumRoomsPage() {
  const rooms = await listPublishedMuseumRooms()
  const published = (await Promise.all(rooms.map((room) => getPublishedMuseumRoom(room.slug))))
    .filter((room): room is NonNullable<typeof room> => Boolean(room))

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
          {published.map(({ room, media }) => {
            const image = media.find((item) => item.slot_key === 'hero') ||
              media.find((item) => item.slot_key === 'watermark') ||
              media.find((item) => item.role === 'winner')
            const config = room.config as { logo?: string; lede?: string }
            return (
              <RoomDoorLink href={`/rooms/${room.slug}`} className={styles.roomCard} key={room.id}>
                {image ? (
                  <img
                    src={image.public_url}
                    alt={image.alt_text || room.title}
                    className={styles.roomCardImage}
                    style={{ objectPosition: image.crop_position || 'center center' }}
                  />
                ) : null}
                <span className={styles.roomCardShade} aria-hidden="true" />
                <span className={styles.roomCardCopy}>
                  <span className={styles.roomNumber}>Room {room.room_number} • Now Showing</span>
                  {config.logo ? <img src={config.logo} alt="" className={styles.roomLogo} /> : null}
                  <h2>{room.title}</h2>
                  <p>{room.subtitle || room.years_label || config.lede || 'Curated Museum Room'}</p>
                  <span className={styles.roomCta}>Enter the Room →</span>
                </span>
              </RoomDoorLink>
            )
          })}

          {!published.some(({ room }) => room.room_number === '001') ? (
            <article className={styles.roomComingSoon}>
              <span className={styles.roomNumber}>Room 001 • In Development</span>
              <h2>Oktoberfest Race Weekend</h2>
              <p>The Larry Wehrs Years exhibit is being rebuilt before it returns to the museum floor.</p>
              <span className={styles.roomCta}>Temporarily Closed</span>
            </article>
          ) : null}

          {!published.some(({ room }) => room.room_number === '002') ? (
            <article className={styles.roomComingSoon}>
              <span className={styles.roomNumber}>Room 002 • In Development</span>
              <h2>The Numbers of Dick Trickle</h2>
              <p>A visual history of the numbers, cars, owners, tracks, and victories associated with one of the Upper Midwest’s most recognizable racers.</p>
              <span className={styles.roomCta}>Coming Soon</span>
            </article>
          ) : null}
        </div>

        <div className={styles.roomsNote}>
          Museum Rooms open only after their exhibit material and presentation have been fully reviewed.
        </div>
      </div>
    </main>
  )
}
