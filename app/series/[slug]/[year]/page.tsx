import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SeriesLogo from '../SeriesLogo'
import TrackLogo from '../../../tracks/[slug]/TrackLogo'
import styles from './seasonPage.module.css'

export const revalidate = 300

type PhotoRow = {
  file_name?: string | null
  track_slug?: string | null
  year?: string | number | null
}

export default async function SeriesSeasonPage({
  params,
}: {
  params: Promise<{ slug: string; year: string }>
}) {
  const { slug, year } = await params
  const seasonYear = Number(year)

  const { data: series } = await supabase
    .from('Series')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!series || Number.isNaN(seasonYear)) notFound()

  const { data: season } = await supabase
    .from('SeriesSeasons')
    .select('*')
    .eq('series_id', series.id)
    .eq('year', seasonYear)
    .maybeSingle()

  if (!season) notFound()

  const [{ data: events }, { data: standings }] = await Promise.all([
    supabase
      .from('SeriesEvents')
      .select('*')
      .eq('season_id', season.id)
      .order('race_number', { ascending: true }),
    supabase
      .from('SeriesStandings')
      .select('*')
      .eq('season_id', season.id)
      .order('finishing_position', { ascending: true }),
  ])

  const eventRows = events || []
  const standingRows = standings || []

  const standingDriverIds = Array.from(
    new Set(
      standingRows
        .map((row: any) => Number(row.driver_id))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    ),
  )

  const { data: standingDrivers } = standingDriverIds.length
    ? await supabase
        .from('Drivers')
        .select('driver_id, slug')
        .in('driver_id', standingDriverIds)
    : { data: [] }

  const driverSlugById = new Map(
    (standingDrivers || []).map((driver: any) => [Number(driver.driver_id), driver.slug]),
  )

  const uniqueTrackEvents = Array.from(
    new Map(
      eventRows
        .filter((event: any) => event.track_id && event.track_name)
        .map((event: any) => [Number(event.track_id), event]),
    ).values(),
  ) as any[]

  const associatedTrackIds = uniqueTrackEvents.map((track: any) => Number(track.track_id))
  let canonicalTracks: any[] = []
  if (associatedTrackIds.length) {
    const { data } = await supabase
      .from('Tracks')
      .select('id, track_id, track_name, slug')
      .in('track_id', associatedTrackIds)
    canonicalTracks = data || []
  }

  const trackById = new Map<number, any>()
  for (const track of canonicalTracks) {
    trackById.set(Number(track.track_id), track)
    trackById.set(Number(track.id), track)
  }

  const trackCards = uniqueTrackEvents.map((event: any) => {
    const canonical = trackById.get(Number(event.track_id))
    const trackSlug = canonical?.slug || event.track_slug || slugify(event.track_name)
    const raceCount = eventRows.filter((row: any) => Number(row.track_id) === Number(event.track_id)).length
    return {
      track_id: event.track_id,
      track_name: event.track_name,
      track_slug: trackSlug,
      race_count: raceCount,
    }
  })

  const winnerCounts = new Map<string, number>()
  eventRows.forEach((event: any) => {
    if (!event.winner_name) return
    winnerCounts.set(event.winner_name, (winnerCounts.get(event.winner_name) || 0) + 1)
  })
  const winnerLeaders = Array.from(winnerCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const topWinner = winnerLeaders[0] || null

  const championRow = season.champion_driver_id
    ? standingRows.find((row: any) => Number(row.driver_id) === Number(season.champion_driver_id))
    : standingRows[0]
  const championSlug = championRow
    ? driverSlugById.get(Number(championRow.driver_id)) || slugify(championRow.driver_name)
    : season.champion_name
      ? slugify(season.champion_name)
      : ''

  let heroPhoto = ''
  const photoTrackSlugs = Array.from(
    new Set(
      trackCards.flatMap((track) => [track.track_slug, baseTrackSlug(track.track_slug)]).filter(Boolean),
    ),
  )

  if (photoTrackSlugs.length) {
    const { data: exactPhotos } = await supabase
      .from('photos')
      .select('file_name, track_slug, year, sequence, needs_review')
      .in('track_slug', photoTrackSlugs)
      .eq('year', String(seasonYear))
      .eq('needs_review', false)
      .order('sequence', { ascending: true, nullsFirst: false })
      .limit(1)

    let selectedPhoto = (exactPhotos || [])[0] as PhotoRow | undefined
    if (!selectedPhoto) {
      const { data: fallbackPhotos } = await supabase
        .from('photos')
        .select('file_name, track_slug, year, sequence, needs_review')
        .in('track_slug', photoTrackSlugs)
        .eq('needs_review', false)
        .order('year', { ascending: false, nullsFirst: false })
        .order('sequence', { ascending: true, nullsFirst: false })
        .limit(1)
      selectedPhoto = (fallbackPhotos || [])[0] as PhotoRow | undefined
    }
    heroPhoto = photoUrl(selectedPhoto)
  }

  const statRaces = eventRows.length || Number(season.races || 0)
  const seasonRange = eventRows.length
    ? `${formatShortDate(eventRows[0]?.race_date)} – ${formatShortDate(eventRows[eventRows.length - 1]?.race_date)}`
    : `${seasonYear} season archive`

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroPhoto ? (
          <img src={heroPhoto} alt={`${seasonYear} ${series.series_name} racing`} className={styles.heroImage} />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroShade} />

        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span>
            <Link href="/series">Series</Link><span>›</span>
            <Link href={`/series/${slug}`}>{series.series_name}</Link><span>›</span>
            <span>{seasonYear}</span>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.logoPanel}>
              <SeriesLogo slug={series.slug} seriesName={series.series_name} />
            </div>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>Series Season Archive</div>
              <h1>{seasonYear} {series.series_name}</h1>
              <div className={styles.heroMeta}>
                {season.champion_name ? `Champion: ${season.champion_name}` : 'Championship season in progress'}
              </div>
              <p className={styles.heroDescription}>
                Explore the complete {seasonYear} season schedule, race winners, final point standings, associated tracks, and preserved source material for {series.series_name}.
              </p>
              <div className={styles.heroActions}>
                <Link href={`/series/${slug}`} className={styles.secondaryAction}>Series Overview</Link>
                {eventRows[0] && (
                  <Link href={`/series/${slug}/${seasonYear}/${eventRows[0].race_number}`} className={styles.primaryAction}>Open Race #1</Link>
                )}
              </div>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <Stat value={String(statRaces)} label="Recorded Races" />
            <Stat value={String(trackCards.length)} label="Tracks Visited" />
            <Stat value={String(winnerCounts.size)} label="Different Winners" />
            <Stat value={String(standingRows.length)} label="Drivers in Standings" />
            <Stat value={season.margin || seasonRange} label={season.margin ? 'Championship Margin' : 'Season Span'} />
          </div>
        </div>
      </section>

      <nav className={styles.profileNav} aria-label="Season archive navigation">
        <div className={styles.navInner}>
          <a href="#snapshot">Overview</a>
          <a href="#schedule">Race Schedule</a>
          <a href="#standings">Standings</a>
          <a href="#tracks">Tracks</a>
          <a href="#sources">Sources</a>
        </div>
      </nav>

      <div className={styles.content}>
        <section id="snapshot" className={styles.section}>
          <SectionHeader kicker="Season Snapshot" title={`${seasonYear} Championship Archive`} note={seasonRange} />
          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotCard}>
              <span>Season Champion</span>
              <strong>
                {season.champion_name && championSlug ? (
                  <Link href={`/drivers/${championSlug}`} className={styles.driverLink}>{season.champion_name}</Link>
                ) : season.champion_name || 'Champion TBD'}
              </strong>
              <small>{season.margin ? `Championship margin: ${season.margin}` : 'Final championship record preserved in the museum archive.'}</small>
            </div>
            <div className={styles.snapshotCard}>
              <span>Most Recorded Wins</span>
              <strong>{topWinner ? topWinner[0] : season.most_wins_text || 'Research in progress'}</strong>
              <small>{topWinner ? `${topWinner[1]} ${topWinner[1] === 1 ? 'victory' : 'victories'} in the recorded schedule` : season.most_wins_text || 'Winner totals will appear as race records are added.'}</small>
            </div>
            <div className={styles.snapshotCard}>
              <span>Season Coverage</span>
              <strong>{statRaces ? `${statRaces} race${statRaces === 1 ? '' : 's'}` : 'Archive build'}</strong>
              <small>{trackCards.length ? `${trackCards.length} different track${trackCards.length === 1 ? '' : 's'} represented` : 'Track coverage is still being researched.'}</small>
            </div>
          </div>
        </section>

        <section id="schedule" className={styles.section}>
          <SectionHeader kicker="Race-by-Race Archive" title="Race Schedule & Winners" note={`${eventRows.length} recorded events`} />
          {eventRows.length ? (
            <div className={styles.scheduleGrid}>
              {eventRows.map((event: any) => (
                <Link key={event.id} href={`/series/${slug}/${seasonYear}/${event.race_number}`} className={styles.raceCard}>
                  <div className={styles.raceNo}>#{event.race_number}</div>
                  <div>
                    <div className={styles.raceTrack}>{event.track_name || 'Track TBD'}</div>
                    <div className={styles.raceDate}>{formatDate(event.race_date)}</div>
                    <div className={styles.raceWinner}>Winner: <strong>{event.winner_name || 'TBD'}</strong></div>
                  </div>
                  <div className={styles.raceArrow}>›</div>
                </Link>
              ))}
            </div>
          ) : <div className={styles.emptyState}>No race schedule has been added for this season yet.</div>}
        </section>

        <section id="standings" className={styles.section}>
          <SectionHeader kicker="Championship History" title="Final Point Standings" note={`${standingRows.length} drivers listed`} />
          {standingRows.length ? (
            <div className={styles.tableWrap}>
              <div className={styles.standingsTable}>
                <div className={styles.standingsHeader}>
                  <span>Pos</span><span>Driver</span><span>Points</span><span>Starts</span><span>Wins</span><span>Top 5</span><span>Top 10</span>
                </div>
                {standingRows.map((row: any) => {
                  const driverSlug = driverSlugById.get(Number(row.driver_id)) || slugify(row.driver_name)
                  return (
                    <div key={row.id} className={styles.standingsRow}>
                      <span className={styles.standingsPos}>{row.finishing_position ?? '—'}</span>
                      <Link href={`/drivers/${driverSlug}`} className={styles.driverLink}>{row.driver_name || 'Unknown driver'}</Link>
                      <span className={styles.points}>{row.points || '—'}</span>
                      <span>{row.starts || '—'}</span>
                      <span>{row.wins || '—'}</span>
                      <span>{row.top5 || '—'}</span>
                      <span>{row.top10 || '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : <div className={styles.emptyState}>Final standings have not been added for this season yet.</div>}
        </section>

        <section id="tracks" className={styles.section}>
          <SectionHeader kicker="Season Venues" title="Associated Tracks" note={`${trackCards.length} tracks`} />
          {trackCards.length ? (
            <div className={styles.trackGrid}>
              {trackCards.map((track) => (
                <Link key={String(track.track_id)} href={`/tracks/${track.track_slug}`} className={styles.trackCard}>
                  <div className={styles.trackLogoWrap}>
                    <TrackLogo slug={track.track_slug} trackName={track.track_name} />
                  </div>
                  <div className={styles.trackCardBody}>
                    <strong>{track.track_name}</strong>
                    <span>{track.race_count} {track.race_count === 1 ? 'race' : 'races'} this season</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <div className={styles.emptyState}>No associated tracks have been linked to this season yet.</div>}
        </section>

        <section id="sources" className={styles.section}>
          <SectionHeader kicker="Research Record" title="Source Attribution" note="Museum research trail" />
          <div className={styles.sourcePanel}>
            <p>{series.attribution_text || 'Historical series data is being compiled from archival sources and museum research.'}</p>
            {season.source_url && <p>Source: <a href={season.source_url}>The Third Turn season page</a></p>}
          </div>
        </section>

        <div className={styles.footerLinks}>
          <Link href={`/series/${slug}`}><strong>Series Overview</strong><span>Return to full series archive →</span></Link>
          <Link href="/series"><strong>Series Directory</strong><span>Browse all archived series →</span></Link>
          <Link href="/research"><strong>Research Center</strong><span>Explore museum research tools →</span></Link>
        </div>
      </div>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className={styles.statCard}><strong>{value}</strong><span>{label}</span></div>
}

function SectionHeader({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className={styles.sectionHeader}>
      <div><div className={styles.sectionKicker}>{kicker}</div><h2>{title}</h2></div>
      {note ? <div className={styles.sectionNote}>{note}</div> : null}
    </div>
  )
}

function photoUrl(photo?: PhotoRow) {
  if (!photo?.file_name || !photo.track_slug) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return ''
  const photoYear = String(photo.year || 'unknown-year')
  return `${baseUrl}/storage/v1/object/public/media/photos/master/${photo.track_slug}/${photoYear}/${encodeURIComponent(photo.file_name)}`
}

function baseTrackSlug(value: string) {
  return value.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks|ky|sc|sd|ont)$/i, '')
}

function slugify(value?: string | null) {
  if (!value) return ''
  return value.toLowerCase().replace(/,/g, '').replace(/\./g, '').replace(/\s+/g, '-')
}

function formatDate(value?: string | null) {
  if (!value) return 'Date TBD'
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Date TBD'
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
