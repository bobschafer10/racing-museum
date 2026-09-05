import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getRacePrograms } from "@/lib/race-programs"
import TrackLogo from "./TrackLogo"
import styles from "./track-profile.module.css"

function getPhotoUrl(photo: any) {
  if (!photo?.file_name) return ""

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const trackSlug = photo.track_slug || photo.file_name.split("_")[0]
  const year = photo.year || photo.file_name.split("_")[1] || "unknown-year"

  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "Date unknown"
  const [year, month, day] = String(dateStr).split("-").map(Number)
  if (!year || !month || !day) return String(dateStr)

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatSlugName(value?: string | null) {
  if (!value || value === "unknown" || value === "unknown-driver") return null
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatPhotoDriverName(value?: string | null) {
  if (!value || value === "unknown" || value === "unknown-driver") return null

  const baseSlug = value
    .split("---")[0]
    .replace(/-(wi|mn|il|mi|ia|in)$/i, "")

  return formatSlugName(baseSlug)
}

function driverCell(name?: string | null, driverSlug?: string | null) {
  const label = name || formatSlugName(driverSlug) || "Unknown Driver"
  if (!driverSlug || driverSlug === "unknown-driver" || driverSlug === "unknown") {
    return label
  }

  return (
    <Link href={`/drivers/${driverSlug}`} className={styles.driverLink}>
      {label}
    </Link>
  )
}

export default async function TrackProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const baseSlug = slug.replace(/-(wi|il|mn|mi)$/i, "")

  const { data: track } = await supabase
    .from("track_profile_view_v3")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (!track) notFound()

  const [
    { data: photos },
    { count: photoCount },
    { data: allWinners },
    { data: allChampions },
    { data: classes },
    { data: recentResults },
    { data: resultYears },
    { count: featureWinsCount },
  ] = await Promise.all([
    supabase
      .from("photos")
      .select(
        "photo_id,file_name,track_slug,driver_slug,year,photographer_slug,credit_type,sequence"
      )
      .or(`track_slug.eq.${slug},track_slug.eq.${baseSlug}`)
      .neq("credit_type", "unknown")
      .order("year", { ascending: false, nullsFirst: false })
      .order("sequence", { ascending: true })
      .limit(12),

    supabase
      .from("photos")
      .select("photo_id", { count: "exact", head: true })
      .or(`track_slug.eq.${slug},track_slug.eq.${baseSlug}`)
      .neq("credit_type", "unknown"),

    supabase
      .from("track_top_winners_view")
      .select("track_slug,track_name,driver_name,driver_slug,win_count")
      .eq("track_slug", slug)
      .order("win_count", { ascending: false })
      .limit(1000),

    supabase
      .from("track_top_champions_view")
      .select("track_slug,track_name,driver_name,driver_slug,title_count")
      .eq("track_slug", slug)
      .order("title_count", { ascending: false })
      .limit(1000),

    supabase
      .from("track_top_classes_view")
      .select("track_slug,class_name,race_count")
      .eq("track_slug", slug)
      .order("race_count", { ascending: false })
      .limit(1000),

    supabase
      .from("track_recent_results_summary_view")
      .select(
        "track_slug,race_date,class_name,first_place_name,first_place_slug,second_place_name,second_place_slug,third_place_name,third_place_slug"
      )
      .eq("track_slug", slug)
      .order("race_date", { ascending: false })
      .order("class_name", { ascending: true })
      .limit(16),

    supabase
      .from("track_results_by_year_view")
      .select("result_year")
      .eq("track_slug", slug)
      .order("result_year", { ascending: true }),

    supabase
      .from("global_results_view")
      .select("*", { count: "exact", head: true })
      .eq("track_slug", slug)
      .eq("finishing_position", 1),
  ])

  const programs = (await getRacePrograms())
    .filter((program) => program.track_slug === slug)
    .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))

  const winners = allWinners || []
  const champions = allChampions || []
  const divisions = classes || []
  const featuredPhotos = (photos || []).slice(0, 6)
  const topWinners = winners.slice(0, 8)
  const topChampions = champions.slice(0, 8)
  const latestRecordedDate = recentResults?.[0]?.race_date || null

  const availableYears = Array.from(
    new Set((resultYears || []).map((row: any) => Number(row.result_year)).filter(Boolean))
  ).sort((a, b) => a - b)

  const firstArchiveYear = availableYears[0] || track.first_year || null
  const lastArchiveYear =
    availableYears[availableYears.length - 1] || track.last_year || null
  const archiveSpan =
    firstArchiveYear && lastArchiveYear
      ? firstArchiveYear === lastArchiveYear
        ? String(firstArchiveYear)
        : `${firstArchiveYear}–${lastArchiveYear}`
      : firstArchiveYear
        ? `${firstArchiveYear}–`
        : "Growing"

  const operatingSpan =
    track.first_year && track.last_year
      ? track.first_year === track.last_year
        ? String(track.first_year)
        : `${track.first_year}–${track.last_year}`
      : track.first_year
        ? `${track.first_year}–Present`
        : null

  const heroPhoto = featuredPhotos[0] || null
  const heroUrl = track.image_url || (heroPhoto ? getPhotoUrl(heroPhoto) : "")
  const locationText =
    [track.city, track.state].filter(Boolean).join(", ") || "Location not yet documented"
  const mapQuery = encodeURIComponent(
    [track.track_name, track.city, track.state].filter(Boolean).join(", ")
  )

  const stats = [
    {
      icon: "▦",
      value: archiveSpan,
      label: "Results Archive",
    },
    {
      icon: "🏆",
      value: Number(featureWinsCount || 0).toLocaleString(),
      label: "Recorded Feature Wins",
    },
    {
      icon: "◉",
      value: champions.length.toLocaleString(),
      label: "Track Champions",
    },
    {
      icon: "▤",
      value: divisions.length.toLocaleString(),
      label: "Racing Divisions",
    },
  ]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={`Racing at ${track.track_name}`}
            className={styles.heroImage}
          />
        ) : (
          <div className={styles.heroFallback} aria-hidden="true" />
        )}

        <div className={styles.heroInner}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>›</span>
            <Link href="/tracks">Tracks</Link>
            <span>›</span>
            <span>{track.track_name}</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.logoFrame}>
              <TrackLogo slug={slug} trackName={track.track_name} />
            </div>

            <div>
              <p className={styles.eyebrow}>Upper Midwest Track Archive</p>
              <h1 className={styles.title}>{track.track_name}</h1>
              <p className={styles.location}>{locationText}</p>
            </div>

            <p className={styles.heroIntro}>
              Explore the feature winners, track champions, photographs, race results,
              programs, and growing newspaper archive connected to {track.track_name}.
            </p>

            <div className={styles.heroFacts}>
              <span className={styles.heroFact}>
                <span className={styles.heroFactIcon}>●</span>
                {locationText}
              </span>
              {operatingSpan ? (
                <span className={styles.heroFact}>
                  <span className={styles.heroFactIcon}>▦</span>
                  {operatingSpan}
                </span>
              ) : null}
              {track.configuration ? (
                <span className={styles.heroFact}>
                  <span className={styles.heroFactIcon}>⬭</span>
                  {track.configuration}
                </span>
              ) : null}
              {track.surface_type ? (
                <span className={styles.heroFact}>
                  <span className={styles.heroFactIcon}>⚑</span>
                  {track.surface_type}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <nav className={styles.tabs} aria-label="Track sections">
        <div className={styles.tabInner}>
          <Link href={`/tracks/${slug}`} className={`${styles.tab} ${styles.activeTab}`}>
            Overview
          </Link>
          <Link href={`/tracks/${slug}/results`} className={styles.tab}>
            Results
          </Link>
          <Link href={`/tracks/${slug}/champions`} className={styles.tab}>
            Champions
          </Link>
          <Link href={`/tracks/${slug}/feature-winners`} className={styles.tab}>
            Feature Winners
          </Link>
          <Link href={`/tracks/${slug}/photos`} className={styles.tab}>
            Photos
          </Link>
          <Link href="/media/newspapers" className={styles.tab}>
            OCR / Newspaper Clippings
          </Link>
          <a href="#track-info" className={styles.tab}>
            Track Info
          </a>
        </div>
      </nav>

      <div className={styles.content}>
        <section className={styles.statsGrid} aria-label="Track archive statistics">
          {stats.map((stat) => (
            <div className={styles.statCard} key={stat.label}>
              <div className={styles.statTop}>
                <span className={styles.statIcon} aria-hidden="true">{stat.icon}</span>
                <strong className={styles.statValue}>{stat.value}</strong>
              </div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </section>

        <section className={styles.actionGrid} aria-label="Track archive shortcuts">
          <Link href={`/tracks/${slug}/feature-winners`} className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">🏁</span>
            <p className={styles.actionKicker}>Complete leaderboard</p>
            <h2 className={styles.actionTitle}>View All Feature Winners</h2>
            <p className={styles.actionText}>
              {winners.length > 0
                ? `${winners.length.toLocaleString()} winning drivers currently indexed.`
                : "Explore the feature-win archive."}
            </p>
            <span className={styles.actionArrow} aria-hidden="true">›</span>
          </Link>

          <Link href={`/tracks/${slug}/champions`} className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">🏆</span>
            <p className={styles.actionKicker}>Championship history</p>
            <h2 className={styles.actionTitle}>View All Track Champions</h2>
            <p className={styles.actionText}>
              {champions.length > 0
                ? `${champions.length.toLocaleString()} championship drivers currently indexed.`
                : "Explore the championship archive."}
            </p>
            <span className={styles.actionArrow} aria-hidden="true">›</span>
          </Link>

          <Link href={`/tracks/${slug}/photos`} className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">📷</span>
            <p className={styles.actionKicker}>Museum photo collection</p>
            <h2 className={styles.actionTitle}>View All Photos</h2>
            <p className={styles.actionText}>
              {photoCount
                ? `${Number(photoCount).toLocaleString()} track photographs currently available.`
                : "Browse photographs connected to this track."}
            </p>
            <span className={styles.actionArrow} aria-hidden="true">›</span>
          </Link>

          <Link href="/media/newspapers" className={styles.actionCard}>
            <span className={styles.actionIcon} aria-hidden="true">▤</span>
            <p className={styles.actionKicker}>Growing research collection</p>
            <h2 className={styles.actionTitle}>View OCR / Newspaper Archive</h2>
            <p className={styles.actionText}>
              Browse digitized racing papers as OCR coverage and track indexing continue to grow.
            </p>
            <span className={styles.actionArrow} aria-hidden="true">›</span>
          </Link>
        </section>

        <section className={styles.leaderGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelTitleIcon} aria-hidden="true">🏆</span>
                Leading Feature Winners
              </h2>
              <Link href={`/tracks/${slug}/feature-winners`} className={styles.panelLink}>
                View all →
              </Link>
            </div>
            {topWinners.length === 0 ? (
              <div className={styles.empty}>No feature winners are indexed yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.rank}>#</th>
                      <th>Driver</th>
                      <th className={styles.numeric}>Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topWinners.map((winner: any, index: number) => (
                      <tr key={`${winner.driver_slug || winner.driver_name}-${index}`}>
                        <td className={styles.rank}>{index + 1}</td>
                        <td>{driverCell(winner.driver_name, winner.driver_slug)}</td>
                        <td className={styles.numeric}>
                          {Number(winner.win_count || 0).toLocaleString()}
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
                <span className={styles.panelTitleIcon} aria-hidden="true">◉</span>
                Leading Track Champions
              </h2>
              <Link href={`/tracks/${slug}/champions`} className={styles.panelLink}>
                View all →
              </Link>
            </div>
            {topChampions.length === 0 ? (
              <div className={styles.empty}>No track champions are indexed yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.rank}>#</th>
                      <th>Driver</th>
                      <th className={styles.numeric}>Titles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topChampions.map((champion: any, index: number) => (
                      <tr key={`${champion.driver_slug || champion.driver_name}-${index}`}>
                        <td className={styles.rank}>{index + 1}</td>
                        <td>{driverCell(champion.driver_name, champion.driver_slug)}</td>
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
        </section>

        <section className={`${styles.panel} ${styles.photosPanel}`}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <span className={styles.panelTitleIcon} aria-hidden="true">📷</span>
              Featured Photos
            </h2>
            <Link href={`/tracks/${slug}/photos`} className={styles.panelLink}>
              View all photos →
            </Link>
          </div>
          {featuredPhotos.length === 0 ? (
            <div className={styles.empty}>No track photographs are available yet.</div>
          ) : (
            <div className={styles.photoGrid}>
              {featuredPhotos.map((photo: any) => {
                const photoDriver = formatPhotoDriverName(photo.driver_slug)
                const photoYear =
                  photo.year && photo.year !== "unknown-year" ? String(photo.year) : null

                return (
                  <Link
                    href={`/tracks/${slug}/photos`}
                    className={styles.photoCard}
                    key={photo.photo_id}
                    aria-label={`Open ${photoDriver || track.track_name} photo in ${track.track_name} archive`}
                  >
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photoDriver ? `${photoDriver} at ${track.track_name}` : `Historic racing at ${track.track_name}`}
                    />
                    <span className={styles.photoOverlay}>
                      <span style={{ display: "block", fontSize: "0.78rem", lineHeight: 1.15 }}>
                        {photoDriver || (photoYear ? `Year ${photoYear}` : "Driver unknown")}
                      </span>
                      {photoDriver && photoYear ? (
                        <span
                          style={{
                            display: "block",
                            marginTop: 2,
                            color: "rgba(255,255,255,0.72)",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                          }}
                        >
                          Year {photoYear}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className={styles.lowerGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>
                  <span className={styles.panelTitleIcon} aria-hidden="true">🏁</span>
                  Latest Recorded Results
                </h2>
                {latestRecordedDate ? (
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#8f969b",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                    }}
                  >
                    Latest recorded event: {formatDate(latestRecordedDate)}
                  </p>
                ) : null}
              </div>
              <Link href={`/tracks/${slug}/results`} className={styles.panelLink}>
                View all results →
              </Link>
            </div>
            {!recentResults || recentResults.length === 0 ? (
              <div className={styles.empty}>No race results are currently indexed for this track.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Division</th>
                      <th>Feature Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((result: any, index: number) => (
                      <tr key={`${result.race_date}-${result.class_name}-${index}`}>
                        <td>{formatDate(result.race_date)}</td>
                        <td>{result.class_name || "Unknown Division"}</td>
                        <td>{driverCell(result.first_place_name, result.first_place_slug)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.panel} id="track-info">
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelTitleIcon} aria-hidden="true">●</span>
                Track Info
              </h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>{locationText}</span>
                </div>
                {track.surface_type ? (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Surface</span>
                    <span className={styles.infoValue}>{track.surface_type}</span>
                  </div>
                ) : null}
                {track.configuration ? (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Configuration</span>
                    <span className={styles.infoValue}>{track.configuration}</span>
                  </div>
                ) : null}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Archive span</span>
                  <span className={styles.infoValue}>{archiveSpan}</span>
                </div>
                {divisions.length > 0 ? (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Top divisions</span>
                    <span className={styles.infoValue}>
                      {divisions.slice(0, 4).map((division: any) => division.class_name).join(", ")}
                    </span>
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 16 }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.directionLink}
                >
                  Get Directions →
                </a>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelTitleIcon} aria-hidden="true">▤</span>
                OCR / Newspaper Archive
              </h2>
              <Link href="/media/newspapers" className={styles.panelLink}>
                Browse archive →
              </Link>
            </div>
            <div className={styles.panelBody}>
              <p className={styles.archiveLead}>
                Historic racing newspapers are being digitized and organized for research.
                Use the newspaper archive now while OCR coverage and track-level indexing continue.
              </p>
              <Link href="/media/newspapers" className={styles.archiveButton}>
                Open Newspaper Archive →
              </Link>

              {programs.length > 0 ? (
                <>
                  <p className={styles.archiveNote}>
                    {programs.length.toLocaleString()} race program{programs.length === 1 ? "" : "s"}
                    {" "}are also tied directly to {track.track_name}.
                  </p>
                  <div className={styles.programStrip}>
                    {programs.slice(0, 3).map((program) => (
                      <Link
                        href={`/media/race-programs/${program.slug}`}
                        className={styles.programLink}
                        key={program.slug}
                      >
                        <span>{program.title}</span>
                        <span>{program.year || "View"} →</span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.archiveNote}>
                  Additional OCR returns and print-media connections can be surfaced here as the archive grows.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}