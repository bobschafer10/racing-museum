import { supabase } from '@/lib/supabase'
import MuseumRoomV2, {
  type MuseumRoomArtifact,
  type MuseumRoomYear,
} from '../_components/MuseumRoomV2'

export const revalidate = 300

const SERIES_ID = 114
const ROOM_PATH = '/rooms/oktoberfest-larry-wehrs-v2'
const MEDIA_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szvkleurojiwqkkztxtr.supabase.co') +
  '/storage/v1/object/public/media/'

const PAST_WINNERS_1978 =
  MEDIA_BASE +
  'programs/1978-lacrosse-interstate-speedway-wi-yearbook/1978%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_004.jpg'

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

type WinnerImage = {
  src: string
  alt: string
  credit: string
  crop?: { size: string; position: string }
}

const winnerImages: Record<number, WinnerImage> = {
  1970: {
    src: '/rooms/oktoberfest/1970-tom-reffner.svg',
    alt: 'Tom Reffner in the 1970 Oktoberfest-winning car at LaCrosse Interstate Speedway',
    credit: 'Tom Reffner • 1970 Oktoberfest winner',
  },
  1971: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/001.jpg',
    alt: 'Dick Trickle in the winner circle after the 1971 Oktoberfest 200',
    credit: 'Dick Trickle • 1971 winner circle • Midwest Racing News / Gary Schmidt',
    crop: { size: '255% auto', position: '7% 65%' },
  },
  1972: {
    src: PAST_WINNERS_1978,
    alt: 'Joe Shear in the Oktoberfest past-winners display',
    credit: 'Joe Shear • 1972 winner • 1978 Oktoberfest program archive',
    crop: { size: '400% auto', position: '31% 30%' },
  },
  1973: {
    src: PAST_WINNERS_1978,
    alt: 'Marv Marzofka in the Oktoberfest past-winners display',
    credit: 'Marv Marzofka • 1973 winner • 1978 Oktoberfest program archive',
    crop: { size: '400% auto', position: '0% 79%' },
  },
  1974: {
    src: PAST_WINNERS_1978,
    alt: 'Jerry Makara in the Oktoberfest past-winners display',
    credit: 'Jerry “The Bear” Makara • 1974 winner • 1978 Oktoberfest program archive',
    crop: { size: '400% auto', position: '14% 76%' },
  },
  1975: {
    src: PAST_WINNERS_1978,
    alt: 'Tom Reffner in the Oktoberfest past-winners display',
    credit: 'Tom Reffner • 1975 winner • 1978 Oktoberfest program archive',
    crop: { size: '400% auto', position: '18% 31%' },
  },
  1976: {
    src: PAST_WINNERS_1978,
    alt: 'Larry Detjens in the Oktoberfest past-winners display',
    credit: 'Larry Detjens • 1976 winner • 1978 Oktoberfest program archive',
    crop: { size: '400% auto', position: '29% 80%' },
  },
  1977: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1977-10-06/003.jpg',
    alt: 'Larry Detjens with promoter Larry Wehrs after the 1977 Oktoberfest victory',
    credit: 'Larry Detjens with Larry Wehrs • Midwest Racing News / Wayne Mioskowski',
    crop: { size: '255% auto', position: '7% 14%' },
  },
  1978: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1978-10-05/002.jpg',
    alt: 'Dave Watson after winning the 1978 Oktoberfest',
    credit: 'Dave Watson • Midwest Racing News / Wayne Mioskowski',
    crop: { size: '255% auto', position: '7% 13%' },
  },
  1979: {
    src: MEDIA_BASE + 'newspapers/checkered-flag-racing-news/1979-10-10/001.jpg',
    alt: 'Butch Miller with promoter Larry Wehrs as the 1979 Oktoberfest overall winner',
    credit: 'Butch Miller with Larry Wehrs • Checkered Flag Racing News / John Quinn',
    crop: { size: '260% auto', position: '12% 39%' },
  },
  1980: {
    src: '/rooms/oktoberfest/1980-mark-martin.svg',
    alt: 'Mark Martin with the 1980 Oktoberfest winner sign',
    credit: 'Mark Martin • 1980 Oktoberfest winner',
  },
  1981: {
    src: '/rooms/oktoberfest/1981-junior-hanley.svg',
    alt: 'Junior Hanley in victory lane after winning the 1981 Oktoberfest',
    credit: 'Junior Hanley • 1981 Oktoberfest winner',
  },
  1982: {
    src: MEDIA_BASE + 'newspapers/midwest-racing-news/1982-10-07/1.jpg',
    alt: 'Jim Back with promoter Larry Wehrs after winning the 1982 Oktoberfest',
    credit: 'Jim Back with Larry Wehrs • Midwest Racing News / Lee Foster',
    crop: { size: '245% auto', position: '8% 82%' },
  },
  1984: {
    src: '/rooms/oktoberfest/1984-bryan-reffner.svg',
    alt: 'Bryan Reffner with his car and winner sign after the 1984 Oktoberfest',
    credit: 'Bryan Reffner • 1984 Oktoberfest winner',
  },
  1986: {
    src: '/rooms/oktoberfest/1986-rich-bickle-jr.jpg',
    alt: 'Rich Bickle Jr. in victory lane with the Oktoberfest trophy and checkered flag in 1986',
    credit: 'Rich Bickle Jr. • 1986 Oktoberfest winner',
  },
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

