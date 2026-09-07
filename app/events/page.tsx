import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './events-landing.module.css'

export const revalidate = 300

type EventCollection = {
  slug: string
  title: string
  venue: string
  venueTrackSlug?: string
  years: string
  firstYear: number
  lastYear: number
  races: number
  results: number
  status: string
  category: 'Asphalt' | 'Dirt'
  complete?: boolean
  description: string
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const events: EventCollection[] = [
  {
    slug: 'slinger-nationals',
    title: 'Slinger Nationals',
    venue: 'Slinger Speedway',
    venueTrackSlug: 'slinger-speedway-wi',
    years: '1980–2026',
    firstYear: 1980,
    lastYear: 2026,
    races: 88,
    results: 2185,
    status: 'Archive built',
    category: 'Asphalt',
    complete: true,
    description: 'The complete Slinger Nationals collection, from the original multi-race era through the modern 200-lap summer classic.',
  },
  {
    slug: 'silver-1000',
    title: 'Silver 1000',
    venue: 'Proctor Speedway',
    venueTrackSlug: 'proctor-speedway-mn',
    years: '1973–2025',
    firstYear: 1973,
    lastYear: 2025,
    races: 89,
    results: 1065,
    status: 'Archive live — enrichment underway',
    category: 'Dirt',
    description: 'One annual archive linking the Silver 1000 Late Model and Modified divisions together by year at Proctor Speedway.',
  },
  {
    slug: 'wissota-100',
    title: 'WISSOTA 100',
    venue: 'Upper Midwest / Upper Great Plains',
    years: '1986–2025',
    firstYear: 1986,
    lastYear: 2025,
    races: 173,
    results: 1513,
    status: 'Archive built',
    category: 'Dirt',
    complete: true,
    description: 'A single championship-weekend collection tying together all documented WISSOTA 100 divisions by year.',
  },
  {
    slug: 'legendary-100',
    title: 'Legendary 100',
    venue: 'Cedar Lake Speedway',
    venueTrackSlug: 'cedar-lake-speedway-wi',
    years: '2006–2025',
    firstYear: 2006,
    lastYear: 2025,
    races: 128,
    results: 1898,
    status: 'Archive built',
    category: 'Dirt',
    complete: true,
    description: 'The Cedar Lake Speedway multi-division classic preserved as one event family with every documented championship division linked by year.',
  },
  {
    slug: 'usa-nationals',
    title: 'USA Nationals',
    venue: 'Cedar Lake Speedway',
    venueTrackSlug: 'cedar-lake-speedway-wi',
    years: '1988–2026',
    firstYear: 1988,
    lastYear: 2026,
    races: 39,
    results: 142,
    status: 'Chronology complete through 2026',
    category: 'Dirt',
    description: 'The annual Dirt Late Model crown jewel preserved as one continuous event chronology with available finishing orders by edition.',
  },
  {
    slug: 'clash-at-the-creek',
    title: 'Clash at the Creek',
    venue: '141 Speedway',
    venueTrackSlug: '141-speedway-wi',
    years: '2009–2026',
    firstYear: 2009,
    lastYear: 2026,
    races: 19,
    results: 203,
    status: 'Archive built',
    category: 'Dirt',
    complete: true,
    description: 'The annual Modified showcase at 141 Speedway, with year-by-year winners and preserved finishing orders in one collection.',
  },
  {
    slug: 'oktoberfest',
    title: 'Oktoberfest',
    venue: 'LaCrosse Fairgrounds Speedway',
    venueTrackSlug: 'lacrosse-fairgrounds-wi',
    years: '1970–2025',
    firstYear: 1970,
    lastYear: 2025,
    races: 56,
    results: 1610,
    status: 'Archive built',
    category: 'Asphalt',
    complete: true,
    description: 'The headline Oktoberfest race archive preserved as one annual tradition with documented finishing orders linked across its history.',
  },
  {
    slug: 'national-short-track-championships',
    title: 'National Short Track Championships',
    venue: 'Rockford Speedway / Dells Raceway Park',
    venueTrackSlug: 'rockford-speedway-il',
    years: '1966–2025',
    firstYear: 1966,
    lastYear: 2025,
    races: 60,
    results: 1569,
    status: 'Archive built',
    category: 'Asphalt',
    complete: true,
    description: 'One continuous headline-event archive preserving the National Short Track Championships from Rockford through its current Dells era.',
  },
  {
    slug: 'jmck-63',
    title: 'JMcK 63',
    venue: 'LaCrosse Fairgrounds Speedway',
    venueTrackSlug: 'lacrosse-fairgrounds-wi',
    years: '2010–2018',
    firstYear: 2010,
    lastYear: 2018,
    races: 9,
    results: 100,
    status: 'Chronology complete — enrichment underway',
    category: 'Asphalt',
    description: 'The John McKarns memorial invitational preserved as a nine-edition Special Event collection with verified winners and available full fields.',
  },
]

const highlightDefinitions = [
  { slug: 'national-short-track-championships', label: 'Longest-running archive', stat: '1966–2025' },
  { slug: 'slinger-nationals', label: 'Deepest result archive', stat: '2,185 result rows' },
  { slug: 'wissota-100', label: 'Largest multi-division collection', stat: '173 division events' },
  { slug: 'usa-nationals', label: 'Current crown jewel', stat: 'Through 2026' },
]

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

export default async function EventsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) || {}
  const q = one(params.q).trim()
  const surface = one(params.surface)
  const sort = one(params.sort) || 'oldest'

  const trackSlugs = Array.from(new Set(events.map((event) => event.venueTrackSlug).filter(Boolean))) as string[]
  const { data: photoRows } = trackSlugs.length
    ? await supabase
        .from('track_hero_photo_variants_view')
        .select('slug,photo_rank,image_url')
        .in('slug', trackSlugs)
        .eq('photo_rank', 1)
    : { data: [] }

  const photoByTrack = new Map((photoRows || []).map((row: any) => [row.slug, row.image_url]))
  const heroPhoto = photoByTrack.get('slinger-speedway-wi') || photoByTrack.get('rockford-speedway-il') || ''

  const lowerQ = q.toLowerCase()
  let filtered = events.filter((event) => {
    const matchesQuery = !lowerQ || [event.title, event.venue, event.years, event.description].some((value) => value.toLowerCase().includes(lowerQ))
    const matchesSurface = !surface || surface === 'all' || event.category.toLowerCase() === surface.toLowerCase()
    return matchesQuery && matchesSurface
  })

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.title.localeCompare(b.title)
    if (sort === 'results') return b.results - a.results
    if (sort === 'newest') return b.firstYear - a.firstYear
    return a.firstYear - b.firstYear
  })

  const raceTotal = events.reduce((sum, event) => sum + event.races, 0)
  const resultTotal = events.reduce((sum, event) => sum + event.results, 0)
  const firstYear = Math.min(...events.map((event) => event.firstYear))
  const lastYear = Math.max(...events.map((event) => event.lastYear))
  const asphaltCount = events.filter((event) => event.category === 'Asphalt').length
  const dirtCount = events.filter((event) => event.category === 'Dirt').length
  const highlights = highlightDefinitions
    .map((item) => ({ ...item, event: events.find((event) => event.slug === item.slug) }))
    .filter((item): item is typeof item & { event: EventCollection } => Boolean(item.event))

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroPhoto ? <img src={heroPhoto} alt="Upper Midwest special event racing" className={styles.heroImage} /> : <div className={styles.heroFallback} />}
        <div className={styles.heroInner}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
              <h1 className={styles.title}>Special Events</h1>
              <div className={styles.subtitle}>Explore {events.length} marquee racing traditions</div>
              <p className={styles.intro}>
                Browse annual classics, memorial races, crown jewels, and championship weekends preserved as complete event families. Each collection links the years, divisions, winners, full fields, tracks, and surviving archive material behind the race.
              </p>
            </div>
            <div className={styles.heroScript} aria-hidden="true">
              <span>Big Races</span>
              <span>Become</span>
              <strong>Legends</strong>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <Stat value={String(events.length)} label="Event collections" />
            <Stat value={formatNumber(raceTotal)} label="Race events archived" />
            <Stat value={formatNumber(resultTotal)} label="Result rows archived" />
            <Stat value={`${firstYear}–${lastYear}`} label="Years of history" />
            <Stat value={`${asphaltCount} + ${dirtCount}`} label="Asphalt + dirt traditions" />
          </div>

          <form action="/events" className={styles.searchPanel}>
            <div className={styles.searchRow}>
              <input name="q" defaultValue={q} className={styles.searchInput} placeholder="Search special events by name, venue, or era..." />
              <button className={styles.searchButton} type="submit">Search Events</button>
            </div>
            <div className={styles.filterGrid}>
              <label className={styles.filterField}>
                <span>Surface</span>
                <select name="surface" defaultValue={surface || 'all'}>
                  <option value="all">All Surfaces</option>
                  <option value="asphalt">Asphalt</option>
                  <option value="dirt">Dirt</option>
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Sort By</span>
                <select name="sort" defaultValue={sort}>
                  <option value="oldest">Oldest Tradition</option>
                  <option value="newest">Newest Tradition</option>
                  <option value="name">Event Name (A–Z)</option>
                  <option value="results">Deepest Results Archive</option>
                </select>
              </label>
              <div className={styles.filterNote}>{filtered.length} special-event collections match this view</div>
            </div>
          </form>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>Browse the archive</div>
              <h2>Browse by Tradition</h2>
            </div>
            <div className={styles.sectionNote}>Two very different forms of Upper Midwest crown-jewel racing.</div>
          </div>
          <div className={styles.traditionGrid}>
            <Link href="/events?surface=asphalt#archive" className={styles.traditionCard}>
              {photoByTrack.get('slinger-speedway-wi') && <img src={photoByTrack.get('slinger-speedway-wi')} alt="Asphalt special events" className={styles.traditionImage} />}
              <div className={styles.traditionShade} />
              <div className={styles.traditionBody}>
                <div className={styles.traditionName}>Asphalt Classics</div>
                <div className={styles.traditionMeta}>{asphaltCount} event families • Slinger, Oktoberfest, NSTC & more</div>
              </div>
            </Link>
            <Link href="/events?surface=dirt#archive" className={styles.traditionCard}>
              {photoByTrack.get('cedar-lake-speedway-wi') && <img src={photoByTrack.get('cedar-lake-speedway-wi')} alt="Dirt special events" className={styles.traditionImage} />}
              <div className={styles.traditionShade} />
              <div className={styles.traditionBody}>
                <div className={styles.traditionName}>Dirt Crown Jewels</div>
                <div className={styles.traditionMeta}>{dirtCount} event families • USA Nationals, WISSOTA 100 & more</div>
              </div>
            </Link>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>Museum archive highlights</div>
              <h2>Explore Special Event History</h2>
            </div>
            <div className={styles.sectionNote}>Signature records from the museum&apos;s marquee-event collection.</div>
          </div>
          <div className={styles.highlightsGrid}>
            {highlights.map(({ event, label, stat }) => {
              const image = event.venueTrackSlug ? photoByTrack.get(event.venueTrackSlug) : ''
              return (
                <Link key={event.slug} href={`/events/${event.slug}`} className={styles.highlightCard}>
                  <div className={styles.highlightImageWrap}>
                    {image ? <img src={image} alt={event.title} className={styles.highlightImage} /> : <div className={styles.highlightFallback}>{event.title.slice(0, 3).toUpperCase()}</div>}
                  </div>
                  <div className={styles.highlightBody}>
                    <div className={styles.cardLabel}>{label}</div>
                    <div className={styles.highlightTitle}>{event.title}</div>
                    <div className={styles.highlightMeta}>{event.venue} • {event.years}</div>
                    <div className={styles.highlightStat}>{stat}</div>
                  </div>
                  <div className={styles.highlightLink}>View Event Archive →</div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className={styles.section} id="archive">
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionKicker}>Research directory</div>
              <h2>Complete Special Event Archive</h2>
            </div>
            <div className={styles.sectionNote}>{filtered.length} of {events.length} event collections shown</div>
          </div>

          {filtered.length ? (
            <div className={styles.directoryGrid}>
              {filtered.map((event) => {
                const image = event.venueTrackSlug ? photoByTrack.get(event.venueTrackSlug) : ''
                return (
                  <Link key={event.slug} href={`/events/${event.slug}`} className={`${styles.eventCard} ${event.complete ? styles.eventComplete : ''}`}>
                    {event.complete && <div className={styles.completeBadge}>Museum Archive Complete</div>}
                    <div className={styles.eventImageWrap}>
                      {image ? <img src={image} alt={event.title} className={styles.eventImage} /> : <div className={styles.eventFallback}>{event.title.slice(0, 4).toUpperCase()}</div>}
                      <div className={styles.eventImageShade} />
                    </div>
                    <div className={styles.eventBody}>
                      <div className={styles.cardLabel}>{event.category} special event</div>
                      <div className={styles.eventTitle}>{event.title}</div>
                      <div className={styles.eventVenue}>{event.venue} • {event.years}</div>
                      <p className={styles.eventDescription}>{event.description}</p>
                      <div className={styles.eventStats}>
                        <div className={styles.eventStat}><strong>{formatNumber(event.races)}</strong><span>Race events</span></div>
                        <div className={styles.eventStat}><strong>{formatNumber(event.results)}</strong><span>Result rows</span></div>
                      </div>
                      <div className={styles.eventFooter}><span>{event.status}</span><b>Explore Event →</b></div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className={styles.empty}>No special event collections match those filters. Clear the search or choose another surface.</div>
          )}
        </div>

        <div className={styles.footerGrid}>
          <Link href="/results" className={styles.footerCard}>
            <div className={styles.footerNo}>01</div><div className={styles.footerTitle}>Race Results Archive</div><div className={styles.footerText}>Continue into the museum&apos;s complete race-results research collection.</div><div className={styles.footerLink}>Browse Results →</div>
          </Link>
          <Link href="/tracks" className={styles.footerCard}>
            <div className={styles.footerNo}>02</div><div className={styles.footerTitle}>Track Archive</div><div className={styles.footerText}>Explore the venues that hosted these marquee races and championship weekends.</div><div className={styles.footerLink}>Browse Tracks →</div>
          </Link>
          <Link href="/research" className={styles.footerCard}>
            <div className={styles.footerNo}>03</div><div className={styles.footerTitle}>Research Center</div><div className={styles.footerText}>Go deeper with feature winners, statistics, records, photographs, and museum research tools.</div><div className={styles.footerLink}>Open Research Center →</div>
          </Link>
        </div>
      </section>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className={styles.statCard}><div><div className={styles.statValue}>{value}</div><div className={styles.statLabel}>{label}</div></div></div>
}
