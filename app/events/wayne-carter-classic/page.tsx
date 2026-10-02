import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type SeasonRow = {
  id: number
  year: number
  season_name: string | null
  champion_name: string | null
}

type ResultRow = {
  id: number
  finishing_position: number | null
  starting_position: string | null
  car_number: string | null
  driver_name: string
  driver_slug: string | null
  status: string | null
}

type EventRow = {
  id: number
  season_id: number | null
  race_number: number | null
  race_date: string | null
  track_name: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: ResultRow[]
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function formatDate(value: string | null) {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function noWinnerLabel(year: number) {
  if (year === 2019) return 'Not held'
  if (year === 2021) return 'Cancelled — weather'
  if (year === 2024) return 'Cancelled — rain'
  return 'No winner recorded'
}

function sanctionFor(year: number) {
  if (year <= 1997) return 'ARTGO Challenge Series'
  if (year <= 1999) return 'NASCAR RE/MAX Challenge Series'
  if (year === 2026) return 'Grundy County Speedway • Six Pack Summer Shootout'
  return 'ASA / ARCA Midwest Tour'
}

function sourceLabel(url: string | null) {
  if (!url) return 'Museum research source'
  if (url.includes('thethirdturn.com')) return 'The Third Turn'
  if (url.includes('starsnationaltour.com')) return 'ASA Midwest Tour'
  if (url.includes('constantcontact.com')) return 'Late Model Digest'
  return 'Race report'
}

export default async function WayneCarterClassicPage() {
  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('id')
    .eq('slug', 'wayne-carter-classic')
    .maybeSingle()

  if (seriesError || !series) {
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Wayne Carter Classic archive.</div></div></main>
  }

  const [{ data: seasonData }, { data: eventData, error: eventError }, { data: heroRows }] = await Promise.all([
    supabase
      .from('SeriesSeasons')
      .select('id,year,season_name,champion_name')
      .eq('series_id', series.id)
      .order('year', { ascending: false }),
    supabase
      .from('SeriesEvents')
      .select('id,season_id,race_number,race_date,track_name,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,driver_slug,status)')
      .eq('series_id', series.id)
      .order('race_date', { ascending: false }),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug', 'grundy-county-speedway-il')
      .eq('photo_rank', 1),
  ])

  const seasons = (seasonData || []) as SeasonRow[]
  const events = (eventData || []) as EventRow[]

  const eventIds = events.map((event) => event.id)
  const { data: mediaLinkRows } = eventIds.length
    ? await supabase
        .from('SeriesEventMediaLinks')
        .select('series_event_id,media_id,relationship_type,display_order')
        .in('series_event_id', eventIds)
        .order('display_order', { ascending: true })
    : { data: [] }

  const mediaIds = Array.from(new Set((mediaLinkRows || []).map((row: any) => Number(row.media_id)).filter(Number.isFinite)))
  const { data: mediaRows } = mediaIds.length
    ? await supabase
        .from('SeriesEventMedia')
        .select('id,publication_code,publication_name,issue_date,page_number,storage_path,public_path,headline')
        .in('id', mediaIds)
    : { data: [] }

  const mediaById = new Map((mediaRows || []).map((row: any) => [Number(row.id), row]))
  const mediaByEvent = new Map<number, any[]>()
  for (const link of mediaLinkRows || []) {
    const media = mediaById.get(Number((link as any).media_id))
    if (!media) continue
    const eventId = Number((link as any).series_event_id)
    const rows = mediaByEvent.get(eventId) || []
    rows.push({ ...media, relationship_type: (link as any).relationship_type })
    mediaByEvent.set(eventId, rows)
  }

  const yearBySeason = new Map(seasons.map((row) => [row.id, row.year]))
  const heroSrc = (heroRows || [])[0]?.image_url || ''
  const completed = seasons.filter((row) => row.champion_name)
  const distinctWinners = new Set(completed.map((row) => row.champion_name)).size
  const resultCount = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)

  const winnerCounts = new Map<string, number>()
  for (const season of completed) {
    if (!season.champion_name) continue
    winnerCounts.set(season.champion_name, (winnerCounts.get(season.champion_name) || 0) + 1)
  }
  const repeatWinners = [...winnerCounts.entries()]
    .filter(([, wins]) => wins > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const orderedEvents = [...events].sort((a, b) => {
    const ay = yearBySeason.get(a.season_id || 0) || 0
    const by = yearBySeason.get(b.season_id || 0) || 0
    return by - ay || (a.race_number || 0) - (b.race_number || 0)
  })

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc ? <img src={heroSrc} alt="Wayne Carter Classic at Grundy County Speedway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Wayne Carter Classic</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Wayne Carter Classic</h1>
        <p className={styles.tagline}>Grundy County Speedway • Morris, Illinois • 1975–present</p>
        <p className={styles.intro}>The Wayne Carter Classic occupies a unique place in Midwest short-track history: the inaugural race on September 7, 1975 was also the first event ever staged by ARTGO. Tom Reffner won that 59-lap opener, beginning a lineage that spans the full ARTGO era, the NASCAR Midwest successor years, the Midwest Tour revival, and the modern Grundy County Speedway program.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/grundy-county-speedway-il" className={styles.button}>Open Grundy County Archive</Link>
          <Link href="/series/artgo-challenge-series" className={styles.buttonGhost}>Open ARTGO Archive</Link>
          <a href="https://starsnationaltour.com/wayne-carter-classic-notes-history/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Event History</a>
          <Link href="#winners" className={styles.buttonGhost}>Winner Chronology</Link>
        </div>
        <div className={styles.stats}>
          <Stat label="Completed Classics" value={String(completed.length)} />
          <Stat label="Different Winners" value={String(distinctWinners)} />
          <Stat label="Race Records" value={String(events.length)} />
          <Stat label="Preserved Result Rows" value={formatNumber(resultCount)} />
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The Birth of ARTGO</div>
            <strong>The first Wayne Carter Classic was also the first ARTGO race.</strong>
            <p>Art Frigo and John McKarns launched the new late model series at Grundy on September 7, 1975. Tom Reffner drove his AMC Javelin to the victory over Bob Roper and Joe Shear in the 59-lap inaugural Classic. From that afternoon forward, Grundy and the Wayne Carter Classic remained central to the ARTGO story.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Who Was Wayne Carter?</div>
            <strong>A foundational figure in Grundy County automobile racing.</strong>
            <p>Carter helped bring auto racing to the Grundy County area in the 1920s, participated in fairground racing promotion and the Mazon Speed Bowl era, and was instrumental in the development of the present Grundy County Speedway, which opened in 1971. The Classic keeps that local history tied to one of the Midwest's most important late model events.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>From ARTGO Founding Race to the Modern Grundy Classic</h2><div className={styles.sectionNote}>One event lineage across changing sanctions and formats.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1975–1997</div><div className={styles.eraValue}>ARTGO Challenge Series</div><div className={styles.eraNote}>Twenty-three consecutive ARTGO-era Classics, beginning with the first race in series history.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1998–1999</div><div className={styles.eraValue}>NASCAR Midwest successor era</div><div className={styles.eraNote}>Eddie Hoffman and Steve Carlson won the final two editions before the long hiatus.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2000–2010</div><div className={styles.eraValue}>Hiatus</div><div className={styles.eraNote}>Grundy continued hosting major late model racing, but the Wayne Carter Classic name was dormant.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2011–2025</div><div className={styles.eraValue}>Midwest Tour revival</div><div className={styles.eraNote}>The event returned in 2011, with weather preventing completed editions in 2021 and 2024 and no event held in 2019.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2026</div><div className={styles.eraValue}>Twin-50 Grundy format</div><div className={styles.eraNote}>Ricky Baker and Max Kahler won the two 50-lap features, with Kahler taking the overall Wayne Carter Classic title.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Multiple-Time Winners</div>
        <div className={styles.sectionHead}><h2>The Drivers Who Won It More Than Once</h2><div className={styles.sectionNote}>Joe Shear's six victories remain the defining mark in the event's winner history.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name, wins]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{seasons.filter((row) => row.champion_name === name).map((row) => row.year).sort((a, b) => a - b).join(' • ')}</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Winner Lineage</div>
        <div className={styles.sectionHead}><h2>Wayne Carter Classic Winners by Year</h2><div className={styles.sectionNote}>Completed editions plus the documented modern no-race and weather-cancellation years.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map((season) => <div key={season.id} className={styles.eraCard}>
            <div className={styles.eraYear}>{season.year}</div>
            <div className={styles.eraValue}>{season.champion_name || noWinnerLabel(season.year)}</div>
            <div className={styles.eraNote}>{sanctionFor(season.year)}</div>
          </div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Preserved Race Results</div>
        <div className={styles.sectionHead}><h2>Wayne Carter Classic Finishing Orders</h2><div className={styles.sectionNote}>The ARTGO and 1998–99 NASCAR years are preserved as full fields; later years are shown to the depth currently supported by the museum's source archive.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live Wayne Carter Classic result archive.</div> :
        <div className={styles.eventStack}>{orderedEvents.map((event) => {
          const year = yearBySeason.get(event.season_id || 0)
          const rows = [...event.SeriesEventResults].sort((a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
          const eventLabel = year === 2026 ? 'Twin 50 No. ' + (event.race_number || '—') : 'Wayne Carter Classic'
          const archiveMedia = mediaByEvent.get(event.id) || []
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year || 'Year unknown'} • {eventLabel}</div><div className={styles.eventDate}>{formatDate(event.race_date)} • {event.track_name || 'Grundy County Speedway'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Winner</span><strong className={styles.winnerName}>{event.winner_name || 'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>Preserved result depth • {rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>{event.source_url ? <a href={event.source_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>{sourceLabel(event.source_url)} →</strong></a> : <strong>{sourceLabel(null)}</strong>}</div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Status</span></div>
                {rows.map((row) => <div key={row.id} className={styles.compactRow}><strong>{row.finishing_position ?? '—'}</strong><span>{row.starting_position ?? '—'}</span><strong>{row.driver_slug ? <Link href={'/drivers/' + row.driver_slug} style={{ color: 'inherit' }}>{row.driver_name}</Link> : row.driver_name}</strong><span>{row.car_number ?? '—'}</span><span>{row.status || '—'}</span></div>)}
              </div>
              {archiveMedia.length > 0 && <div className={styles.winnerBar}>
                <span>Archive media • {archiveMedia.length} {archiveMedia.length === 1 ? 'page' : 'pages'}</span>
                <span>{archiveMedia.map((media: any, index: number) => {
                  const href = seriesMediaUrl(media)
                  if (!href) return null
                  return <span key={media.id}>{index > 0 ? ' • ' : ''}<a href={href} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>{media.headline || ((media.publication_code || 'Archive') + ' ' + formatDate(media.issue_date) + ' p.' + (media.page_number || '—'))} →</strong></a></span>
                })}</span>
              </div>}
            </div>
          </article>
        })}</div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>The museum now preserves the Wayne Carter Classic as a dedicated event family rather than leaving the races buried inside their sanctioning-series pages.</strong>
          <p>The collection links the complete 1975–1999 run, the 2011 revival forward, inherited ARTGO and NASCAR Midwest finishing orders, available Midwest Tour result depth, 34 linked archive-media pages, and both full 2026 twin-50 fields. Years 2000–2010 are treated as the event's hiatus rather than fabricated editions.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/grundy-county-speedway-il" className={styles.footerLink}>Grundy County Speedway<span>Open track archive →</span></Link>
        <Link href="/series/artgo-challenge-series" className={styles.footerLink}>ARTGO Challenge Series<span>Open series archive →</span></Link>
      </div>
    </div>
  </main>
}

function seriesMediaUrl(media: any) {
  if (media?.public_path) return media.public_path
  if (!media?.storage_path) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return ''
  return baseUrl + '/storage/v1/object/public/media/' + media.storage_path
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
