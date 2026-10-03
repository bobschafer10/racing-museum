import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getPublishedMuseumRoom,
  MUSEUM_MEDIA_BASE,
  type MuseumRoomMediaRecord,
} from '@/lib/museum-rooms'
import MuseumRoomTemplate, {
  type RoomArtifact,
  type RoomYear,
} from './MuseumRoomTemplate'

export const revalidate = 300

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

type StoryConfig = {
  kicker?: string
  title?: string
  body?: string[]
}

type LegacyConfig = {
  kicker?: string
  title?: string
  body?: string
}

type ArtifactConfig = {
  eyebrow?: string
  title?: string
  note?: string
  href?: string
  image?: string
}

type RoomConfig = {
  series_id?: number
  year_start?: number
  year_end?: number
  lede?: string
  logo?: string
  year_title?: string
  year_intro?: string
  story?: StoryConfig
  legacy?: LegacyConfig
  race_story_links?: Record<string, string>
  validated_fallback_images?: Record<string, string>
  featured_artifacts?: ArtifactConfig[]
}

function prettyDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function mediaBySlot(media: MuseumRoomMediaRecord[], slot: string) {
  return media.find((item) => item.slot_key === slot && item.approved)
}

function buildArtifact(config: ArtifactConfig): RoomArtifact | null {
  if (!config.title || !config.href || !config.image) return null
  const image = config.image.startsWith('http') || config.image.startsWith('/')
    ? config.image
    : MUSEUM_MEDIA_BASE + config.image
  return {
    eyebrow: config.eyebrow || 'Museum artifact',
    title: config.title,
    note: config.note || '',
    href: config.href,
    image,
  }
}

export default async function PublishedMuseumRoom({
  slug,
  roomPath,
}: {
  slug: string
  roomPath: string
}) {
  const published = await getPublishedMuseumRoom(slug)
  if (!published) redirect('/rooms')

  const { room, media } = published
  const config = (room.config || {}) as RoomConfig
  const start = Number(config.year_start || 0)
  const end = Number(config.year_end || 0)
  const seriesId = Number(config.series_id || 0)

  let events: EventRow[] = []
  if (seriesId && start && end) {
    const { data } = await supabase
      .from('SeriesEvents')
      .select('id,race_date,winner_name,SeriesEventResults(id,finishing_position,car_number,driver_name,driver_slug)')
      .eq('series_id', seriesId)
      .gte('race_date', `${start}-01-01`)
      .lte('race_date', `${end}-12-31`)
      .order('race_date', { ascending: true })

    events = ((data || []) as EventRow[]).map((event) => ({
      ...event,
      SeriesEventResults: [...(event.SeriesEventResults || [])].sort(
        (a, b) => (a.finishing_position || 999) - (b.finishing_position || 999),
      ),
    }))
  }

  const eventByYear = new Map(events.map((event) => [Number(event.race_date.slice(0, 4)), event]))
  const mediaYears = media.filter((item) => item.role === 'winner' && item.year).map((item) => Number(item.year))
  const timelineYears = start && end
    ? Array.from({ length: end - start + 1 }, (_, index) => start + index)
    : Array.from(new Set(mediaYears)).sort((a, b) => a - b)

  const years: RoomYear[] = timelineYears.map((year) => {
    const event = eventByYear.get(year)
    const firstPlace = event?.SeriesEventResults.find((row) => row.finishing_position === 1)
    const winnerMedia = mediaBySlot(media, `winner-${year}`)
    const fallbackImage = config.validated_fallback_images?.[String(year)] || null
    const winner = winnerMedia?.subject || event?.winner_name || firstPlace?.driver_name || `Winner ${year}`
    return {
      id: event?.id || `year-${year}`,
      year,
      winner,
      dateLabel: event ? prettyDate(event.race_date) : undefined,
      image: winnerMedia?.public_url || fallbackImage,
      imageAlt: winnerMedia?.alt_text || `${winner}, ${year}`,
      imageCredit: winnerMedia?.credit || null,
      cropPosition: winnerMedia?.crop_position || 'center center',
      preservedCount: event?.SeriesEventResults.length,
      topThree: event?.SeriesEventResults
        .filter((row) => row.finishing_position && row.finishing_position <= 3)
        .map((row) => ({
          position: row.finishing_position,
          driver: row.driver_name,
          carNumber: row.car_number,
        })),
      raceStoryHref: config.race_story_links?.[String(year)] || null,
      winnerProfileHref: firstPlace?.driver_slug ? `/drivers/${firstPlace.driver_slug}` : null,
    }
  })

  const hero = mediaBySlot(media, 'hero')
  const watermark = mediaBySlot(media, 'watermark')
  const storyImage = mediaBySlot(media, 'story')
  const champions = new Set(years.map((entry) => entry.winner).filter(Boolean))
  const resultRows = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)
  const story = config.story || {}
  const legacy = config.legacy || {}

  const managedArtifacts: RoomArtifact[] = media
    .filter((item) => item.role === 'artifact' && item.link_href)
    .map((item) => ({
      eyebrow: item.year ? String(item.year) : 'Museum artifact',
      title: item.subject || 'Museum artifact',
      note: item.note || '',
      href: item.link_href || '#',
      image: item.public_url,
    }))

  const configuredArtifacts = (config.featured_artifacts || [])
    .map(buildArtifact)
    .filter((item): item is RoomArtifact => Boolean(item))

  return (
    <MuseumRoomTemplate
      roomNumber={room.room_number}
      roomPath={roomPath}
      title={room.title}
      titlePrefix={room.subtitle}
      yearsLabel={room.years_label}
      lede={config.lede || room.subtitle || 'A curated exhibit from the Upper Midwest Auto Racing Museum.'}
      logo={config.logo || null}
      heroImage={hero?.public_url || null}
      watermarkImage={watermark?.public_url || null}
      stats={[
        { value: String(years.length), label: 'Years in this Room' },
        { value: String(champions.size), label: 'Different winners' },
        { value: resultRows.toLocaleString('en-US'), label: 'Preserved result rows' },
        { value: room.years_label || 'Archive', label: 'Period preserved' },
      ]}
      story={{
        kicker: story.kicker || 'The Story',
        title: story.title || room.title,
        body: story.body?.length ? story.body : [config.lede || room.subtitle || 'Museum research and primary sources preserve this story.'],
        image: storyImage?.public_url || null,
        imageAlt: storyImage?.alt_text || story.title || room.title,
        imageCredit: storyImage?.credit || null,
      }}
      yearTitle={config.year_title || 'Year by Year'}
      yearIntro={config.year_intro || 'Open a year for the preserved finish, race story and winner profile.'}
      years={years}
      artifacts={(managedArtifacts.length ? managedArtifacts : configuredArtifacts).slice(0, 4)}
      legacy={{
        kicker: legacy.kicker || 'Legacy',
        title: legacy.title || `${room.title} remembered`,
        body: legacy.body || 'This Room remains part of the museum as the collection continues to grow.',
      }}
    />
  )
}
