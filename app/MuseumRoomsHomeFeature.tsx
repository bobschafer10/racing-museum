import Link from 'next/link'
import RoomDoorLink from './rooms/RoomDoorLink'
import { getPublishedMuseumRoom, listPublishedMuseumRooms } from '@/lib/museum-rooms'
import styles from './home.module.css'

export const revalidate = 300

export default async function MuseumRoomsHomeFeature() {
  const rooms = await listPublishedMuseumRooms()
  const featuredRecord = rooms[0]
  if (!featuredRecord) return null

  const featured = await getPublishedMuseumRoom(featuredRecord.slug)
  if (!featured) return null

  const { room, media } = featured
  const config = room.config as { logo?: string; lede?: string }
  const image = media.find((item) => item.slot_key === 'hero') ||
    media.find((item) => item.slot_key === 'watermark') ||
    media.find((item) => item.role === 'winner')

  return (
    <section className={styles.roomsHome} aria-labelledby="museum-rooms-home-title">
      <div className={styles.roomsHomeInner}>
        <div className={styles.roomsHomeIntro}>
          <div className={styles.roomsHomeEyebrow}>Curated Exhibits</div>
          <h2 id="museum-rooms-home-title">Museum Rooms</h2>
          <p>Step inside focused exhibits that tell the stories of the people, tracks, races, and eras that shaped Upper Midwest auto racing.</p>
          <Link href="/rooms" className={styles.roomsHomeAll}>Explore All Rooms →</Link>
        </div>

        <RoomDoorLink href={`/rooms/${room.slug}`} className={styles.roomsHomeFeatured}>
          {image ? (
            <img
              src={image.public_url}
              alt={image.alt_text || room.title}
              className={styles.roomsHomeFeaturedImage}
              style={{ objectPosition: image.crop_position || 'center center' }}
            />
          ) : null}
          <span className={styles.roomsHomeFeaturedShade} aria-hidden="true" />
          <span className={styles.roomsHomeNumber}>Room {room.room_number} • Now Showing</span>
          <span className={styles.roomsHomeFeaturedCopy}>
            {config.logo ? <img src={config.logo} alt="" className={styles.roomsHomeLogo} /> : null}
            <strong>{room.title}</strong>
            <small>{room.years_label || room.subtitle || config.lede || 'Curated Museum Room'}</small>
            <b>Enter the Room →</b>
          </span>
        </RoomDoorLink>
      </div>
    </section>
  )
}