const artifacts: MuseumRoomArtifact[] = [
  {
    eyebrow: '1971 • Midwest Racing News',
    title: 'Trickle Best at Oktoberfest',
    note: 'The MRN front page put Dick Trickle in victory lane after the second Oktoberfest 200.',
    href: '/media/newspapers/midwest-racing-news/1971-10-07?sourcePage=1&q=Oktoberfest',
    image: MEDIA_BASE + 'newspapers/midwest-racing-news/1971-10-07/001.jpg',
  },
  {
    eyebrow: '1978 • Original Program',
    title: 'Larry & Bernadine Welcome the Fans',
    note: 'The opening program message preserves the Wehrs voice and the atmosphere of the event at the height of the era.',
    href: '/media/race-programs/1978-lacrosse-interstate-speedway-wi-yearbook',
    image: MEDIA_BASE + 'programs/1978-lacrosse-interstate-speedway-wi-yearbook/1978%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_001.jpg',
  },
  {
    eyebrow: '1981 • Original Program',
    title: 'Martin and Shear Split the Hundreds',
    note: 'The 1981 book retells the rain-delayed 1980 race and the qualifying tiebreaker that made Mark Martin the overall champion.',
    href: '/media/race-programs/1981-lacrosse-interstate-speedway-wi-yearbook',
    image: MEDIA_BASE + 'programs/1981-lacrosse-interstate-speedway-wi-yearbook/1981%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_006.jpg',
  },
  {
    eyebrow: '1985 • Original Program',
    title: 'The All-Time Oktoberfest Money List',
    note: 'The 1985 publication records the top 50 late-model money winners through 1984, led by Joe Shear and Tom Reffner.',
    href: '/media/race-programs/1985-lacrosse-interstate-speedway-wi-yearbook',
    image: MEDIA_BASE + 'programs/1985-lacrosse-interstate-speedway-wi-yearbook/1985%20-%20LACROSSE%20OKTOBERFEST%20PROGRAM_013.jpg',
  },
]

