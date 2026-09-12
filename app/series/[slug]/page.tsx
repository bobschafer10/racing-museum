import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRacePrograms } from '@/lib/race-programs'
import { supabase } from '@/lib/supabase'
import SeriesLogo from './SeriesLogo'
import styles from './series-profile.module.css'

const SUPABASE_PHOTO_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master'

export const revalidate = 300

type TrackRef = {
  id: number
  track_name: string
  slug: string
}

type PhotoRow = {
  file_name?: string | null
  track_slug?: string | null
  year?: string | number | null
}

export default async function SeriesProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: series, error: seriesError } = await supabase
    .from('Series')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (seriesError) console.error('Series error:', seriesError)
  if (!series) notFound()

  const [{ data: seasons }, { data: events }] = await Promise.all([
    supabase.from('SeriesSeasons').select('*').eq('series_id', series.id).order('year', { ascending: false }),
    supabase.from('SeriesEvents').select('*').eq('series_id', series.id).order('race_date', { ascending: false }),
  ])

  const seasonRows = seasons || []
  const eventRows = events || []
  const latestSeason = seasonRows[0] || null
  const latestSeasonEvents = latestSeason
    ? eventRows
        .filter((event: any) => Number(event.season_id) === Number(latestSeason.id))
        .sort((a: any, b: any) => String(a.race_date || '').localeCompare(String(b.race_date || '')))
    : []

  const { data: latestStandings } = latestSeason
    ? await supabase
        .from('SeriesStandings')
        .select('*')
        .eq('season_id', latestSeason.id)
        .order('finishing_position', { ascending: true })
    : { data: [] as any[] }

  const standingRows = latestStandings || []
  const latestStandingsGroups = groupStandingsByDivision(standingRows)
  const hasMultipleStandingsGroups = latestStandingsGroups.length > 1
  const previewRows = hasMultipleStandingsGroups
    ? latestStandingsGroups
        .map((group) => group.rows.find((row: any) => Number(row.finishing_position) === 1) || group.rows[0])
        .filter(Boolean)
    : standingRows.slice(0, 8)

  const trackIds = Array.from(
    new Set(eventRows.map((event: any) => Number(event.track_id)).filter((id: number) => Number.isFinite(id) && id > 0)),
  )

  const { data: tracks } = trackIds.length
    ? await supabase.from('Tracks').select('id, track_name, slug').in('id', trackIds)
    : { data: [] as TrackRef[] }

  const trackById = new Map((tracks || []).map((track: any) => [Number(track.id), track]))

  const associatedTracks = Array.from(
    new Map(
      eventRows
        .filter((event: any) => event.track_name)
        .map((event: any) => {
          const matched = trackById.get(Number(event.track_id))
          const trackName = String(event.track_name || matched?.track_name || 'Track TBD')
          const trackSlug = matched?.slug || `${slugify(trackName)}-wi`
          return [trackName.toLowerCase(), { track_name: trackName, track_slug: trackSlug }]
        }),
    ).values(),
  ).sort((a: any, b: any) => a.track_name.localeCompare(b.track_name))

  const winnerCounts = new Map<string, number>()
  for (const event of eventRows) {
    if (!event.winner_name) continue
    winnerCounts.set(event.winner_name, (winnerCounts.get(event.winner_name) || 0) + 1)
  }
  const winnerLeaders = Array.from(winnerCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const topWinner = winnerLeaders[0] || null

  const eventCountBySeason = new Map<number, number>()
  for (const event of eventRows) {
    const seasonId = Number(event.season_id)
    eventCountBySeason.set(seasonId, (eventCountBySeason.get(seasonId) || 0) + 1)
  }

  const decadeGroups = groupSeasonsByDecade(seasonRows)

  const regionOverrides: Record<string, string> = { 'badger-stock-car-tour': 'Upper Midwest' }
  const statusOverrides: Record<string, string> = { 'badger-stock-car-tour': 'Final' }
  const coverageOverrides: Record<string, string> = { 'badger-stock-car-tour': 'Complete' }
  const region = series.region || regionOverrides[slug] || 'Upper Midwest Archive'
  const archiveStatus = series.status || statusOverrides[slug] || (latestSeason && Number(latestSeason.year) >= 2026 ? 'Active' : 'Historic')
  const coverage = series.coverage || coverageOverrides[slug] || 'Growing archive'

  const firstYear = seasonRows.length ? Number(seasonRows[seasonRows.length - 1]?.year || series.first_year || 0) : Number(series.first_year || 0)
  const lastYear = seasonRows.length ? Number(seasonRows[0]?.year || series.last_year || 0) : Number(series.last_year || 0)
  const archiveSpan = firstYear && lastYear ? (firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`) : series.years_active || 'Researching'

  let heroBackground = ''
  const latestEvent = eventRows[0] || null
  const heroTrack = latestEvent ? trackById.get(Number(latestEvent.track_id)) : null
  if (heroTrack?.slug) {
    const candidateSlugs = Array.from(new Set([heroTrack.slug, baseTrackSlug(heroTrack.slug)]))
    const { data: heroPhotos } = await supabase
      .from('photos')
      .select('file_name, track_slug, year')
      .in('track_slug', candidateSlugs)
      .eq('needs_review', false)
      .order('year', { ascending: false, nullsFirst: false })
      .order('sequence', { ascending: true, nullsFirst: false })
      .limit(1)
    heroBackground = buildPhotoUrl((heroPhotos || [])[0] as PhotoRow | undefined)
  }
  if (!heroBackground && series.image_url) heroBackground = String(series.image_url)

  const allPrograms = await getRacePrograms()
  const relatedPrograms = allPrograms.filter((program) => program.series_slug === slug || program.track_slug === slug)

  const statCards = [
    { value: formatNumber(seasonRows.length), label: 'Seasons Archived' },
    { value: formatNumber(eventRows.length), label: 'Recorded Events' },
    { value: formatNumber(associatedTracks.length), label: 'Tracks Visited' },
    { value: formatNumber(winnerCounts.size), label: 'Feature Winners' },
    { value: archiveSpan, label: 'Series History' },
  ]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroBackground ? <img src={heroBackground} alt="" className={styles.heroImage} aria-hidden="true" /> : <div className={styles.heroFallback} />}
        <div className={styles.heroShade} />

        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span>
            <Link href="/series">Series</Link><span>›</span>
            <span>{series.series_name}</span>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.logoPanel}>
              <SeriesLogo slug={series.slug} seriesName={series.series_name} />
            </div>

            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>Upper Midwest Series Archive</span>
              <h1>{series.series_name}</h1>
              <div className={styles.metaLine}>
                {region}{series.years_active ? ` • ${series.years_active}` : ''}{archiveStatus ? ` • ${archiveStatus}` : ''}
              </div>
              <p className={styles.intro}>
                {series.description || 'Explore season-by-season championship history, race results, drivers, tracks, and preserved material from this racing series.'}
              </p>
              <div className={styles.actions}>
                {latestSeason ? <Link href={`/series/${slug}/${latestSeason.year}`} className={styles.primaryAction}>Explore {latestSeason.year} Season →</Link> : null}
                <Link href="/series" className={styles.secondaryAction}>Browse All Series</Link>
              </div>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {statCards.map((stat) => <div className={styles.statCard} key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
          </div>
        </div>
      </section>

      <nav className={styles.profileNav} aria-label="Series archive sections">
        <div>
          <a href="#overview" className={styles.activeNav}>Overview</a>
          <a href="#seasons">Seasons</a>
          {latestSeason ? <a href="#latest-season">Latest Season</a> : null}
          <a href="#tracks">Tracks</a>
          <a href="#programs">Programs</a>
        </div>
      </nav>

      <div className={styles.content} id="overview">
        <div className={styles.mainGrid}>
          <div className={styles.leftColumn}>
            <section id="seasons">
              <div className={styles.sectionHeading}>
                <div><span>Championship History</span><h2>Series Seasons</h2></div>
                <p>{seasonRows.length ? `${seasonRows.length} seasons currently indexed` : 'Season research underway'}</p>
              </div>
              <div className={styles.panel}>
                <div className={styles.panelBody}>
                  <p className={styles.instruction}>Choose a season for race results, final standings, champions, and event-by-event archive detail.</p>
                  {seasonRows.length === 0 ? (
                    <p className={styles.instruction}>No seasons have been added yet.</p>
                  ) : seasonRows.length <= 12 ? (
                    <div className={styles.seasonList}>
                      {seasonRows.map((season: any) => <SeasonRow key={season.id} slug={slug} season={season} raceCount={season.races || eventCountBySeason.get(Number(season.id)) || 0} />)}
                    </div>
                  ) : (
                    <div className={styles.decadeGrid}>
                      {decadeGroups.map((group) => (
                        <div className={styles.decadeCard} key={group.decade}>
                          <div className={styles.decadeTitle}>{group.decade}s</div>
                          <div className={styles.yearChips}>
                            {group.seasons.map((season: any) => (
                              <Link key={season.id} href={`/series/${slug}/${season.year}`} className={styles.yearChip} title={`${season.year}${season.champion_name ? ` — Champion: ${season.champion_name}` : ''}`}>{season.year}</Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {latestSeason ? (
              <section id="latest-season">
                <div className={styles.sectionHeading}>
                  <div><span>Latest Archive Activity</span><h2>{latestSeason.year} Season Snapshot</h2></div>
                  <p>{latestSeasonEvents.length} recorded events</p>
                </div>
                <div className={styles.panel}>
                  <div className={styles.panelBody}>
                    <div className={styles.snapshotHeader}>
                      <div>
                        <div className={styles.snapshotLabel}>{hasMultipleStandingsGroups ? 'Division Champions' : 'Champion'}</div>
                        <div className={styles.snapshotChampion}>
                          {hasMultipleStandingsGroups ? `${latestStandingsGroups.length} divisions` : latestSeason.champion_name || previewRows[0]?.driver_name || 'Champion TBD'}
                        </div>
                      </div>
                      <div className={styles.snapshotMeta}>{latestSeason.races || latestSeasonEvents.length || 0} recorded races</div>
                    </div>

                    {latestSeasonEvents.length > 0 ? (
                      <div className={styles.eventGrid}>
                        {latestSeasonEvents.slice(0, 6).map((event: any) => (
                          <Link key={event.id} href={`/series/${slug}/${latestSeason.year}/${event.race_number}`} className={styles.eventCard}>
                            <div className={styles.eventRaceNo}>Race #{event.race_number}</div>
                            <div className={styles.eventTrack}>{event.track_name || 'Track TBD'}</div>
                            <div className={styles.eventDate}>{formatShortDate(event.race_date)}</div>
                            <div className={styles.eventWinner}>{event.winner_name ? `Winner: ${event.winner_name}` : 'Winner TBD'}</div>
                            <div className={styles.viewDetails}>View Full Results →</div>
                          </Link>
                        ))}
                      </div>
                    ) : <p className={styles.instruction}>No events have been added for this season yet.</p>}

                    <div className={styles.panelAction}><Link href={`/series/${slug}/${latestSeason.year}`} className={styles.textLink}>View Full {latestSeason.year} Season →</Link></div>
                  </div>
                </div>
              </section>
            ) : null}

            {latestSeason && standingRows.length > 0 ? (
              <section>
                <div className={styles.sectionHeading}>
                  <div><span>Championship Chase</span><h2>{latestSeason.year} Standings Preview</h2></div>
                  {hasMultipleStandingsGroups ? <p>Division champions</p> : null}
                </div>
                <div className={styles.panel}>
                  <div className={styles.standingsHeader}><span>Pos</span><span>Driver</span><span>Pts</span><span>Wins</span></div>
                  {previewRows.map((row: any) => (
                    <div className={styles.standingsRow} key={row.id}>
                      <span>{row.position_label || row.finishing_position || '—'}</span>
                      <span className={styles.standingsDriver}>{hasMultipleStandingsGroups && row.source_division_name ? `${row.source_division_name} — ` : ''}{row.driver_name}</span>
                      <span>{row.points || '—'}</span>
                      <span>{row.wins || '—'}</span>
                    </div>
                  ))}
                  <div className={styles.panelBody}><div className={styles.panelAction}><Link href={`/series/${slug}/${latestSeason.year}`} className={styles.textLink}>View Complete Standings →</Link></div></div>
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.rightColumn}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>Series Archive Summary</div>
              <div className={styles.panelBody}>
                <SummaryRow label="Archive Status" value={archiveStatus} />
                <SummaryRow label="Coverage" value={coverage} />
                <SummaryRow label="Seasons" value={formatNumber(seasonRows.length)} />
                <SummaryRow label="Recorded Events" value={formatNumber(eventRows.length)} />
                <SummaryRow label="Tracks Visited" value={formatNumber(associatedTracks.length)} />
                <SummaryRow label="Different Winners" value={formatNumber(winnerCounts.size)} />
                {topWinner ? <SummaryRow label="Most Recorded Wins" value={`${topWinner[0]} — ${topWinner[1]}`} /> : null}
                {latestSeason?.champion_name ? <SummaryRow label={`${latestSeason.year} Champion`} value={latestSeason.champion_name} /> : null}
              </div>
            </div>

            {winnerLeaders.length > 0 ? (
              <div className={styles.panel}>
                <div className={styles.panelHeader}>Leading Feature Winners</div>
                <div className={styles.panelBody}>
                  <div className={styles.winnerList}>{winnerLeaders.slice(0, 8).map(([name, wins]) => <div className={styles.winnerRow} key={name}><span>{name}</span><strong>{wins}</strong></div>)}</div>
                </div>
              </div>
            ) : null}

            <div className={styles.panel} id="tracks">
              <div className={styles.panelHeader}>Associated Tracks</div>
              <div className={styles.panelBody}>
                {associatedTracks.length > 0 ? (
                  <>
                    <div className={styles.trackGrid}>
                      {associatedTracks.slice(0, 12).map((track: any) => (
                        <Link key={`${track.track_name}-${track.track_slug}`} href={`/tracks/${track.track_slug}`} className={styles.trackTile}>
                          <img src={`/logos/tracks/${track.track_slug}.jpg`} alt="" aria-hidden="true" />
                          <div className={styles.trackName}>{track.track_name}</div>
                        </Link>
                      ))}
                    </div>
                    {associatedTracks.length > 12 ? <p className={styles.smallNote}>Showing 12 of {associatedTracks.length} recorded tracks.</p> : null}
                  </>
                ) : <p className={styles.instruction}>No associated tracks yet.</p>}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>Explore the Museum</div>
              <div className={styles.panelBody}>
                <div className={styles.exploreGrid}>
                  <Link href="/drivers" className={styles.exploreCard}>Drivers</Link>
                  <Link href="/tracks" className={styles.exploreCard}>Tracks</Link>
                  <Link href="/photos" className={styles.exploreCard}>Photos</Link>
                  <Link href="/media" className={styles.exploreCard}>Media</Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section className={styles.programSection} id="programs">
        <div className={styles.programHeader}><span className={styles.eyebrow}>Preserved Print Material</span><h2>Related Race Programs</h2><p>Yearbooks and printed publications connected to this racing series.</p></div>
        {relatedPrograms.length === 0 ? (
          <div className={styles.emptyPanel}>No related race programs have been linked to this series yet.</div>
        ) : (
          <div className={styles.programGrid}>
            {relatedPrograms.map((program) => (
              <article className={styles.programCard} key={program.slug}>
                <img src={program.coverImage || ''} alt={program.title} className={styles.programImage} />
                <div className={styles.programBody}><div className={styles.programMeta}>{program.year}</div><h3 className={styles.programTitle}>{program.title}</h3><Link href={`/media/race-programs/${program.slug}`} className={styles.programButton}>View Artifact →</Link></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className={styles.summaryRow}><span className={styles.summaryLabel}>{label}</span><span className={styles.summaryValue}>{value}</span></div>
}

function SeasonRow({ slug, season, raceCount }: { slug: string; season: any; raceCount: number }) {
  return (
    <Link href={`/series/${slug}/${season.year}`} className={styles.seasonRow}>
      <span className={styles.seasonYear}>{season.year}</span>
      <span><strong>{season.champion_name || 'Championship archive'}</strong>{season.champion_name ? ' — Champion' : ''}</span>
      <span className={styles.seasonRaceCount}>{raceCount ? `${raceCount} races` : 'Standings archived'}</span>
      <span className={styles.seasonArrow}>→</span>
    </Link>
  )
}

function groupSeasonsByDecade(seasons: any[]) {
  const groups = new Map<number, any[]>()
  for (const season of seasons) {
    const decade = Math.floor(Number(season.year) / 10) * 10
    if (!groups.has(decade)) groups.set(decade, [])
    groups.get(decade)!.push(season)
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([decade, group]) => ({ decade, seasons: group.sort((a, b) => Number(b.year) - Number(a.year)) }))
}

function groupStandingsByDivision(rows: any[]) {
  const groups = new Map<string, any[]>()
  for (const row of rows) {
    const label = String(row.source_division_name || '').trim() || 'Overall Standings'
    const groupRows = groups.get(label) || []
    groupRows.push(row)
    groups.set(label, groupRows)
  }
  return Array.from(groups.entries()).map(([label, groupRows]) => ({ label, rows: groupRows }))
}

function slugify(value?: string | null) {
  if (!value) return ''
  return value.toLowerCase().replace(/,/g, '').replace(/\./g, '').replace(/\s+/g, '-')
}

function baseTrackSlug(slug: string) {
  return slug.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks|ky|sc|sd|ont)$/i, '')
}

function buildPhotoUrl(photo?: PhotoRow | null) {
  if (!photo?.file_name) return ''
  const track = String(photo.track_slug || 'unknown-track')
  const year = String(photo.year || 'unknown-year')
  return `${SUPABASE_PHOTO_BASE}/${track}/${year}/${encodeURIComponent(String(photo.file_name))}`
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Date TBD'
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('en-US')
}