import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

const HIBBING_TRACK_ID = 80
const LATE_MODEL_CLASS_ID = 46
const WISSOTA_LATE_MODEL_SERIES_IDS = [48, 178]

type LegacyEvent = {
  id: number
  race_date: string | null
  year: number | null
  race_status: string | null
}

type LegacyResult = {
  id: number
  race_id: number
  driver_id: number
  finishing_position: number | null
}

type DriverRow = {
  driver_id: number
  driver_name: string
  slug: string | null
}

type SeriesResult = {
  id: number
  finishing_position: number | null
  starting_position: string | null
  car_number: string | null
  driver_name: string
  driver_slug: string | null
}

type SeriesEvent = {
  id: number
  series_id: number
  race_date: string | null
  track_name: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: SeriesResult[]
}

type ArchiveResult = {
  position: number
  startingPosition: string | null
  driverName: string
  driverSlug: string | null
  carNumber: string | null
}

type ArchiveRace = {
  key: string
  year: number
  raceDate: string
  winner: string
  sourceLabel: string
  sourceUrl: string | null
  results: ArchiveResult[]
  dnqNames: string[]
  sourceType: 'series' | 'museum'
}

const researchTrail = [
  {
    era: '1979',
    title: 'Earliest Labor Day-weekend result recovered',
    detail: 'Checkered Flag Racing News reported Leon Plank edging Tom Nesbitt by a bumper in the 40-lap Hibbing special, with Phil Prusak third. Rain pushed the weekend program through Monday.',
    url: null,
  },
  {
    era: '1981–1984',
    title: 'Labor Day Invitational era',
    detail: 'Midwest Racing News advertising repeatedly used the Labor Day Invitational name for Hibbing’s Late Models, Super Stocks and Six Cylinders. The museum OCR archive preserves those ads and race reports.',
    url: null,
  },
  {
    era: 'By 1985',
    title: 'The Shootout name appears',
    detail: 'The MRN archive begins using Labor Day Shootout, marking the naming transition into the identity the event still carries today.',
    url: null,
  },
  {
    era: '1989',
    title: 'Tom Nesbitt wins the Late Model feature',
    detail: 'MRN preserved a top ten: Tom Nesbitt, Steve Fegers, Paul Gilberts, John Kaanta, an unidentified fifth-place finisher, Dick Christman, Terry Lanphear, Tom Waseleski, Johnny Johnson and Tom Smart.',
    url: null,
  },
  {
    era: '1992 & 1994',
    title: 'Rick Aukland victories',
    detail: 'National Dirt Late Model Hall of Fame career statistics credit Rick Aukland with Hibbing Labor Day Shoot-Out victories in 1987, 1992 and 1994.',
    url: 'https://ndlmhof.wordpress.com/inductee-career-statistics/',
  },
  {
    era: '1996',
    title: 'Dirt Race Central video archive',
    detail: 'The surviving DRC broadcast identifies the 17th Annual Labor Day Shootout Late Model feature and shows Mitch Johnson defeating Rick Egersdorf.',
    url: 'https://speedsport.tv/videos/31277',
  },
  {
    era: '1998',
    title: 'Dirt Race Central preserves Night 2',
    detail: 'DRC’s archive identifies the 19th Annual Labor Day Shootout and records Ryan Aho sweeping the weekend’s WISSOTA Super Stock action.',
    url: 'https://drc.tv/videos/4400',
  },
  {
    era: '2025–2026',
    title: '47th and 48th published runnings',
    detail: 'Hibbing Speedway promoted the 2025 weekend as the 47th annual Shootout in honor of Bill Engelstad. The 2026 Labor Day weekend was promoted as the 48th running.',
    url: 'https://hibbingspeedway.com/news/47th-annual-labor-day-shootout-to-honor-bill-engelstad-s-legacy-at-hibbing-speedway',
  },
]

type WinnerHistoryRow = {
  year: number
  outcomes: string[]
}

type WinnerDivision = {
  name: string
  years: string
  rows: WinnerHistoryRow[]
}

