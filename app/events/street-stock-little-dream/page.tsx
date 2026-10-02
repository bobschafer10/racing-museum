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
  if (!value) return 'Date not yet recovered'
  const [y, m, d] = value.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function sourceLabel(url: string | null) {
  if (!url) return 'Museum research source'
  if (url.includes('speedsport.com')) return 'SPEED SPORT'
  if (url.includes('ricelakespeedway.net')) return 'Rice Lake Speedway'
  if (url.includes('buzzsprout.com')) return 'Built2Media'
  return 'Race report'
}

function eraFor(year: number) {
  if (year <= 2009) return 'Grassroots growth era'
  if (year <= 2015) return 'Modern promotion / purse-growth era'
  if (year <= 2020) return 'Five-figure crown-jewel era'
  if (year <= 2023) return 'Record-purse climb'
  return '$30,000-plus era'
}

export default async function StreetStockLittleDreamPage() {
  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('id')
    .eq('slug', 'street-stock-little-dream')
    .maybeSingle()

  if (seriesError || !series) {
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Street Stock Little Dream archive.</div></div></main>
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
      .eq('slug', 'rice-lake-speedway-wi')
      .eq('photo_rank', 1),
  ])

  const seasons = (seasonData || []) as SeasonRow[]
  const events = (eventData || []) as EventRow[]
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
      {heroSrc ? <img src={heroSrc} alt="Street Stock Little Dream at Rice Lake Speedway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Street Stock Little Dream</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Street Stock Little Dream</h1>
        <p className={styles.tagline}>Rice Lake Speedway • Rice Lake, Wisconsin • 1995–present</p>
        <p className={styles.intro}>What began in 1995 as a modest Rice Lake Street Stock special became one of the most unusual and lucrative grassroots races in the Upper Midwest. Fans and area businesses add money to the purse during the event, creating bonuses and steadily increasing the winner's share. Eric Olson earned $780 in the first Little Dream; Parker Anderson collected a record $30,400 in the 32nd annual edition in 2026.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/rice-lake-speedway-wi" className={styles.button}>Open Rice Lake Speedway Archive</Link>
          <Link href="#winners" className={styles.buttonGhost}>Winner Chronology</Link>
          <Link href="#results" className={styles.buttonGhost}>Preserved Results</Link>
          <a href="https://speedsport.com/short-track/weekly-racing/donations-fueled-little-dream-goes-tonight/" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Event History</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Completed Editions" value={String(completed.length)} />
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
            <div className={styles.sourceLabel}>A Purse Built by the Crowd</div>
            <strong>The Little Dream's defining tradition is that the purse grows while the event is happening.</strong>
            <p>Fans, businesses and online supporters contribute directly to the winner's share and to creative bonuses throughout the field. Over three decades, that grassroots concept transformed a $780 inaugural payday into a race paying more than $30,000 to win.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Street Stocks Take Center Stage</div>
            <strong>This is not a support-class special tucked into another program.</strong>
            <p>The modern Little Dream is a Street Stock-only showcase built around double heat races, passing points, last-chance races and a large championship field. It has drawn competitors from across the Upper Midwest, other states and Canada to Rice Lake's dirt oval.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>From a $780 Dream to a $30,400 Crown Jewel</h2><div className={styles.sectionNote}>Thirty-two consecutive annual editions are documented from 1995 through 2026.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1995–2009</div><div className={styles.eraValue}>Grassroots growth</div><div className={styles.eraNote}>Eric Olson won the first race for $780. The donation-driven idea caught on and the Little Dream developed its own identity on the Rice Lake calendar.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2010–2015</div><div className={styles.eraValue}>The purse accelerates</div><div className={styles.eraNote}>Jay Kesan, Tim Johnson, Jim Randall and Sam Fankhauser headline the period as the modern promotion pushed the event into increasingly larger payouts.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2016–2020</div><div className={styles.eraValue}>Five-figure crown jewel</div><div className={styles.eraNote}>Eric Olson earned his third Little Dream in 2016. Nick Traynor's 2020 victory paid $26,000 and established the next level of the event's growth.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2021–2023</div><div className={styles.eraValue}>Records fall annually</div><div className={styles.eraNote}>Tim Johnson won in 2021, Nick Traynor earned $28,212 in 2022, and Keith Tourville raised the record again to $29,411 in 2023.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2024</div><div className={styles.eraValue}>The $30,000 barrier</div><div className={styles.eraNote}>Cody Kummer became the official winner after Nick Traynor failed post-race technical inspection. Kummer's adjusted victory paid exactly $30,000.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2025</div><div className={styles.eraValue}>Tech decides it again</div><div className={styles.eraNote}>Kyle Dykhoff was officially awarded the 31st Little Dream and $30,100 after apparent winner Keith Tourville failed post-race inspection.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2026</div><div className={styles.eraValue}>A new record</div><div className={styles.eraNote}>Parker Anderson emerged from a 67-car field to win the 32nd Little Dream and a record $30,400 payday.</div></div>
        </div>
      </section>

      {repeatWinners.length > 0 && <section className={styles.section}>
        <div className={styles.kicker}>Repeat Winners</div>
        <div className={styles.sectionHead}><h2>The Drivers Who Have Won the Little Dream More Than Once</h2><div className={styles.sectionNote}>Eric Olson, Tim Johnson and Jim Randall share the top mark with three victories each.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name, wins]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{seasons.filter((row) => row.champion_name === name).map((row) => row.year).sort((a, b) => a - b).join(' • ')}</div></div>)}
        </div>
      </section>}

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Complete Winner Lineage</div>
        <div className={styles.sectionHead}><h2>Street Stock Little Dream Winners by Year</h2><div className={styles.sectionNote}>Every completed edition from the 1995 inaugural through the 32nd annual race in 2026.</div></div>
        <div className={styles.eraGrid}>
          {seasons.map((season) => <div key={season.id} className={styles.eraCard}>
            <div className={styles.eraYear}>{season.year}</div>
            <div className={styles.eraValue}>{season.champion_name || 'No winner recorded'}</div>
            <div className={styles.eraNote}>{season.season_name || eraFor(season.year)}</div>
          </div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Official Results Matter</div>
          <strong>The museum preserves the final technical-inspection result, not simply the first car across the finish line.</strong>
          <p>In 2024 Nick Traynor crossed the line first but was disqualified after inspection, elevating Cody Kummer to the official victory. In 2025 Keith Tourville was the apparent winner before post-race technical inspection moved Kyle Dykhoff to the official top spot. Both editions are stored using the final official winner.</p>
        </div>
      </section>

      <section className={styles.section} id="results">
        <div className={styles.kicker}>Preserved Race Results</div>
        <div className={styles.sectionHead}><h2>Little Dream Finishing Orders</h2><div className={styles.sectionNote}>The winner chronology is complete. Result depth expands where the museum or contemporary race reports preserve deeper fields.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live Little Dream result archive.</div> :
        <div className={styles.eventStack}>{orderedEvents.map((event) => {
          const year = yearBySeason.get(event.season_id || 0)
          const rows = [...event.SeriesEventResults].sort((a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year || 'Year unknown'} • Street Stock Little Dream</div><div className={styles.eventDate}>{formatDate(event.race_date)} • {event.track_name || 'Rice Lake Speedway'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Official Winner</span><strong className={styles.winnerName}>{event.winner_name || 'Not listed'}</strong></div>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.winnerBar}><span>Preserved result depth • {rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>{event.source_url ? <a href={event.source_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>{sourceLabel(event.source_url)} →</strong></a> : <strong>{sourceLabel(null)}</strong>}</div>
              <div className={styles.resultsScroller}>
                <div className={styles.compactHeader}><span>Pos.</span><span>Start</span><span>Driver</span><span>Car</span><span>Status</span></div>
                {rows.map((row) => <div key={row.id} className={styles.compactRow}><strong>{row.finishing_position ?? '—'}</strong><span>{row.starting_position ?? '—'}</span><strong>{row.driver_slug ? <Link href={'/drivers/' + row.driver_slug} style={{ color: 'inherit' }}>{row.driver_name}</Link> : row.driver_name}</strong><span>{row.car_number ?? '—'}</span><span>{row.status || '—'}</span></div>)}
              </div>
            </div>
          </article>
        })}</div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Archive Scope</div>
          <strong>The Little Dream now exists as a dedicated Special Event family rather than being buried among ordinary Rice Lake Street Stock results.</strong>
          <p>The collection preserves all 32 official winners from 1995–2026, links 17 recovered event dates directly to existing Rice Lake race records, carries forward available museum result depth, and adds complete published fields for the 2022, 2023 and 2024 editions. Earlier years remain winner-only where a deeper verified finishing order has not yet been recovered.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/rice-lake-speedway-wi" className={styles.footerLink}>Rice Lake Speedway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Open museum research tools →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
