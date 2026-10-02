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

function sourceLabel(url: string | null) {
  if (!url) return 'Museum research source'
  if (url.includes('thethirdturn.com')) return 'The Third Turn'
  if (url.includes('/newspapers/midwest-racing-news/')) return 'Midwest Racing News'
  if (url.includes('/programs/')) return 'Wilmot Speedway yearbook'
  return 'Race report'
}

function eraFor(year: number) {
  if (year === 1982) return 'Inaugural Open'
  if (year === 1983) return 'Three-race Open series'
  if (year <= 1986) return 'National open-competition era'
  if (year <= 1990) return 'Multi-round / IRA crossover era'
  if (year <= 1995) return 'Major single-event / All Star era'
  if (year <= 1998) return 'Kenosha County Fair era'
  return 'Homecoming revival'
}

export default async function WilmotOpenSprintsPage() {
  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('id')
    .eq('slug', 'wilmot-open-sprints')
    .maybeSingle()

  if (seriesError || !series) {
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Wilmot Open Sprints archive.</div></div></main>
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
      .eq('slug', 'wilmot-raceway-wi')
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
      {heroSrc ? <img src={heroSrc} alt="Wilmot Open Sprints at Wilmot Raceway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Wilmot Open Sprints</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Wilmot Open Sprints</h1>
        <p className={styles.tagline}>Wilmot Raceway • Wilmot, Wisconsin • 1982–1998; 2003</p>
        <p className={styles.intro}>Born in 1982 as an open-competition winged sprint showdown, the Wilmot Open brought the track's toughest regulars together with major traveling sprint-car stars. Bill Kojis won the inaugural 50-lapper, and the event evolved through three-race and two-round formats, All Star sanctioning, and its long association with the Kenosha County Fair before the original run ended after 1998. The Wilmot Open name returned for a Homecoming event in 2003.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/wilmot-raceway-wi" className={styles.button}>Open Wilmot Raceway Archive</Link>
          <Link href="/series/interstate-racing-association" className={styles.buttonGhost}>Open IRA Archive</Link>
          <Link href="#winners" className={styles.buttonGhost}>Winner Chronology</Link>
          <Link href="#results" className={styles.buttonGhost}>Preserved Results</Link>
        </div>
        <div className={styles.stats}>
          <Stat label="Documented Seasons" value={String(seasons.length)} />
          <Stat label="Different Lineage Winners" value={String(distinctWinners)} />
          <Stat label="Race Records" value={String(events.length)} />
          <Stat label="Preserved Result Rows" value={formatNumber(resultCount)} />
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The First Open • 1982</div>
            <strong>Bill Kojis won the race that started the Wilmot Open tradition.</strong>
            <p>Midwest Racing News described the August 28, 1982 event as the first annual Wilmot Winged Open Sprints. Kojis edged John Stevenson by less than a car length in the 50-lap A-main and collected the $2,000 winner's share.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>The Original Open Competition Sprint Showdown</div>
            <strong>Wilmot deliberately built the event around locals versus traveling stars.</strong>
            <p>A 1991 Wilmot advertisement used that exact description while inviting prior champions back for the 10th annual edition. Across the years the entry lists included Jack Hewitt, Dave Blaney, Doug Wolfgang, Danny Lasoski, Andy Hillenburg and other national names alongside the strongest Wilmot and IRA racers.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>How the Wilmot Open Changed Over Time</h2><div className={styles.sectionNote}>The archive preserves format changes instead of flattening them into one artificial annual template.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1982</div><div className={styles.eraValue}>The inaugural Open</div><div className={styles.eraNote}>Bill Kojis won the 50-lap first annual event over John Stevenson.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1983</div><div className={styles.eraValue}>Three-race series</div><div className={styles.eraNote}>Rick Ferkel, Doug Wolfgang and Sheldon Kinser won the three rounds; Ferkel was the overall series champion.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1984–1986</div><div className={styles.eraValue}>Hewitt to Blaney</div><div className={styles.eraNote}>Jack Hewitt won back-to-back Opens before Dave Blaney captured the fifth annual race in 1986.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1987–1990</div><div className={styles.eraValue}>Multi-round experiment</div><div className={styles.eraNote}>Official Wilmot records treat selected Sheboygan County Fair Park rounds and the Wilmot rounds as one Open series. The Wilmot round winners remain identified separately.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1991–1995</div><div className={styles.eraValue}>Major single-event era</div><div className={styles.eraNote}>The Open drew large national fields; the 1993 and 1994 editions were sanctioned by the All Star Circuit of Champions.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1996–1998</div><div className={styles.eraValue}>Kenosha County Fair tradition</div><div className={styles.eraNote}>John Tierney and Dave Moulis headline the official Wilmot Hall of Champions entries from the closing years of the original run.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1999–2002</div><div className={styles.eraValue}>No Open identified</div><div className={styles.eraNote}>Wilmot continued to stage major sprint events, but the track yearbooks and MRN use other event names during these seasons.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2003</div><div className={styles.eraValue}>Homecoming revival</div><div className={styles.eraNote}>Brian Kristan won the Wilmot Open for winged outlaw sprint cars during the October Homecoming / Fall Festival program.</div></div>
        </div>
      </section>

      {repeatWinners.length > 0 && <section className={styles.section}>
        <div className={styles.kicker}>Repeat Lineage Winners</div>
        <div className={styles.sectionHead}><h2>Drivers Listed More Than Once in the Official Winner Lineage</h2><div className={styles.sectionNote}>Season-level lineage; the 1983 three-race series is represented by overall champion Rick Ferkel.</div></div>
        <div className={styles.eraGrid}>
          {repeatWinners.map(([name, wins]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{seasons.filter((row) => row.champion_name === name).map((row) => row.year).sort((a, b) => a - b).join(' • ')}</div></div>)}
        </div>
      </section>}

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Official Winner Lineage</div>
        <div className={styles.sectionHead}><h2>Wilmot Open Winners by Year</h2><div className={styles.sectionNote}>Based primarily on Wilmot Speedway's Hall of Champions, cross-checked against contemporary Midwest Racing News.</div></div>
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
          <div className={styles.sourceLabel}>1998 Source Note</div>
          <strong>The official Wilmot Hall of Champions and the contemporary MRN fair-race report do not line up cleanly.</strong>
          <p>The Wilmot yearbook lists Dave Moulis as the 1998 Wilmot Open winner. MRN previewed the August 22 Kenosha County Fair program as the annual Wilmot Open Sprints Championship, but its post-race story identifies John Tierney as the Fair Championship winner after Moulis flipped on the first start. The museum therefore preserves Moulis in the official Open lineage but does not attach the August 22 finishing order to the Open archive until that discrepancy is resolved.</p>
        </div>
      </section>

      <section className={styles.section} id="results">
        <div className={styles.kicker}>Preserved Race Results</div>
        <div className={styles.sectionHead}><h2>Wilmot Open Finishing Orders</h2><div className={styles.sectionNote}>Result depth varies by year. Existing IRA data is inherited directly; MRN supplies full or partial fields for several additional editions.</div></div>
        {eventError ? <div className={styles.empty}>Unable to load the live Wilmot Open result archive.</div> :
        <div className={styles.eventStack}>{orderedEvents.map((event) => {
          const year = yearBySeason.get(event.season_id || 0)
          const rows = [...event.SeriesEventResults].sort((a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999))
          const eventLabel = year === 1983 ? 'Open Series Round ' + (event.race_number || '—') : 'Wilmot Open Sprints'
          return <article key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{year || 'Year unknown'} • {eventLabel}</div><div className={styles.eventDate}>{formatDate(event.race_date)} • {event.track_name || 'Wilmot Raceway'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Winner</span><strong className={styles.winnerName}>{event.winner_name || 'Not listed'}</strong></div>
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
          <strong>The Wilmot Open is now preserved as its own event family instead of being scattered across weekly Wilmot, IRA and All Star records.</strong>
          <p>The collection establishes the official 1982–1998 winner lineage, preserves all three 1983 rounds, links existing IRA result fields for 1987, 1988, 1990 and 1992, adds strong MRN finishing-order depth for 1991 and 1993, and records the 2003 Homecoming revival. The 1999–2002 gap is shown as a documented break rather than filled with unrelated Wilmot sprint races.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/wilmot-raceway-wi" className={styles.footerLink}>Wilmot Raceway<span>Open track archive →</span></Link>
        <Link href="/series/interstate-racing-association" className={styles.footerLink}>Interstate Racing Association<span>Open series archive →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