export default async function OktoberfestLarryWehrsRoomV2() {
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

  const roomYears: MuseumRoomYear[] = events.map((event) => {
    const year = yearOf(event.race_date)
    const firstPlace = event.SeriesEventResults.find((row) => row.finishing_position === 1)
    const winner = event.winner_name || firstPlace?.driver_name || 'Winner not listed'
    const image = winnerImages[year]
    return {
      id: event.id,
      year,
      dateLabel: prettyDate(event.race_date),
      winner,
      image: image?.src || null,
      imageAlt: image?.alt,
      imageCrop: image?.crop,
      imageCredit: image?.credit,
      preservedCount: event.SeriesEventResults.length,
      topThree: event.SeriesEventResults
        .filter((row) => row.finishing_position && row.finishing_position <= 3)
        .map((row) => ({
          position: row.finishing_position,
          driver: row.driver_name,
          carNumber: row.car_number,
        })),
      raceStoryHref: raceStoryLinks[year] || null,
      winnerProfileHref: firstPlace?.driver_slug ? `/drivers/${firstPlace.driver_slug}` : null,
    }
  })

  const resultRows = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)
  const champions = new Set(roomYears.map((entry) => entry.winner))

  const heroImage =
    MEDIA_BASE +
    'photos/master/lacrosse-interstate-speedway/1981/lacrosse-interstate-speedway_1981_dick-trickle_stan-kalwasinski_photo_555.jpg'
  const originImage =
    MEDIA_BASE +
    'photos/master/lacrosse-interstate-speedway/1974/lacrosse-interstate-speedway_1974_dick-trickle_unknown-photographer_photo_001.jpg'

  return (
    <MuseumRoomV2
      roomNumber="001"
      roomPath={ROOM_PATH}
      title="The Larry Wehrs Years"
      titlePrefix="Oktoberfest Race Weekend"
      yearsLabel="1970–1986"
      lede="Seventeen autumn weekends that established LaCrosse’s Oktoberfest as one of the defining late-model gatherings in the Upper Midwest."
      heroImage={heroImage}
      logo="/logos/series/oktoberfest-race-weekend.jpg"
      stats={[
        { value: String(roomYears.length || 17), label: 'Wehrs-era editions' },
        { value: String(champions.size || 14), label: 'Different champions' },
        { value: resultRows.toLocaleString('en-US'), label: 'Preserved result rows' },
        { value: '1970–86', label: 'Era preserved' },
      ]}
      origin={{
        kicker: 'The Birth of Fest',
        title: 'A New Era at LaCrosse',
        body: [
          'In 1970, the fairgrounds oval became LaCrosse Interstate Speedway and was paved for weekly stock-car racing. Robert Morris served as president with Larry Wehrs as his partner. That first season ended with Tom Reffner winning the inaugural Oktoberfest 200.',
          'Wehrs became sole promoter in 1972. The official Oktoberfest history identifies every race from 1970 through 1986 as part of the Larry Wehrs promotional era, with the Super Late Model rules following the popular Central Wisconsin Racing Association formula.',
        ],
        image: originImage,
        imageAlt: 'Dick Trickle at LaCrosse Interstate Speedway in 1974',
        imageCredit: 'Dick Trickle at LaCrosse Interstate Speedway, 1974 • Museum photo archive',
        links: [
          { label: 'Official Oktoberfest History', href: 'https://oktoberfestraceweekend.com/history/' },
          { label: 'LaCrosse Speedway History', href: 'https://lacrossespeedway.com/history-records/' },
        ],
      }}
      yearEyebrow="The Larry Wehrs Years"
      yearTitle="Winners Wall • 1970–1986"
      yearIntro="The room now works like an exhibit wall: year, winner, image. Open any year for the preserved finish, the contemporary MRN/CFRN race story, and the winner profile."
      years={roomYears}
      artifacts={artifacts}
      artifactIntro="Four representative pieces are displayed here. The full newspaper and program collections remain one level deeper in the archive instead of filling the room wall."
      archiveLinks={[
        { label: 'Search Oktoberfest Newspaper OCR', href: '/media/newspapers?q=Oktoberfest' },
        { label: 'Browse Race Programs', href: '/media/race-programs?search=LaCrosse' },
        { label: 'Explore LaCrosse Speedway', href: '/tracks/lacrosse-fairgrounds-wi' },
      ]}
      legacy={{
        kicker: '1986 • The End of an Era',
        title: 'Rich Bickle Closes the Wehrs Years',
        body: 'Rich Bickle Jr. won the 1986 Oktoberfest, the seventeenth and final edition promoted during the Larry Wehrs era. Beginning in 1987, the event moved into its next chapter while the October tradition continued at LaCrosse.',
        links: [
          { label: 'Explore LaCrosse Speedway', href: '/tracks/lacrosse-fairgrounds-wi' },
          { label: 'Return to Special Events', href: '/events' },
        ],
      }}
    />
  )
}
