import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TrackLogo from '../TrackLogo'
import profileStyles from '../track-profile.module.css'
import styles from '../archive-list.module.css'

export const revalidate = 300

type Track = {
  track_name: string
  slug: string
  city?: string | null
  state?: string | null
  first_year?: number | null
  last_year?: number | null
  surface_type?: string | null
  configuration?: string | null
  image_url?: string | null
}

type WinnerRow = {
  track_slug?: string | null
  track_name?: string | null
  driver_name?: string | null
  driver_slug?: string | null
  win_count?: number | string | null
}

type YearSummary = {
  result_year?: number | string | null
}

function formatNumber(value?: number | string | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function buildHref(slug: string, page: number, q: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return `/tracks/${slug}/feature-winners${query ? `?${query}` : ''}#leaderboard`
}

export default async function TrackFeatureWinnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ q?: string; page?: string }>
}) {
  const { slug } = await params
  const queryParams = (await searchParams) ?? {}
  const searchText = (queryParams.q ?? '').trim()

  const [{ data: track }, { data: winners }, { count: featureWinsCount }, { data: years }] =
    await Promise.all([
      supabase
        .from('track_profile_view_v3')
        .select('track_name,slug,city,state,first_year,last_year,surface_type,configuration,image_url')
        .eq('slug', slug)
        .maybeSingle<Track>(),
      supabase
        .from('track_top_winners_view')
        .select('track_slug,track_name,driver_name,driver_slug,win_count')
        .eq('track_slug', slug)
        .order('win_count', { ascending: false })
        .limit(1000),
      supabase
        .from('global_results_view')
        .select('*', { count: 'exact', head: true })
        .eq('track_slug', slug)
        .eq('finishing_position', 1),
      supabase
        .from('track_results_year_summary_view')
        .select('result_year')
        .eq('track_slug', slug)
        .order('result_year', { ascending: false }),
    ])

  if (!track) notFound()

  const rows = ((winners ?? []) as WinnerRow[]).map((row) => ({
    ...row,
    win_count: Number(row.win_count || 0),
  }))

  const normalizedSearch = searchText.toLowerCase()
  const filteredRows = rows.filter((row) => {
    if (!normalizedSearch) return true
    return `${row.driver_name || ''} ${row.driver_slug || ''}`.toLowerCase().includes(normalizedSearch)
  })

  const pageSize = 75
  const requestedPage = Math.max(1, Number.parseInt(queryParams.page || '1', 10) || 1)
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(requestedPage, pageCount)
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const yearValues = ((years ?? []) as YearSummary[])
    .map((row) => Number(row.result_year || 0))
    .filter(Boolean)
  const newestYear = yearValues[0] || track.last_year || null
  const oldestYear = yearValues[yearValues.length - 1] || track.first_year || null
  const archiveSpan = oldestYear && newestYear
    ? oldestYear === newestYear ? String(oldestYear) : `${oldestYear}–${newestYear}`
    : 'Growing archive'

  const leader = rows[0] || null
  const podium = rows.slice(0, 3)
  const locationText = [track.city, track.state].filter(Boolean).join(', ') || 'Location not yet documented'
  const operatingSpan = track.first_year && track.last_year
    ? track.first_year === track.last_year ? String(track.first_year) : `${track.first_year}–${track.last_year}`
    : track.first_year ? `${track.first_year}–Present` : null
  const heroUrl = track.image_url || ''

  const stats = [
    { icon: '🏆', value: formatNumber(featureWinsCount), label: 'Recorded Feature Wins' },
    { icon: '◉', value: formatNumber(rows.length), label: 'Winning Drivers' },
    { icon: '★', value: leader ? formatNumber(leader.win_count) : '—', label: leader?.driver_name ? `${leader.driver_name} · Leading Total` : 'Leading Total' },
    { icon: '▦', value: archiveSpan, label: 'Results Archive' },
  ]

  return (
    <main className={profileStyles.page}>
      <section className={profileStyles.hero}>
        {heroUrl ? (
          <img src={heroUrl} alt={`Racing at ${track.track_name}`} className={profileStyles.heroImage} />
        ) : (
          <div className={profileStyles.heroFallback} aria-hidden="true" />
        )}

        <div className={profileStyles.heroInner}>
          <nav className={profileStyles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>›</span>
            <Link href="/tracks">Tracks</Link><span>›</span>
            <Link href={`/tracks/${slug}`}>{track.track_name}</Link><span>›</span>
            <span>Feature Winners</span>
          </nav>

          <div className={profileStyles.heroGrid}>
            <div className={profileStyles.logoFrame}>
              <TrackLogo slug={slug} trackName={track.track_name} />
            </div>
            <div>
              <p className={profileStyles.eyebrow}>Complete Track Leaderboard</p>
              <h1 className={profileStyles.title}>{track.track_name}</h1>
              <p className={profileStyles.location}>{locationText}</p>
            </div>
            <p className={profileStyles.heroIntro}>
              Explore every driver currently credited with a recorded feature victory at {track.track_name}, ranked by discovered wins in the museum database.
            </p>
            <div className={profileStyles.heroFacts}>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>●</span>{locationText}</span>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>🏆</span>{formatNumber(featureWinsCount)} recorded wins</span>
              {track.configuration ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>⬭</span>{track.configuration}</span> : null}
              {track.surface_type ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>⚑</span>{track.surface_type}</span> : null}
              {operatingSpan ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>◷</span>{operatingSpan}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <nav className={profileStyles.tabs} aria-label="Track sections">
        <div className={profileStyles.tabInner}>
          <Link href={`/tracks/${slug}`} className={profileStyles.tab}>Overview</Link>
          <Link href={`/tracks/${slug}/results`} className={profileStyles.tab}>Results</Link>
          <Link href={`/tracks/${slug}/champions`} className={profileStyles.tab}>Champions</Link>
          <Link href={`/tracks/${slug}/feature-winners`} className={`${profileStyles.tab} ${profileStyles.activeTab}`}>Feature Winners</Link>
          <Link href={`/tracks/${slug}/photos`} className={profileStyles.tab}>Photos</Link>
          <Link href="/media/newspapers" className={profileStyles.tab}>OCR / Newspaper Clippings</Link>
          <Link href={`/tracks/${slug}#track-info`} className={profileStyles.tab}>Track Info</Link>
        </div>
      </nav>

      <div className={styles.content}>
        <section className={profileStyles.statsGrid} aria-label="Feature winner statistics">
          {stats.map((stat) => (
            <div className={profileStyles.statCard} key={stat.label}>
              <div className={profileStyles.statTop}>
                <span className={profileStyles.statIcon} aria-hidden="true">{stat.icon}</span>
                <strong className={profileStyles.statValue}>{stat.value}</strong>
              </div>
              <div className={profileStyles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </section>

        {podium.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.kicker}>All-time leaders</div>
                <h2>Feature Win Leaders</h2>
              </div>
              <div className={styles.sectionNote}>Top discovered totals at {track.track_name}</div>
            </div>
            <div className={styles.podiumGrid}>
              {podium.map((winner, index) => (
                <Link
                  key={`${winner.driver_slug || winner.driver_name}-${index}`}
                  href={winner.driver_slug ? `/drivers/${winner.driver_slug}` : '#leaderboard'}
                  className={`${styles.podiumCard} ${index === 0 ? styles.podiumFirst : ''}`}
                >
                  <div className={styles.podiumRank}>#{index + 1}</div>
                  <div className={styles.podiumName}>{winner.driver_name || 'Unknown Driver'}</div>
                  <div className={styles.podiumValue}>{formatNumber(winner.win_count)}</div>
                  <div className={styles.podiumLabel}>feature wins</div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section} id="leaderboard">
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>Complete leaderboard</div>
              <h2>All Feature Winners</h2>
            </div>
            <div className={styles.sectionNote}>{formatNumber(filteredRows.length)} driver{filteredRows.length === 1 ? '' : 's'} shown</div>
          </div>

          <form action={`/tracks/${slug}/feature-winners`} method="get" className={styles.searchBar}>
            <label>
              <span>Search driver</span>
              <input name="q" defaultValue={searchText} placeholder="Driver name..." />
            </label>
            <button type="submit" className={styles.applyButton}>Search</button>
            {searchText ? <Link href={`/tracks/${slug}/feature-winners#leaderboard`} className={styles.clearLink}>Clear search</Link> : <span className={styles.filterNote}>Ranked by recorded feature victories</span>}
          </form>

          {pageRows.length === 0 ? (
            <div className={styles.empty}>
              <strong>No feature winners matched that search.</strong>
              <span>Try another driver name.</span>
              <Link href={`/tracks/${slug}/feature-winners#leaderboard`}>Show all feature winners</Link>
            </div>
          ) : (
            <div className={styles.tablePanel}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th className={styles.rank}>Rank</th><th>Driver</th><th className={styles.numeric}>Feature Wins</th></tr>
                  </thead>
                  <tbody>
                    {pageRows.map((winner, index) => {
                      const overallRank = (currentPage - 1) * pageSize + index + 1
                      return (
                        <tr key={`${winner.driver_slug || winner.driver_name}-${overallRank}`}>
                          <td className={styles.rank}>{overallRank}</td>
                          <td>
                            {winner.driver_slug ? (
                              <Link href={`/drivers/${winner.driver_slug}`} className={styles.driverLink}>{winner.driver_name || 'Unknown Driver'}</Link>
                            ) : (
                              winner.driver_name || 'Unknown Driver'
                            )}
                          </td>
                          <td className={styles.numeric}>{formatNumber(winner.win_count)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pageCount > 1 ? (
            <div className={styles.pagination}>
              {currentPage > 1 ? <Link href={buildHref(slug, currentPage - 1, searchText)}>← Previous</Link> : <span />}
              <strong>Page {currentPage} of {pageCount}</strong>
              {currentPage < pageCount ? <Link href={buildHref(slug, currentPage + 1, searchText)}>Next →</Link> : <span />}
            </div>
          ) : null}
        </section>

        <section className={styles.footerGrid}>
          <Link href={`/tracks/${slug}`} className={styles.footerCard}><strong>Track Overview</strong><span>Return to the full {track.track_name} archive →</span></Link>
          <Link href={`/tracks/${slug}/champions`} className={styles.footerCard}><strong>Track Champions</strong><span>Explore championship history →</span></Link>
          <Link href={`/tracks/${slug}/results`} className={styles.footerCard}><strong>Race Results</strong><span>Browse season-by-season feature results →</span></Link>
        </section>
      </div>
    </main>
  )
}