const winnerDivisions: WinnerDivision[] = [
  {
    name: 'Late Models',
    years: '1979–2026',
    rows: [
      { year: 1979, outcomes: ['Leon Plank'] },
      { year: 1980, outcomes: ['Pete Parker'] },
      { year: 1981, outcomes: ['Jeff Hinkemeyer'] },
      { year: 1982, outcomes: ['Tom Nesbitt'] },
      { year: 1983, outcomes: ['Red Steffen'] },
      { year: 1984, outcomes: ['Bob Gherardi'] },
      { year: 1985, outcomes: ['Steve Laursen', 'Mitch Johnson'] },
      { year: 1986, outcomes: ['Rick Egersdorf'] },
      { year: 1987, outcomes: ['Steve Laursen', 'Rick Aukland'] },
      { year: 1988, outcomes: ['Tom Nesbitt', 'Tom Nesbitt'] },
      { year: 1989, outcomes: ['Tom Nesbitt'] },
      { year: 1990, outcomes: ['Brent Laursen', 'Harry Hanson'] },
      { year: 1991, outcomes: ['Rick Egersdorf', 'Steve Egersdorf'] },
      { year: 1992, outcomes: ['Rick Aukland', 'Rick Aukland'] },
      { year: 1993, outcomes: ['Mike Chamernick', 'Rick Egersdorf'] },
      { year: 1994, outcomes: ['Rick Aukland'] },
      { year: 1995, outcomes: ['Joel Cryderman', 'Rick Egersdorf'] },
      { year: 1996, outcomes: ['Jimmy Mars', 'Mitch Johnson'] },
      { year: 1997, outcomes: ['Pat Doar', 'Steve Egersdorf'] },
      { year: 1998, outcomes: ['Steve Laursen', 'Rick Egersdorf'] },
      { year: 1999, outcomes: ['Steve Laursen', 'Steve Laursen'] },
      { year: 2000, outcomes: ['Pete Wohlers', 'Hank Berry'] },
      { year: 2001, outcomes: ['Brady Smith', 'Mitch Johnson'] },
      { year: 2002, outcomes: ['Darrell Nelson', 'Rick Egersdorf'] },
      { year: 2003, outcomes: ['Harry Hanson', 'Brian Strand'] },
      { year: 2004, outcomes: ['Darrell Nelson'] },
      { year: 2005, outcomes: ['Joel Cryderman', 'Pat Doar'] },
      { year: 2006, outcomes: ['Mitch Johnson', 'John Kaanta'] },
      { year: 2007, outcomes: ['Steve Vesel', 'Harry Hanson'] },
      { year: 2008, outcomes: ['Pat Doar', 'Steve Laursen'] },
      { year: 2009, outcomes: ['Gregg Hill', 'Jake Redetzke'] },
      { year: 2010, outcomes: ['John Kaanta', 'Pat Doar'] },
      { year: 2011, outcomes: ['Tom Waseleski Jr.', 'Brady Smith'] },
      { year: 2012, outcomes: ['Justin Fegers', 'Brady Smith'] },
      { year: 2013, outcomes: ['Brady Smith'] },
      { year: 2014, outcomes: ['Jake Redetzke', 'Brady Smith'] },
      { year: 2015, outcomes: ['Rained out'] },
      { year: 2016, outcomes: ['Harry Hanson', 'Jake Redetzke'] },
      { year: 2017, outcomes: ['Jeff Provinzino', 'John Kaanta'] },
      { year: 2018, outcomes: ['Kyle Peterlin', 'Pat Doar'] },
      { year: 2019, outcomes: ['Kyle Peterlin', 'Pat Doar'] },
      { year: 2020, outcomes: ['Pat Doar', 'Pat Doar'] },
      { year: 2021, outcomes: ['Darrell Nelson', 'Jay Kintner'] },
      { year: 2022, outcomes: ['Darrell Nelson', 'Pat Doar'] },
      { year: 2023, outcomes: ['Kyle Peterlin', 'Kyle Peterlin'] },
      { year: 2024, outcomes: ['Kyle Peterlin', 'Cole Searing'] },
      { year: 2025, outcomes: ['Kevin Eder', 'Kyle Peterlin'] },
      { year: 2026, outcomes: ['Joel Bennett', 'Skeeter Estey'] },
    ],
  },
  {
    name: 'Modifieds',
    years: '1990–2026',
    rows: [
      { year: 1990, outcomes: ['Bruce Niemi', 'Steve Vesel'] },
      { year: 1991, outcomes: ['Ron Jones', 'Rick Aukland'] },
      { year: 1992, outcomes: ['Brad Hanson', 'Ron Jones'] },
      { year: 1993, outcomes: ['Mike Chamernick'] },
      { year: 1995, outcomes: ['Jeff Spacek', 'Ron Schreiner'] },
      { year: 1996, outcomes: ['Rich Loftus', 'Jeff Ruzich'] },
      { year: 1997, outcomes: ['Darrell Nelson', 'Don Copp'] },
      { year: 1998, outcomes: ['Jeff Marshall', 'Eric Pember'] },
      { year: 1999, outcomes: ['Pat Doar', 'Jerry Hartman'] },
      { year: 2000, outcomes: ['Brent Prochnow', 'Alan Olafson'] },
      { year: 2001, outcomes: ['Kelly Estey', 'Bob Broking'] },
      { year: 2002, outcomes: ['Kelly Estey', 'Danny Pierce'] },
      { year: 2003, outcomes: ['Brad Hanson', 'Brad Hanson'] },
      { year: 2004, outcomes: ['Kelly Estey'] },
      { year: 2005, outcomes: ['Joey Jensen', 'Dave Cain'] },
      { year: 2006, outcomes: ['Dave Cain', 'Joey Jensen'] },
      { year: 2007, outcomes: ['Craig Thatcher', 'Kelly Estey'] },
      { year: 2008, outcomes: ['Robby Bunkelman', 'Joey Jensen'] },
      { year: 2009, outcomes: ['Craig Thatcher', 'Greg Chesley'] },
      { year: 2010, outcomes: ['Tim Jackson', 'Bill Byholm'] },
      { year: 2011, outcomes: ['Dave Cain', 'Kelly Estey'] },
      { year: 2012, outcomes: ['Brandon Jensen', 'Dave Cain'] },
      { year: 2013, outcomes: ['Trent Follmer'] },
      { year: 2014, outcomes: ['Kelly Estey', 'Darrell Nelson'] },
      { year: 2015, outcomes: ['Rained out'] },
      { year: 2016, outcomes: ['Jeremy Nelson', 'Steve Stuart'] },
      { year: 2017, outcomes: ['Johnny Broking', 'Andy Davey'] },
      { year: 2018, outcomes: ['Bob Broking', 'Jody Bellefeuille'] },
      { year: 2019, outcomes: ['Jeremy Nelson', 'Johnny Broking'] },
      { year: 2020, outcomes: ['Al Uotinen', 'Shane Sabraski'] },
      { year: 2021, outcomes: ['Skeeter Estey', 'Skeeter Estey'] },
      { year: 2022, outcomes: ['Skeeter Estey', 'Shane Sabraski'] },
      { year: 2023, outcomes: ['Johnny Broking', 'Dan Eischens'] },
      { year: 2024, outcomes: ['Bob Broking', 'Shane Sabraski'] },
      { year: 2025, outcomes: ['Shane Sabraski', 'Shane Sabraski'] },
      { year: 2026, outcomes: ['Jody Bellefeulle', 'Shane Sabraski'] },
    ],
  },
  {
    name: 'Super Stocks',
    years: '1979–2026',
    rows: [
      { year: 1979, outcomes: ['Gary Grierson'] },
      { year: 1980, outcomes: ['Steve Vesel'] },
      { year: 1981, outcomes: ['Billy Nelson'] },
      { year: 1982, outcomes: ['Bob Gherardi'] },
      { year: 1983, outcomes: ['Don Roseen'] },
      { year: 1990, outcomes: ['Roger Niemi', 'Pete Goodremote'] },
      { year: 1991, outcomes: ['Pete Wohlers', 'Mike Goodremote'] },
      { year: 1992, outcomes: ['Dan McMann', 'Scott Hipsher'] },
      { year: 1993, outcomes: ['Pat Doar'] },
      { year: 1995, outcomes: ['Darin Meierotto', 'Dale Gangl'] },
      { year: 1996, outcomes: ['Jay Kintner', 'Ryan Aho'] },
      { year: 1997, outcomes: ['Jay Kintner', 'Mike Goodremote'] },
      { year: 1998, outcomes: ['Ryan Aho', 'Ryan Aho'] },
      { year: 1999, outcomes: ['Jason Miller', 'Dale Gangl'] },
      { year: 2000, outcomes: ['Chuckie Desmith', 'Ryan Aho'] },
      { year: 2001, outcomes: ['John Remington', 'Ryan Aho'] },
      { year: 2002, outcomes: ['Todd Lopac', 'Darin Meierotto'] },
      { year: 2003, outcomes: ['Rick Jacobson', 'Brandon Jensen'] },
      { year: 2004, outcomes: ['Ryan Aho'] },
      { year: 2005, outcomes: ['Steve Thomas', 'Jeff Tardy'] },
      { year: 2006, outcomes: ['Jay Kintner', 'Ryan Aho'] },
      { year: 2007, outcomes: ['Jay Kintner', 'Jeff Tardy'] },
      { year: 2008, outcomes: ['Andy Davey', 'Mike Bellefeuille'] },
      { year: 2009, outcomes: ['Mike Keller', 'Dave Maas'] },
      { year: 2010, outcomes: ['Reed Scott', 'Reed Scott'] },
      { year: 2011, outcomes: ['Zach Wohlers', 'Derek Vesel'] },
      { year: 2012, outcomes: ['Scott Lawrence', 'Derek Vesel'] },
      { year: 2013, outcomes: ['Randy Spacek'] },
      { year: 2014, outcomes: ['Kevin Burdick', 'Derek Vesel'] },
      { year: 2015, outcomes: ['Rained out'] },
      { year: 2016, outcomes: ['Kevin Burdick', 'Dave Maas'] },
      { year: 2017, outcomes: ['Shane Sabraski', 'Shane Sabraski'] },
      { year: 2018, outcomes: ['Kevin Burdick', 'Kevin Burdick'] },
      { year: 2019, outcomes: ['Shane Sabraski', 'Kevin Burdick'] },
      { year: 2020, outcomes: ['Kevin Burdick'] },
      { year: 2021, outcomes: ['Shane Sabraski'] },
      { year: 2022, outcomes: ['Shane Sabraski', 'Dave Maas'] },
      { year: 2023, outcomes: ['Shane Sabraski', 'Shane Sabraski'] },
      { year: 2024, outcomes: ['Shane Sabraski', 'Tristan LaBarge'] },
      { year: 2025, outcomes: ['Shane Sabraski', 'Shane Sabraski'] },
      { year: 2026, outcomes: ['Shane Sabraski', 'Tyler Kintner'] },
    ],
  },
  {
    name: 'Midwest Modifieds',
    years: '2010–2026',
    rows: [
      { year: 2010, outcomes: ['Rick Jacobson'] },
      { year: 2011, outcomes: ['Dan Ebert', 'Skeeter Estey'] },
      { year: 2012, outcomes: ['Charlie Castle', 'Mark Kangas'] },
      { year: 2013, outcomes: ['Dan Kingsley'] },
      { year: 2014, outcomes: ['Skeeter Estey', 'Carey LePage'] },
      { year: 2015, outcomes: ['Rained out', 'Shane Sabraski'] },
      { year: 2016, outcomes: ['Skeeter Estey', 'Mack Estey'] },
      { year: 2017, outcomes: ['Skeeter Estey', 'Skeeter Estey'] },
      { year: 2018, outcomes: ['Skeeter Estey', 'Skeeter Estey'] },
      { year: 2019, outcomes: ['Skeeter Estey', 'Mack Estey'] },
      { year: 2020, outcomes: ['Skeeter Estey'] },
      { year: 2021, outcomes: ['Tyler Vernon'] },
      { year: 2022, outcomes: ['Tyler Kintner', 'Cody Carlson'] },
      { year: 2023, outcomes: ['Devin VanHouse', 'Marcus Dunbar'] },
      { year: 2024, outcomes: ['Mikey Blevins', 'Mervin Castle III'] },
      { year: 2025, outcomes: ['Tyler Vernon', 'Jake Smith'] },
      { year: 2026, outcomes: ['David Simpson', 'Mikey Blevins'] },
    ],
  },
  {
    name: 'Pure Stocks',
    years: '2018–2022',
    rows: [
      { year: 2018, outcomes: ['Michael Blevins'] },
      { year: 2019, outcomes: ['Cory Jorgensen'] },
      { year: 2020, outcomes: ['Chad Finckbone'] },
      { year: 2021, outcomes: ['Chad Finckbone'] },
      { year: 2022, outcomes: ['No race'] },
    ],
  },
  {
    name: 'Hornets',
    years: '2019–2026',
    rows: [
      { year: 2019, outcomes: ['Tyler Kachinske'] },
      { year: 2020, outcomes: ['Aaron Reimers'] },
      { year: 2021, outcomes: ['Chaston Finckbone'] },
      { year: 2022, outcomes: ['Michael Egan'] },
      { year: 2023, outcomes: ['Justin Barsness', 'Justin Barsness'] },
      { year: 2024, outcomes: ['Justin Schelitzche', 'Justin Schelitzche'] },
      { year: 2025, outcomes: ['Brody Fosso', 'Brady Fosso'] },
      { year: 2026, outcomes: ['Nick Ruzich', 'Brady Fosso'] },
    ],
  },
]


