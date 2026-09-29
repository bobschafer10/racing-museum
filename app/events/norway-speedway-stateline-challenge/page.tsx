import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type SeasonRow = {
  id: number
  year: number
  season_name: string | null
  races: number | null
  champion_name: string | null
  champion_driver_id: number | null
}

type EventRow = {
  id: number
  season_id: number | null
  race_date: string | null
  winner_name: string | null
  winner_driver_id: number | null
  source_url: string | null
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

export default async function StatelineChallengePage() {
  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('id')
    .eq('slug', 'norway-speedway-stateline-challenge')
    .maybeSingle()

  if (seriesError || !series) {
    return <main className={styles.page}><div className={styles.content}><div className={styles.empty}>Unable to load the Norway Speedway Stateline Challenge archive.</div></div></main>
  }

  const [{ data: seasonData }, { data: eventData, error: eventError }, { data: heroRows }] = await Promise.all([
    supabase
      .from('SeriesSeasons')
      .select('id,year,season_name,races,champion_name,champion_driver_id')
      .eq('series_id', series.id)
      .order('year', { ascending: true }),
    supabase
      .from('SeriesEvents')
      .select('id,season_id,race_date,winner_name,winner_driver_id,source_url')
      .eq('series_id', series.id)
      .order('season_id', { ascending: true }),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug', 'norway-speedway-mi')
      .eq('photo_rank', 1),
  ])

  const seasons = (seasonData || []) as SeasonRow[]
  const events = (eventData || []) as EventRow[]
  const heroSrc = (heroRows || [])[0]?.image_url || ''
  const eventBySeason = new Map(events.map((event) => [event.season_id, event]))

  const winnerCounts = new Map<string, number>()
  for (const event of events) {
    if (!event.winner_name) continue
    winnerCounts.set(event.winner_name, (winnerCounts.get(event.winner_name) || 0) + 1)
  }
  const repeatWinners = [...winnerCounts.entries()]
    .filter(([, wins]) => wins > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const ordered = [...seasons].sort((a, b) => b.year - a.year)

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroSrc ? <img src={heroSrc} alt="Norway Speedway Stateline Challenge" className={styles.heroImage} /> : null}
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Stateline Challenge</span></div>
          <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
          <h1 className={styles.title}>Norway Speedway Stateline Challenge</h1>
          <p className={styles.tagline}>Upper Michigan vs. Wisconsin — a Norway Speedway Late Model tradition since 1981</p>
          <p className={styles.intro}>The Stateline Challenge is Norway Speedway&apos;s annual marquee Late Model event at the Dickinson County Fairgrounds in Norway, Michigan. The Museum preserves the winner chronology from Dick Trickle&apos;s 1981 victory through John Beale&apos;s 2026 win.</p>
          <div className={styles.heroActions}><Link href="/tracks/norway-speedway-mi" className={styles.button}>Open Norway Speedway</Link><Link href="/series/norway-speedway-stateline-challenge" className={styles.buttonGhost}>Open Research Archive</Link><Link href="#history" className={styles.buttonGhost}>View Every Edition</Link></div>
          <div className={styles.stats}><Stat label="Seasons Indexed" value={String(seasons.length)} /><Stat label="Races Preserved" value={String(events.length)} /><Stat label="Different Winners" value={String(winnerCounts.size)} /><Stat label="History" value="1981–2026" /></div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.twoCol}>
            <div className={styles.sourceCard}>
              <div className={styles.sourceLabel}>The Tradition</div>
              <strong>A border-country Late Model showcase at Norway Speedway.</strong>
              <p>For more than four decades, the Stateline Challenge has brought Upper Michigan and Wisconsin Late Model racers together at Norway. Its winners include Dick Trickle, Kent Pearson, Scott Hansen, Matt Kenseth, Kevin Cywinski, Jamie Iverson, Johnny Sauter, Justin Mondeik and many other regional standouts.</p>
            </div>
            <div className={styles.sourceCard}>
              <div className={styles.sourceLabel}>Archive Notes</div>
              <strong>Winner chronology preserved; full-result recovery continues.</strong>
              <p>No Stateline Challenge was held in 2008, 2009 or 2010. Norway&apos;s archive identifies 2014 as a TUNDRA race rather than a Stateline Challenge edition. The current official Norway archive lists Dale Peterson as the 2000 winner, while older published winner lists identify Wayne Breitenfeldt; the Museum flags that year as a source discrepancy rather than silently choosing between the conflicting historical lists.</p>
              <a href="https://norwayspeedway.com/track-archives" target="_blank" rel="noreferrer" style={{ color: '#d0ad63' }}>Norway Speedway Track Archives →</a>
            </div>
          </div>
        </section>

        {repeatWinners.length ? (
          <section className={styles.section}>
            <div className={styles.kicker}>Multiple-Time Winners</div>
            <div className={styles.sectionHead}><h2>Drivers With More Than One Stateline Victory</h2><div className={styles.sectionNote}>Counts are based on the Museum&apos;s preserved annual winner chronology.</div></div>
            <div className={styles.eraGrid}>
              {repeatWinners.map(([name, wins]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>Stateline Challenge victories</div></div>)}
            </div>
          </section>
        ) : null}

        <section className={styles.section} id="history">
          <div className={styles.kicker}>Complete Winner Chronology</div>
          <div className={styles.sectionHead}><h2>1981–2026 Year-by-Year Archive</h2><div className={styles.sectionNote}>Winner-only years remain winner-only until a reliable full finishing order is recovered.</div></div>
          {eventError ? <div className={styles.empty}>Unable to load the live Stateline Challenge archive.</div> :
          <div className={styles.eventStack}>
            {ordered.map((season) => {
              const event = eventBySeason.get(season.id)
              const noRace = (season.races || 0) === 0
              const yearNote = season.year === 2014 ? 'TUNDRA race — no Stateline Challenge' : noRace ? 'No Race' : 'Winner chronology preserved'
              const winner = event?.winner_name || season.champion_name
              const dateText = formatDate(event?.race_date || null)
              return <article key={season.id} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <div><div className={styles.eventYear}>{season.year}</div><div className={styles.eventDate}>{dateText || yearNote}</div></div>
                  <div className={styles.winnerBlock}><span className={styles.winnerLabel}>{noRace ? 'Edition Status' : 'Race Winner'}</span><strong className={styles.winnerName}>{noRace ? yearNote : (winner || 'Not listed')}</strong></div>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.winnerBar}><span>{season.year === 2000 ? 'Official Norway archive value — conflicting older winner list noted above' : yearNote}</span>{event?.source_url ? <a href={event.source_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><strong>Source →</strong></a> : <strong>Norway Speedway archive</strong>}</div>
                  {!noRace ? <div className={styles.winnerOnly}>Full finishing order has not yet been added to the Museum archive for this edition.</div> : null}
                </div>
              </article>
            })}
          </div>}
        </section>

        <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/norway-speedway-mi" className={styles.footerLink}>Norway Speedway<span>Open track archive →</span></Link><Link href="/series/norway-speedway-stateline-challenge" className={styles.footerLink}>Research Archive<span>Open series-style data view →</span></Link></div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
