import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import styles from "../track-profile.module.css"

export default async function TrackFeatureWinnersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const [{ data: track }, { data: winners }, { count: featureWinsCount }] =
    await Promise.all([
      supabase
        .from("track_profile_view_v3")
        .select("track_name,slug,city,state")
        .eq("slug", slug)
        .maybeSingle(),
      supabase
        .from("track_top_winners_view")
        .select("track_slug,track_name,driver_name,driver_slug,win_count")
        .eq("track_slug", slug)
        .order("win_count", { ascending: false })
        .limit(1000),
      supabase
        .from("global_results_view")
        .select("*", { count: "exact", head: true })
        .eq("track_slug", slug)
        .eq("finishing_position", 1),
    ])

  if (!track) notFound()

  const rows = winners || []
  const leader = rows[0] || null
  const location = [track.city, track.state].filter(Boolean).join(", ")

  return (
    <main className={styles.subpage}>
      <section className={styles.subHero}>
        <div className={styles.subHeroInner}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/tracks">Tracks</Link>
            <span>›</span>
            <Link href={`/tracks/${slug}`}>{track.track_name}</Link>
            <span>›</span>
            <span>Feature Winners</span>
          </nav>
          <p className={styles.eyebrow}>Complete Track Leaderboard</p>
          <h1 className={styles.subTitle}>Feature Winners</h1>
          <p className={styles.subSubtitle}>
            {track.track_name}{location ? ` • ${location}` : ""}
          </p>
          <p className={styles.subIntro}>
            All drivers currently credited with recorded feature victories at {track.track_name},
            ranked by discovered wins in the museum database.
          </p>
          <div className={styles.subActions}>
            <Link href={`/tracks/${slug}`} className={styles.backButton}>
              ← Track Overview
            </Link>
            <Link href={`/tracks/${slug}/champions`} className={styles.secondaryButton}>
              Track Champions
            </Link>
            <Link href={`/tracks/${slug}/results`} className={styles.secondaryButton}>
              Race Results
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.subContent}>
        <section className={styles.summaryGrid} aria-label="Feature winner summary">
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {Number(featureWinsCount || 0).toLocaleString()}
            </div>
            <div className={styles.summaryLabel}>Recorded Feature Wins</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{rows.length.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Winning Drivers</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {leader ? Number(leader.win_count || 0).toLocaleString() : "—"}
            </div>
            <div className={styles.summaryLabel}>
              {leader ? `${leader.driver_name} • Leading Total` : "Leading Total"}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <span className={styles.panelTitleIcon} aria-hidden="true">🏆</span>
              All Feature Winners
            </h2>
            <Link href={`/tracks/${slug}/results`} className={styles.panelLink}>
              Browse race results →
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className={styles.empty}>No feature winners are indexed for this track yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.rank}>Rank</th>
                    <th>Driver</th>
                    <th className={styles.numeric}>Feature Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((winner: any, index: number) => (
                    <tr key={`${winner.driver_slug || winner.driver_name}-${index}`}>
                      <td className={styles.rank}>{index + 1}</td>
                      <td>
                        {winner.driver_slug ? (
                          <Link
                            href={`/drivers/${winner.driver_slug}`}
                            className={styles.driverLink}
                          >
                            {winner.driver_name}
                          </Link>
                        ) : (
                          winner.driver_name || "Unknown Driver"
                        )}
                      </td>
                      <td className={styles.numeric}>
                        {Number(winner.win_count || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