function laborDayUtc(year: number) {
  const sept1 = new Date(Date.UTC(year, 8, 1))
  const day = sept1.getUTCDay()
  const daysToMonday = (8 - day) % 7
  return new Date(Date.UTC(year, 8, 1 + daysToMonday))
}

function isLaborDayWeekend(value: string | null) {
  if (!value) return false
  const date = new Date(value + 'T00:00:00Z')
  const year = date.getUTCFullYear()
  const laborDay = laborDayUtc(year)
  const difference = Math.round((laborDay.getTime() - date.getTime()) / 86400000)
  return difference >= 0 && difference <= 2
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function sourceName(url: string | null) {
  if (!url) return 'Museum results database'
  if (url.includes('thethirdturn.com')) return 'The Third Turn / WISSOTA'
  if (url.includes('dirtondirt.com')) return 'Dirt on Dirt'
  if (url.includes('hibbingspeedway.com')) return 'Hibbing Speedway'
  return 'Published race source'
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
}

export default async function HibbingLaborDayShootoutPage() {
  const [{ data: legacyEventData }, { data: seriesEventData }, { data: heroRows }] = await Promise.all([
    supabase
      .from('Events')
      .select('id,race_date,year,race_status')
      .eq('track_id', HIBBING_TRACK_ID)
      .eq('class_id', LATE_MODEL_CLASS_ID)
      .gte('race_date', '1979-08-25')
      .lte('race_date', '2026-09-07')
      .order('race_date', { ascending: true }),
    supabase
      .from('SeriesEvents')
      .select('id,series_id,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug)')
      .eq('track_slug', 'hibbing-raceway-mn')
      .in('series_id', WISSOTA_LATE_MODEL_SERIES_IDS)
      .gte('race_date', '1979-08-25')
      .lte('race_date', '2026-09-07')
      .order('race_date', { ascending: true }),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug', 'hibbing-raceway-mn')
      .eq('photo_rank', 1),
  ])

  const legacyEvents = ((legacyEventData || []) as LegacyEvent[]).filter((event) => isLaborDayWeekend(event.race_date))
  const legacyIds = legacyEvents.map((event) => event.id)

  const { data: legacyResultData } = legacyIds.length
    ? await supabase
        .from('Results')
        .select('id,race_id,driver_id,finishing_position')
        .in('race_id', legacyIds)
        .order('race_id', { ascending: true })
        .order('finishing_position', { ascending: true })
    : { data: [] as LegacyResult[] }

  const legacyResults = (legacyResultData || []) as LegacyResult[]
  const driverIds = Array.from(new Set(legacyResults.map((row) => Number(row.driver_id)).filter(Number.isFinite)))
  const { data: driverData } = driverIds.length
    ? await supabase
        .from('Drivers')
        .select('driver_id,driver_name,slug')
        .in('driver_id', driverIds)
    : { data: [] as DriverRow[] }

  const drivers = new Map(
    ((driverData || []) as DriverRow[]).map((driver) => [
      Number(driver.driver_id),
      { name: driver.driver_name || 'Unknown Driver', slug: driver.slug || null },
    ]),
  )

  const legacyResultsByRace = new Map<number, ArchiveResult[]>()
  for (const row of legacyResults) {
    if (row.finishing_position == null) continue
    const driver = drivers.get(Number(row.driver_id))
    const result: ArchiveResult = {
      position: Number(row.finishing_position),
      startingPosition: null,
      driverName: driver?.name || 'Unknown Driver',
      driverSlug: driver?.slug || null,
      carNumber: null,
    }
    const rows = legacyResultsByRace.get(Number(row.race_id)) || []
    rows.push(result)
    legacyResultsByRace.set(Number(row.race_id), rows)
  }

  const legacyArchive: ArchiveRace[] = legacyEvents
    .filter((event) => event.race_date)
    .map((event) => {
      const results = [...(legacyResultsByRace.get(event.id) || [])].sort((a, b) => a.position - b.position)
      return {
        key: 'museum-' + event.id,
        year: Number(event.year || event.race_date!.slice(0, 4)),
        raceDate: event.race_date!,
        winner: results.find((row) => row.position === 1)?.driverName || 'Winner not yet identified',
        sourceLabel: 'Museum results database',
        sourceUrl: null,
        results,
        dnqNames: [],
        sourceType: 'museum' as const,
      }
    })

  const seriesEvents = ((seriesEventData || []) as SeriesEvent[]).filter((event) => isLaborDayWeekend(event.race_date))
  const seriesArchive: ArchiveRace[] = seriesEvents
    .filter((event) => event.race_date)
    .map((event) => {
      const rawRows = event.SeriesEventResults || []
      const results: ArchiveResult[] = rawRows
        .filter((row) => row.finishing_position != null)
        .map((row) => ({
          position: Number(row.finishing_position),
          startingPosition: row.starting_position,
          driverName: row.driver_name,
          driverSlug: row.driver_slug,
          carNumber: row.car_number,
        }))
        .sort((a, b) => a.position - b.position)

      return {
        key: 'series-' + event.id,
        year: Number(event.race_date!.slice(0, 4)),
        raceDate: event.race_date!,
        winner: event.winner_name || results.find((row) => row.position === 1)?.driverName || 'Winner not yet identified',
        sourceLabel: sourceName(event.source_url),
        sourceUrl: event.source_url,
        results,
        dnqNames: rawRows.filter((row) => row.finishing_position == null).map((row) => row.driver_name),
        sourceType: 'series' as const,
      }
    })

  const byDate = new Map<string, ArchiveRace>()
  for (const race of legacyArchive) byDate.set(race.raceDate, race)
  for (const race of seriesArchive) {
    const current = byDate.get(race.raceDate)
    if (!current || race.results.length >= current.results.length) byDate.set(race.raceDate, race)
  }

  const archives = [...byDate.values()].sort((a, b) => b.raceDate.localeCompare(a.raceDate))
  const resultCount = archives.reduce((sum, race) => sum + race.results.length, 0)
  const coveredYears = new Set(archives.map((race) => race.year))
  const missingYears = range(1979, 2026).filter((year) => !coveredYears.has(year))

  const lateModelHistory = winnerDivisions.find((division) => division.name === 'Late Models')?.rows || []
  const winnerCounts = new Map<string, number>()
  for (const row of lateModelHistory) {
    for (const winner of row.outcomes) {
      if (winner === 'Rained out' || winner === 'No race') continue
      winnerCounts.set(winner, (winnerCounts.get(winner) || 0) + 1)
    }
  }
  const repeatWinners = [...winnerCounts.entries()]
    .filter(([, wins]) => wins > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)

  const racesByYear = new Map<number, ArchiveRace[]>()
  for (const race of [...archives].reverse()) {
    const rows = racesByYear.get(race.year) || []
    rows.push(race)
    racesByYear.set(race.year, rows)
  }

  const heroSrc = (heroRows || [])[0]?.image_url || ''

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc ? <img src={heroSrc} alt="Hibbing Raceway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Labor Day Shootout</span></div>
        <div className={styles.eyebrow}>Northern Minnesota Special Event Archive</div>
        <h1 className={styles.title}>Labor Day Shootout</h1>
        <p className={styles.tagline}>Hibbing Raceway • Labor Day Weekend Tradition</p>
        <p className={styles.intro}>Museum newspaper sources trace Hibbing’s Labor Day-weekend stock-car tradition to at least 1979. Midwest Racing News called the program the Labor Day Invitational through the early 1980s before the Labor Day Shootout name took hold. The modern two-night WISSOTA weekend remains one of northern Minnesota’s major annual dirt-track events.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/hibbing-raceway-mn" className={styles.button}>Open Hibbing Raceway</Link>
          <a href="#winners" className={styles.buttonGhost}>Past Winners</a>
          <a href="#results" className={styles.buttonGhost}>Full Results</a>
          <a href="https://hibbingspeedway.com/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Hibbing Speedway</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Published Current Running" value="48th • 2026" />
          <Stat label="Past Winner Divisions" value={String(winnerDivisions.length)} />
          <Stat label="Published Finish Positions" value={resultCount.toLocaleString('en-US')} />
          <Stat label="Museum Evidence Span" value="1979–2026" />
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Why It Belongs in Special Events</div>
            <strong>A Labor Day destination race with nearly five decades of northern Minnesota history.</strong>
            <p>The weekend has repeatedly drawn regional Late Model, Modified and Super Stock fields to Hibbing after the regular-season point chase. Modern editions run as a multi-division WISSOTA weekend, while the older newspaper record shows the same Labor Day identity long before today’s format.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Annual-Number Research Note</div>
            <strong>The published numbering is not perfectly consistent across surviving sources.</strong>
            <p>MRN called the 1990 program the 13th annual, Dirt Race Central labeled the 1996 Late Model race the 17th annual and the 1998 Super Stock race the 19th annual, while Hibbing Speedway promoted 2025 as the 47th annual. The museum therefore preserves the wording used by each source instead of forcing a single unsupported inaugural-year calculation.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Source Trail</div>
        <div className={styles.sectionHead}><h2>How the History Comes Together</h2><div className={styles.sectionNote}>MRN and CFRN OCR, Dirt Race Central, official Hibbing material, Hall of Fame records and the museum’s existing result database.</div></div>
        <div className={styles.eraGrid}>
          {researchTrail.map((item) => <div key={item.era + item.title} className={styles.eraCard}>
            <div className={styles.eraYear}>{item.era}</div>
            <div className={styles.eraValue}>{item.title}</div>
            <div className={styles.eraNote}>{item.detail}</div>
            {item.url ? <a href={item.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#d0ad63', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>Open source →</a> : null}
          </div>)}
        </div>
      </section>

      {repeatWinners.length > 0 && <section className={styles.section}>
        <div className={styles.kicker}>Recovered Late Model Winners</div>
        <div className={styles.sectionHead}><h2>Multiple Race-Night Victories</h2><div className={styles.sectionNote}>Counts use the full past-winners chronology plus the museum’s 2026 results.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name, wins]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>Labor Day Shootout Late Model feature victories</div></div>)}
        </div>
      </section>}


      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Past Winners</div>
        <div className={styles.sectionHead}><h2>Labor Day Shootout Winner History</h2><div className={styles.sectionNote}>Historical list supplied from the Hibbing past-winners archive through 2025; 2026 winners are added from the museum’s current Hibbing results. Two names in one year indicate two recorded feature winners that weekend.</div></div>
        <div className={styles.eventStack}>
          {winnerDivisions.map((division) => <article key={division.name} className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>{division.name}</h3>
              <div className={styles.panelMeta}>{division.years} • {division.rows.reduce((sum, row) => sum + row.outcomes.filter((name) => name !== 'Rained out' && name !== 'No race').length, 0)} recorded feature winners</div>
            </div>
            <div className={styles.panelBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '86px minmax(0,1fr)', gap: 8, padding: '7px 8px', borderBottom: '1px solid #4a5054', color: '#92989b', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 900 }}>
                <span>Year</span><span>Weekend winner(s)</span>
              </div>
              {division.rows.map((row) => <div key={division.name + '-' + row.year} style={{ display: 'grid', gridTemplateColumns: '86px minmax(0,1fr)', gap: 8, padding: '8px', borderBottom: '1px solid #22282c', fontSize: 12, color: '#c9ccce', alignItems: 'center' }}>
                <strong style={{ color: '#fff' }}>{row.year}</strong>
                <span>{row.outcomes.map((outcome, index) => <span key={row.year + '-' + outcome + '-' + index}>{index ? <span style={{ color: '#d0ad63' }}> • </span> : null}<strong style={{ color: outcome === 'Rained out' || outcome === 'No race' ? '#9ca1a4' : '#fff' }}>{outcome}</strong></span>)}</span>
              </div>)}
            </div>
          </article>)}
        </div>
        <p className={styles.note}>Name cleanup applied where the museum driver table provides an unambiguous match: Eric Pember and Ron Schreiner. Obvious copy typos were also normalized to 2014 and Cole Searing. The 2015 Midwest Modified entry is preserved as supplied: one listed rainout plus Shane Sabraski.</p>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Research Queue</div>
          <strong>The winner chronology is much more complete than the full-result archive.</strong>
          <p>Late Model years still lacking a Labor Day-weekend race row in the museum database are: {missingYears.join(', ')}. Their winners are now preserved above where known; the remaining work is to recover dates, top fives and full finishing orders from MRN/CFRN, Dirt Race Central and other race reports.</p>
        </div>
      </section>

      <section className={styles.section} id="results">
        <div className={styles.kicker}>Recovered Result Archive</div>
        <div className={styles.sectionHead}><h2>Hibbing Labor Day Weekend Late Models — Full Results</h2><div className={styles.sectionNote}>This section is intentionally stricter than the winner chronology above: it only shows race nights with finishing-position rows already attached to the museum database.</div></div>
        <div className={styles.eventStack}>
          {archives.map((race) => {
            const yearRaces = racesByYear.get(race.year) || []
            const chronological = [...yearRaces].sort((a, b) => a.raceDate.localeCompare(b.raceDate))
            const nightIndex = chronological.findIndex((item) => item.key === race.key)
            const nightLabel = yearRaces.length > 1 ? ' • Night ' + (nightIndex + 1) : ''
            return <article key={race.key} className={styles.eventCard}>
              <div className={styles.eventHeader}>
                <div><div className={styles.eventYear}>{race.year}{nightLabel}</div><div className={styles.eventDate}>{formatDate(race.raceDate)} • Hibbing Raceway</div></div>
                <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Late Model Winner</span><strong className={styles.winnerName}>{race.winner}</strong></div>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.winnerBar}>
                  <span>{race.results.length} published finish {race.results.length === 1 ? 'position' : 'positions'}{race.dnqNames.length ? ' • ' + race.dnqNames.length + ' additional entrants' : ''}</span>
                  {race.sourceUrl ? <a href={race.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>{race.sourceLabel} →</strong></a> : <strong>{race.sourceLabel}</strong>}
                </div>
                {race.results.length ? <div className={styles.resultsScroller}>
                  <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Source</span></div>
                  {race.results.map((row) => <div key={race.key + '-' + row.position + '-' + row.driverName} className={styles.compactRow}>
                    <strong>{row.position}</strong>
                    <span>{row.startingPosition || '—'}</span>
                    <strong>{row.driverSlug ? <Link href={'/drivers/' + row.driverSlug} style={{ color: 'inherit' }}>{row.driverName}</Link> : row.driverName}</strong>
                    <span>{row.carNumber || '—'}</span>
                    <span>{race.sourceType === 'series' ? 'WISSOTA' : 'Museum'}</span>
                  </div>)}
                </div> : <div className={styles.winnerOnly}>Winner recovered; deeper finishing order is still being researched.</div>}
                {race.dnqNames.length > 0 && <div className={styles.dnqWrap}><div className={styles.dnqTitle}>Additional entrants / no published feature position</div>{race.dnqNames.map((name) => <span key={race.key + '-dnq-' + name} className={styles.dnqChip}>{name}</span>)}</div>}
              </div>
            </article>
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>This page is built from existing museum records rather than a duplicate event database.</strong>
          <p>The Special Event archive merges Hibbing’s legacy Events/Results records with the deeper WISSOTA Challenge and AMSOIL Late Model series fields already stored in Supabase. That keeps driver links and future result corrections synchronized with the main museum.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/hibbing-raceway-mn" className={styles.footerLink}>Hibbing Raceway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue archival research →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
