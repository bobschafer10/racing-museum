import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import TrackLogo from "../TrackLogo"
import profileStyles from "../track-profile.module.css"
import styles from "./standings.module.css"

export const revalidate = 300

const PAGE_SIZE = 1000

type Track = {
  track_id: number
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

type StandingMeta = {
  year?: number | null
  notes?: string | null
  source_label?: string | null
  source_system?: string | null
  source_url?: string | null
  is_final?: boolean | null
}

type StandingRow = StandingMeta & {
  id?: number | string | null
  class_id?: number | string | null
  finishing_position?: number | string | null
  position_label?: string | null
  driver_id?: number | string | null
  driver_name?: string | null
  points?: string | null
  starts?: string | null
  wins?: string | null
  top5?: string | null
  top10?: string | null
  poles?: string | null
  car_number?: string | null
  team_name?: string | null
  source_division_name?: string | null
}

type ClassRow = {
  id: number | string
  name: string
}

type DriverRow = {
  driver_id: number | string
  driver_name?: string | null
  slug?: string | null
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

function isPublishedFinalPositions(rows: StandingMeta[]) {
  const sourceText = rows
    .map((row) => `${row.source_label || ""} ${row.notes || ""}`)
    .join(" ")
    .toLowerCase()

  return [
    "full final points table not recovered",
    "full standings rows pending",
    "published final position",
    "published final positions",
    "no lower final position",
    "no lower final points position",
    "partial final",
    "only published",
  ].some((phrase) => sourceText.includes(phrase))
}

async function fetchStandingsMetadata(trackId: number) {
  const { count } = await supabase
    .from("TrackStandings")
    .select("id", { count: "exact", head: true })
    .eq("track_id", trackId)
    .eq("is_final", true)

  const total = Number(count || 0)
  if (!total) return [] as StandingMeta[]

  const pageCount = Math.ceil(total / PAGE_SIZE)
  const batches = await Promise.all(
    Array.from({ length: pageCount }, (_, page) => {
      const start = page * PAGE_SIZE
      return supabase
        .from("TrackStandings")
        .select("year,notes,source_label,source_system,source_url,is_final")
        .eq("track_id", trackId)
        .eq("is_final", true)
        .order("year", { ascending: false })
        .range(start, start + PAGE_SIZE - 1)
    }),
  )

  return batches.flatMap((batch) => (batch.data || []) as StandingMeta[])
}

async function fetchYearStandings(trackId: number, year: number) {
  const { count } = await supabase
    .from("TrackStandings")
    .select("id", { count: "exact", head: true })
    .eq("track_id", trackId)
    .eq("year", year)
    .eq("is_final", true)

  const total = Number(count || 0)
  if (!total) return [] as StandingRow[]

  const pageCount = Math.ceil(total / PAGE_SIZE)
  const batches = await Promise.all(
    Array.from({ length: pageCount }, (_, page) => {
      const start = page * PAGE_SIZE
      return supabase
        .from("TrackStandings")
        .select(
          "id,year,class_id,finishing_position,position_label,driver_id,driver_name,points,starts,wins,top5,top10,poles,car_number,team_name,source_division_name,notes,source_url,source_label,is_final,source_system",
        )
        .eq("track_id", trackId)
        .eq("year", year)
        .eq("is_final", true)
        .order("class_id", { ascending: true, nullsFirst: false })
        .order("finishing_position", { ascending: true, nullsFirst: false })
        .range(start, start + PAGE_SIZE - 1)
    }),
  )

  return batches.flatMap((batch) => (batch.data || []) as StandingRow[])
}

export default async function TrackStandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ year?: string }>
}) {
  const { slug } = await params
  const queryParams = (await searchParams) ?? {}

  const { data: track } = await supabase
    .from("track_profile_view_v3")
    .select(
      "track_id,track_name,slug,city,state,first_year,last_year,surface_type,configuration,image_url",
    )
    .eq("slug", slug)
    .maybeSingle<Track>()

  if (!track) notFound()

  const metadata = await fetchStandingsMetadata(Number(track.track_id))
  const groupedYears = new Map<number, StandingMeta[]>()

  for (const row of metadata) {
    const year = Number(row.year || 0)
    if (!year) continue
    const existing = groupedYears.get(year) || []
    existing.push(row)
    groupedYears.set(year, existing)
  }

  const seasons = Array.from(groupedYears.entries())
    .map(([year, rows]) => ({
      year,
      rows: rows.length,
      partial: isPublishedFinalPositions(rows),
    }))
    .sort((a, b) => b.year - a.year)

  const requestedYear = Number.parseInt(queryParams.year || "", 10)
  const selectedYear = seasons.some((season) => season.year === requestedYear)
    ? requestedYear
    : seasons[0]?.year || null
  const selectedSeason = seasons.find((season) => season.year === selectedYear) || null

  const selectedRows = selectedYear
    ? await fetchYearStandings(Number(track.track_id), selectedYear)
    : []

  const classIds = Array.from(
    new Set(
      selectedRows
        .map((row) => Number(row.class_id || 0))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  )

  const driverIds = Array.from(
    new Set(
      selectedRows
        .map((row) => Number(row.driver_id || 0))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  )

  let classRows: ClassRow[] = []
  if (classIds.length > 0) {
    const { data } = await supabase.from("Classes").select("id,name").in("id", classIds)
    classRows = (data || []) as ClassRow[]
  }

  let driverRows: DriverRow[] = []
  if (driverIds.length > 0) {
    const { data } = await supabase
      .from("Drivers")
      .select("driver_id,driver_name,slug")
      .in("driver_id", driverIds)
    driverRows = (data || []) as DriverRow[]
  }

  const classNameById = new Map(classRows.map((row) => [String(row.id), row.name]))
  const driverById = new Map(driverRows.map((row) => [String(row.driver_id), row]))

  const divisionGroups = new Map<string, { name: string; rows: StandingRow[] }>()
  for (const row of selectedRows) {
    const classKey = row.class_id
      ? `class:${String(row.class_id)}`
      : `source:${row.source_division_name || "unknown"}`
    const className = row.class_id
      ? classNameById.get(String(row.class_id)) || row.source_division_name || "Unknown Division"
      : row.source_division_name || "Unknown Division"
    const group = divisionGroups.get(classKey) || { name: className, rows: [] }
    group.rows.push(row)
    divisionGroups.set(classKey, group)
  }

  const divisions = Array.from(divisionGroups.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const sourceMap = new Map<string, { label: string; url?: string | null }>()
  for (const row of selectedRows) {
    const label = row.source_label || row.source_system || "Museum source record"
    const key = `${label}|${row.source_url || ""}`
    if (!sourceMap.has(key)) sourceMap.set(key, { label, url: row.source_url })
  }
  const sources = Array.from(sourceMap.values())

  const completeSeasons = seasons.filter((season) => !season.partial).length
  const partialSeasons = seasons.filter((season) => season.partial).length
  const oldestYear = seasons[seasons.length - 1]?.year || null
  const newestYear = seasons[0]?.year || null
  const archiveSpan = oldestYear && newestYear
    ? oldestYear === newestYear
      ? String(oldestYear)
      : `${oldestYear}–${newestYear}`
    : "Growing archive"

  const locationText =
    [track.city, track.state].filter(Boolean).join(", ") || "Location not yet documented"
  const operatingSpan = track.first_year && track.last_year
    ? track.first_year === track.last_year
      ? String(track.first_year)
      : `${track.first_year}–${track.last_year}`
    : track.first_year
      ? `${track.first_year}–Present`
      : null
  const heroUrl = track.image_url || ""

  const stats = [
    { icon: "▦", value: seasons.length.toLocaleString(), label: "Verified Final Seasons" },
    { icon: "✓", value: completeSeasons.toLocaleString(), label: "Complete Final Tables" },
    { icon: "◐", value: partialSeasons.toLocaleString(), label: "Published Final Positions" },
    { icon: "↔", value: archiveSpan, label: "Standings Archive" },
  ]

  return (
    <main className={profileStyles.page}>
      <section className={profileStyles.hero}>
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={`Racing at ${track.track_name}`}
            className={profileStyles.heroImage}
          />
        ) : (
          <div className={profileStyles.heroFallback} aria-hidden="true" />
        )}

        <div className={profileStyles.heroInner}>
          <nav className={profileStyles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>›</span>
            <Link href="/tracks">Tracks</Link><span>›</span>
            <Link href={`/tracks/${slug}`}>{track.track_name}</Link><span>›</span>
            <span>Point Standings</span>
          </nav>

          <div className={profileStyles.heroGrid}>
            <div className={profileStyles.logoFrame}>
              <TrackLogo slug={slug} trackName={track.track_name} />
            </div>
            <div>
              <p className={profileStyles.eyebrow}>Historical Point Standings Archive</p>
              <h1 className={profileStyles.title}>{track.track_name}</h1>
              <p className={profileStyles.location}>{locationText}</p>
            </div>
            <p className={profileStyles.heroIntro}>
              Browse verified season-ending point standings preserved from official track records,
              MyRacePass, Scoring.Racing, archived track websites, RacingOnline, and other historical sources.
              Complete final tables are clearly separated from surviving sources that published only part of the final order.
            </p>
            <div className={profileStyles.heroFacts}>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>●</span>{locationText}</span>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>▦</span>{seasons.length.toLocaleString()} verified seasons</span>
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
          <Link href={`/tracks/${slug}/standings`} className={`${profileStyles.tab} ${profileStyles.activeTab}`}>Point Standings</Link>
          <Link href={`/tracks/${slug}/champions`} className={profileStyles.tab}>Champions</Link>
          <Link href={`/tracks/${slug}/feature-winners`} className={profileStyles.tab}>Feature Winners</Link>
          <Link href={`/tracks/${slug}/photos`} className={profileStyles.tab}>Photos</Link>
          <Link href="/media/newspapers" className={profileStyles.tab}>OCR / Newspaper Clippings</Link>
          <Link href={`/tracks/${slug}#track-info`} className={profileStyles.tab}>Track Info</Link>
        </div>
      </nav>

      <div className={styles.content}>
        <section className={profileStyles.statsGrid} aria-label="Point standings archive statistics">
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

        <section className={styles.legend} aria-label="Standings source quality key">
          <div className={`${styles.legendCard} ${styles.legendComplete}`}>
            <span className={styles.legendLabel}>Final Point Standings</span>
            <h2>Complete Final Table</h2>
            <p>
              A season-ending standings table survives with the published final order for the division.
              These seasons are presented as complete final point standings.
            </p>
          </div>
          <div className={`${styles.legendCard} ${styles.legendPartial}`}>
            <span className={styles.legendLabel}>Published Final Positions</span>
            <h2>Partial Surviving Final Source</h2>
            <p>
              The surviving season-ending source published only champions, selected positions, or part of the final order.
              These records are preserved, but they are never presented as a complete standings table.
            </p>
          </div>
        </section>

        {seasons.length === 0 ? (
          <section className={styles.section}>
            <div className={styles.empty}>
              <strong>No verified final point standings have been published here yet.</strong>
              A season will appear only after the museum has a source that supports final standings or published final positions.
            </div>
          </section>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.kicker}>Verified season archive</div>
                  <h2>Select a Season</h2>
                </div>
                <div className={styles.sectionNote}>
                  Only source-verified final seasons are shown
                </div>
              </div>
              <div className={styles.yearGrid}>
                {seasons.map((season) => (
                  <Link
                    key={season.year}
                    href={`/tracks/${slug}/standings?year=${season.year}#season-detail`}
                    className={`${styles.yearCard} ${season.year === selectedYear ? styles.yearCardSelected : ""}`}
                  >
                    <span className={styles.yearNumber}>{season.year}</span>
                    <span className={`${styles.yearStatus} ${season.partial ? styles.yearStatusPartial : ""}`}>
                      {season.partial ? "Published Final Positions" : "Final Point Standings"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section} id="season-detail">
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.kicker}>Season archive</div>
                  <h2 className={styles.detailTitle}>{selectedYear} Point Standings</h2>
                </div>
                <div className={`${styles.statusBadge} ${selectedSeason?.partial ? styles.statusBadgePartial : ""}`}>
                  {selectedSeason?.partial ? "Published Final Positions" : "Final Point Standings"}
                </div>
              </div>

              <p className={styles.qualityExplanation}>
                {selectedSeason?.partial
                  ? "The surviving final source for this season published only part of the final finishing order. The museum is showing every final position that source preserved, but this should not be read as a complete standings table."
                  : "A complete season-ending standings table has been recovered for this season. The finishing order below is presented as final point standings from the surviving source."}
              </p>

              {sources.length > 0 ? (
                <div className={styles.sourcePanel}>
                  <div className={styles.sourceTitle}>Source record</div>
                  <div className={styles.sourceList}>
                    {sources.map((source, index) =>
                      source.url ? (
                        <a
                          key={`${source.label}-${index}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.sourceChipLink}
                        >
                          {source.label} ↗
                        </a>
                      ) : (
                        <span key={`${source.label}-${index}`} className={styles.sourceChip}>
                          {source.label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {divisions.length === 0 ? (
                <div className={styles.empty}>
                  <strong>No standings rows were returned for this season.</strong>
                  The source record exists, but the season table could not be displayed.
                </div>
              ) : (
                divisions.map((division) => {
                  const rows = [...division.rows].sort((a, b) => {
                    const aPos = Number(a.finishing_position || Number.MAX_SAFE_INTEGER)
                    const bPos = Number(b.finishing_position || Number.MAX_SAFE_INTEGER)
                    if (aPos !== bPos) return aPos - bPos
                    return String(a.driver_name || a.team_name || "").localeCompare(
                      String(b.driver_name || b.team_name || ""),
                    )
                  })

                  const showCar = rows.some((row) => hasValue(row.car_number))
                  const showPoints = rows.some((row) => hasValue(row.points))
                  const showStarts = rows.some((row) => hasValue(row.starts))
                  const showWins = rows.some((row) => hasValue(row.wins))
                  const showTop5 = rows.some((row) => hasValue(row.top5))
                  const showTop10 = rows.some((row) => hasValue(row.top10))
                  const showPoles = rows.some((row) => hasValue(row.poles))

                  return (
                    <div className={styles.divisionBlock} key={division.name}>
                      <div className={styles.divisionHeader}>
                        <h3>{division.name}</h3>
                        <span className={styles.divisionCount}>
                          {rows.length.toLocaleString()} published position{rows.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th className={styles.positionCol}>Pos.</th>
                              <th>Driver / Team</th>
                              {showCar ? <th>Car</th> : null}
                              {showPoints ? <th className={styles.numeric}>Points</th> : null}
                              {showStarts ? <th className={styles.numeric}>Starts</th> : null}
                              {showWins ? <th className={styles.numeric}>Wins</th> : null}
                              {showTop5 ? <th className={styles.numeric}>Top 5</th> : null}
                              {showTop10 ? <th className={styles.numeric}>Top 10</th> : null}
                              {showPoles ? <th className={styles.numeric}>Poles</th> : null}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, index) => {
                              const driver = row.driver_id
                                ? driverById.get(String(row.driver_id))
                                : null
                              const driverName = row.driver_name || driver?.driver_name || row.team_name || "Unknown Driver / Team"
                              const secondary = row.team_name && row.team_name !== driverName ? row.team_name : null

                              return (
                                <tr key={`${row.id || "row"}-${index}`}>
                                  <td className={styles.positionCol}>
                                    {row.position_label || row.finishing_position || "—"}
                                  </td>
                                  <td>
                                    {driver?.slug ? (
                                      <Link href={`/drivers/${driver.slug}`} className={styles.driverLink}>
                                        {driverName}
                                      </Link>
                                    ) : (
                                      <strong>{driverName}</strong>
                                    )}
                                    {secondary ? <span className={styles.driverMeta}>{secondary}</span> : null}
                                  </td>
                                  {showCar ? <td>{row.car_number || "—"}</td> : null}
                                  {showPoints ? <td className={styles.numeric}>{row.points || "—"}</td> : null}
                                  {showStarts ? <td className={styles.numeric}>{row.starts || "—"}</td> : null}
                                  {showWins ? <td className={styles.numeric}>{row.wins || "—"}</td> : null}
                                  {showTop5 ? <td className={styles.numeric}>{row.top5 || "—"}</td> : null}
                                  {showTop10 ? <td className={styles.numeric}>{row.top10 || "—"}</td> : null}
                                  {showPoles ? <td className={styles.numeric}>{row.poles || "—"}</td> : null}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })
              )}
            </section>
          </>
        )}

        <div className={styles.footerNote}>
          Archive policy: a season is not labeled as final simply because an in-season points page survives.
          The museum publishes a season here only when the source supports a season-ending result; incomplete surviving finals are explicitly marked as Published Final Positions.
        </div>
      </div>
    </main>
  )
}
