import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import styles from "../track-profile.module.css"

function formatSlugName(value?: string | null) {
  if (!value) return "Unknown Driver"
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default async function TrackChampionsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const [{ data: track }, { data: leaders }, { data: titles }] = await Promise.all([
    supabase
      .from("track_profile_view_v3")
      .select("track_name,slug,city,state")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("track_top_champions_view")
      .select("track_slug,track_name,driver_name,driver_slug,title_count")
      .eq("track_slug", slug)
      .order("title_count", { ascending: false })
      .limit(1000),
    supabase
      .from("driver_championships_view")
      .select("driver_slug,year,track_name,track_slug,class_name")
      .eq("track_slug", slug)
      .order("year", { ascending: false })
      .order("class_name", { ascending: true })
      .limit(2000),
  ])

  if (!track) notFound()

  const leaderRows = leaders || []
  const titleRows = titles || []
  const leader = leaderRows[0] || null
  const location = [track.city, track.state].filter(Boolean).join(", ")
  const nameBySlug = new Map<string, string>()

  for (const row of leaderRows) {
    if (row.driver_slug && row.driver_name) nameBySlug.set(row.driver_slug, row.driver_name)
  }

  return (
    <main className={styles.subpage}>
      <section className={styles.subHero}>
        <div className={styles.subHeroInner}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/tracks">Tracks</Link>
            <span>›</span>
            <Link href={`/tracks/${slug}`}>{track.track_name}</Link>
            <span>›</span>
            <span>Track Champions</span>
          </nav>
          <p className={styles.eyebrow}>Championship History</p>
          <h1 className={styles.subTitle}>Track Champions</h1>
          <p className={styles.subSubtitle}>
            {track.track_name}{location ? ` • ${location}` : ""}
          </p>
          <p className={styles.subIntro}>
            Championship leaders and the year-by-year title archive currently connected to
            {" "}{track.track_name} in the museum database.
          </p>
          <div className={styles.subActions}>
            <Link href={`/tracks/${slug}`} className={styles.backButton}>
              ← Track Overview
            </Link>
            <Link href={`/tracks/${slug}/feature-winners`} className={styles.secondaryButton}>
              Feature Winners
            </Link>
            <Link href={`/tracks/${slug}/results`} className={styles.secondaryButton}>
              Race Results
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.subContent}>
        <section className={styles.summaryGrid} aria-label="Championship summary">
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{titleRows.length.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Championship Titles Indexed</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{leaderRows.length.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Championship Drivers</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {leader ? Number(leader.title_count || 0).toLocaleString() : "—"}
            </div>
            <div className={styles.summaryLabel}>
              {leader ? `${leader.driver_name} • Leading Total` : "Leading Total"}
            </div>
          </div>
        </section>

        <section className={styles.leaderGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelTitleIcon} aria-hidden="true">◉</span>
                Leading Champions
              </h2>
            </div>
            {leaderRows.length === 0 ? (
              <div className={styles.empty}>No championship leaders are indexed yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.rank}>Rank</th>
                      <th>Driver</th>
                      <th className={styles.numeric}>Titles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderRows.map((champion: any, index: number) => (
                      <tr key={`${champion.driver_slug || champion.driver_name}-${index}`}>
                        <td className={styles.rank}>{index + 1}</td>
                        <td>
                          {champion.driver_slug ? (
                            <Link
                              href={`/drivers/${champion.driver_slug}`}
                              className={styles.driverLink}
                            >
                              {champion.driver_name}
                            </Link>
                          ) : (
                            champion.driver_name || "Unknown Driver"
                          )}
                        </td>
                        <td className={styles.numeric}>
                          {Number(champion.title_count || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelTitleIcon} aria-hidden="true">▦</span>
                Year-by-Year Champions
              </h2>
            </div>
            {titleRows.length === 0 ? (
              <div className={styles.empty}>No year-by-year championship records are indexed yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Driver</th>
                      <th>Division</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titleRows.map((title: any, index: number) => {
                      const driverName =
                        nameBySlug.get(title.driver_slug) || formatSlugName(title.driver_slug)
                      return (
                        <tr key={`${title.year}-${title.class_name}-${title.driver_slug}-${index}`}>
                          <td>{title.year || "—"}</td>
                          <td>
                            {title.driver_slug ? (
                              <Link
                                href={`/drivers/${title.driver_slug}`}
                                className={styles.driverLink}
                              >
                                {driverName}
                              </Link>
                            ) : (
                              driverName
                            )}
                          </td>
                          <td>{title.class_name || "Unknown Division"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
