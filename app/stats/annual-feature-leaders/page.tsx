import Link from 'next/link'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

export const revalidate = 43200

export const metadata: Metadata = {
  title: 'Annual Feature Win Leaders | Upper Midwest Auto Racing Museum',
  description: 'Browse the drivers with the most recorded feature wins each season since 1955, across every track and racing class in the museum.',
}

type Leader = {
  season: number
  leader_rank: number
  driver_id: number
  driver_name: string
  driver_slug: string | null
  feature_wins: number
  tracks_won_at: number
  first_win_date: string | null
  last_win_date: string | null
}

type PageProps = {
  searchParams: Promise<{ year?: string }>
}

export default async function AnnualFeatureLeadersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const requestedYear = params.year ? Number(params.year) : null
  const selectedYear =
    Number.isInteger(requestedYear) && requestedYear !== null &&
    requestedYear >= 1955 && requestedYear <= currentYear
      ? requestedYear
      : null

  // GET lets the museum's shared public-read cache reuse the response for 12 hours,
  // avoiding an expensive aggregation on every visitor request.
  const { data, error } = await supabase.rpc(
    'stats_annual_feature_win_leaders',
    selectedYear ? { p_year: selectedYear, p_top: 25 } : { p_top: 1 },
    { get: true },
  )
  const leaders = (data ?? []) as Leader[]
  const seasons = Array.from(
    { length: Math.max(0, currentYear - 1955 + 1) },
    (_, i) => currentYear - i,
  )

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <Link href="/stats/feature-winners">Research Center</Link>
        <span aria-hidden="true">›</span>
        <span>Annual Feature Win Leaders</span>
      </nav>

      <header className={styles.hero}>
        <div className={styles.eyebrow}>Victory Lane · Museum Research Center</div>
        <h1>Annual Feature Win Leaders</h1>
        <p>
          Who won the most features in a single season? Explore every season from
          1955 forward using all tracks, all divisions, and all races currently
          documented in the Upper Midwest Auto Racing Museum.
        </p>
        <div className={styles.heroLinks}>
          <Link href="/stats/feature-winners?scope=full">Explore all feature wins →</Link>
          <Link href="https://docs.google.com/spreadsheets/d/1vr35GCn2siO23RZ-asl-_S2N2Fx2mwPwYkmvaXPle9s/edit">
            Open historical audit workbook ↗
          </Link>
        </div>
      </header>

      <section className={styles.controls} aria-label="Select leaderboard season">
        <form method="get" className={styles.form}>
          <label htmlFor="leader-season">Season</label>
          <select id="leader-season" name="year" defaultValue={selectedYear ?? 'all'}>
            <option value="all">All seasons — annual leaders</option>
            {seasons.map((season) => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
          <button type="submit">View leaders</button>
          {selectedYear !== null && (
            <Link className={styles.reset} href="/stats/annual-feature-leaders">All seasons</Link>
          )}
        </form>
        <span className={styles.mode}>
          {selectedYear === null ? 'Top driver(s) for each year' : `Top 25 ranks · ${selectedYear}`}
        </span>
      </section>

      <section className={styles.content} aria-labelledby="leaders-title">
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.eyebrow}>Recorded feature victories</div>
            <h2 id="leaders-title">
              {selectedYear === null ? 'Year-by-year winners, 1955–present' : `${selectedYear} season leaderboard`}
            </h2>
          </div>
          <span className={styles.count}>{leaders.length} driver entries</span>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            The live leaderboard could not be loaded. {error.message}
          </p>
        )}

        {!error && leaders.length === 0 && (
          <p className={styles.empty}>No completed feature results are currently recorded for this selection.</p>
        )}

        {leaders.length > 0 && (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {selectedYear === null && <th scope="col">Year</th>}
                  <th scope="col">Rank</th>
                  <th scope="col">Driver</th>
                  <th scope="col" className={styles.numeric}>Wins</th>
                  <th scope="col" className={styles.numeric}>Tracks</th>
                  {selectedYear !== null && <th scope="col">Winning dates</th>}
                  <th scope="col">Results</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((leader) => (
                  <tr key={`${leader.season}-${leader.driver_id}`}>
                    {selectedYear === null && (
                      <td>
                        <Link className={styles.yearLink} href={`/stats/annual-feature-leaders?year=${leader.season}`}>
                          {leader.season}
                        </Link>
                      </td>
                    )}
                    <td className={styles.rank}>#{leader.leader_rank}</td>
                    <td>
                      {leader.driver_slug ? (
                        <Link className={styles.driver} href={`/drivers/${leader.driver_slug}`}>
                          {leader.driver_name}
                        </Link>
                      ) : (
                        <span className={styles.driver}>{leader.driver_name}</span>
                      )}
                    </td>
                    <td className={styles.wins}>{Number(leader.feature_wins).toLocaleString('en-US')}</td>
                    <td className={styles.numeric}>{Number(leader.tracks_won_at).toLocaleString('en-US')}</td>
                    {selectedYear !== null && (
                      <td className={styles.dates}>
                        {leader.first_win_date ?? '—'}{leader.last_win_date && leader.last_win_date !== leader.first_win_date ? ` – ${leader.last_win_date}` : ''}
                      </td>
                    )}
                    <td>
                      {leader.driver_slug ? (
                        <Link
                          className={styles.viewLink}
                          href={`/drivers/${leader.driver_slug}/results?finish=1&year=${leader.season}`}
                        >
                          View wins →
                        </Link>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className={styles.note}>
        <strong>About these totals.</strong> Counts are recalculated from recorded first-place
        finishes for completed events, using the museum&apos;s canonical event and driver IDs.
        Rainouts and administrative placeholders do not count. Tied leaders share their rank,
        and legitimate multiple features on one race date count separately. Historical coverage
        remains incomplete in places: these are <em>museum-documented wins</em>, not independently
        certified lifetime or season records. Corrections and new race results can change rankings.
      </aside>
    </main>
  )
}
