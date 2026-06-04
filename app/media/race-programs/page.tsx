import Link from "next/link"
import { getRacePrograms, type RaceProgram } from "@/lib/race-programs"

type SearchParams = Promise<{
  decade?: string
  type?: string
}>

type RaceProgramWithCover = RaceProgram & {
  coverImage: string
}

export default async function RaceProgramsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const programs = await getRacePrograms()
  const params = await searchParams

  const activeDecade = params?.decade ?? "all"
  const activeType = params?.type ?? "all"

  const getProgramYear = (year: number | string | null) => {
    if (typeof year === "number") return year

    if (typeof year === "string") {
      const match = year.match(/\d{4}/)
      return match ? Number(match[0]) : null
    }

    return null
  }

  const getDecade = (year: number | string | null) => {
    const parsedYear = getProgramYear(year)
    if (!parsedYear) return null
    return `${Math.floor(parsedYear / 10) * 10}s`
  }

  const decadeOptions = [
    "all",
    "1940s",
    "1950s",
    "1960s",
    "1970s",
    "1980s",
    "1990s",
    "2000s",
  ]

  const archiveTypes = [
    { label: "All Types", value: "all" },
    { label: "Race Programs", value: "program" },
    { label: "Yearbooks", value: "yearbook" },
    { label: "Souvenir Books", value: "souvenir book" },
    { label: "Special Events", value: "special event" },
  ]

  const filteredPrograms = programs.filter((program) => {
    const matchesDecade =
      activeDecade === "all" || getDecade(program.year) === activeDecade

    const matchesType =
      activeType === "all" ||
      program.type?.toLowerCase() === activeType.toLowerCase()

    return matchesDecade && matchesType
  })

  const decadeCounts = decadeOptions.reduce<Record<string, number>>(
    (acc, decade) => {
      acc[decade] =
        decade === "all"
          ? programs.length
          : programs.filter((program) => getDecade(program.year) === decade)
              .length

      return acc
    },
    {}
  )

  const typeCounts = archiveTypes.reduce<Record<string, number>>((acc, type) => {
    acc[type.value] =
      type.value === "all"
        ? programs.length
        : programs.filter(
            (program) => program.type?.toLowerCase() === type.value
          ).length

    return acc
  }, {})

  const totalPrograms = programs.length

  const withCovers = programs.filter(
    (program): program is RaceProgramWithCover => Boolean(program.coverImage)
  )

  const featuredPrograms = withCovers.slice(0, 8)

  const todayKey = new Date().toISOString().slice(0, 10)

  const programOfTheDay =
    withCovers.length > 0
      ? withCovers[
          todayKey
            .split("")
            .reduce((total, char) => total + char.charCodeAt(0), 0) %
            withCovers.length
        ]
      : null

  const years = programs
    .map((program) => getProgramYear(program.year))
    .filter((year): year is number => year !== null)

  const earliestYear = years.length ? Math.min(...years) : null
  const latestYear = years.length ? Math.max(...years) : null

  const programTypes = Array.from(
    new Set(programs.map((program) => program.type).filter(Boolean))
  )

  return (
    <main style={styles.pageWrap}>
      <style>
        {`
          .program-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 18px 38px rgba(45, 31, 18, 0.18) !important;
          }

          .program-card:hover .program-cover {
            transform: scale(1.025);
          }
        `}
      </style>

      <section style={styles.heroPanel}>
        <div style={styles.heroWatermark}>PRINTED ARCHIVE</div>

        <div style={styles.heroGrid}>
          <div>
            <div style={styles.eyebrow}>Museum Media Archive</div>

            <h1 style={styles.title}>Race Programs & Yearbooks</h1>

            <p style={styles.heroQuote}>
              Preserving the printed history of Midwestern auto racing.
            </p>

            <p style={styles.heroIntro}>
              A growing digital collection of race-night programs, souvenir
              books, season yearbooks, and special event publications from
              short tracks, touring series, and speedways across the Upper
              Midwest.
            </p>

            <div style={styles.statsRibbon}>
              <span style={styles.statChip}>
                <strong>{totalPrograms}</strong> Publications
              </span>

              {earliestYear && latestYear ? (
                <span style={styles.statChip}>
                  <strong>
                    {earliestYear}–{latestYear}
                  </strong>{" "}
                  Years
                </span>
              ) : null}

              <span style={styles.statChip}>
                <strong>{withCovers.length}</strong> Covers Preserved
              </span>

              <span style={styles.statChip}>
                <strong>{programTypes.length}</strong> Archive Types
              </span>
            </div>
          </div>

          <div style={styles.heroCollage} aria-hidden="true">
            {withCovers.slice(0, 4).map((program, index) => (
              <div
                key={program.slug}
                style={{
                  ...styles.heroCover,
                  ...heroCoverPositions[index],
                }}
              >
                <img
                  src={program.coverImage}
                  alt=""
                  style={styles.heroCoverImage}
                />
              </div>
            ))}

            <div style={styles.heroCaption}>
              Original covers, race-night memories, and printed artifacts from
              the short-track era.
            </div>
          </div>
        </div>
      </section>

      <section style={styles.quickNavPanel}>
        <div style={styles.quickNavTitle}>Explore the Archive</div>

        <div style={styles.quickNavRow}>
          {decadeOptions.map((decade) => (
            <Link
              key={decade}
              href={
                decade === "all"
                  ? `/media/race-programs?type=${activeType}`
                  : `/media/race-programs?decade=${decade}&type=${activeType}`
              }
              style={{
                ...styles.quickNavChip,
                ...(activeDecade === decade ? styles.quickNavChipActive : {}),
              }}
            >
              {decade === "all" ? "All Years" : decade} (
              {decadeCounts[decade] ?? 0})
            </Link>
          ))}
        </div>

        <div style={styles.collectionRow}>
          {archiveTypes.map((type) => (
            <Link
              key={type.value}
              href={
                activeDecade === "all"
                  ? `/media/race-programs?type=${type.value}`
                  : `/media/race-programs?decade=${activeDecade}&type=${type.value}`
              }
              style={{
                ...styles.collectionChip,
                ...(activeType === type.value
                  ? styles.collectionChipActive
                  : {}),
              }}
            >
              {type.label} ({typeCounts[type.value] ?? 0})
            </Link>
          ))}
        </div>
      </section>

      {programOfTheDay ? (
        <section style={styles.dailyFeaturePanel}>
          <div>
            <div style={styles.dailyEyebrow}>Program of the Day</div>
            <h2 style={styles.dailyFeatureTitle}>{programOfTheDay.title}</h2>

            <p style={styles.dailyFeatureText}>
              A rotating daily selection from the printed racing archive.
            </p>

            <Link
              href={`/media/race-programs/${programOfTheDay.slug}`}
              style={styles.dailyButton}
            >
              Open Today&apos;s Program
            </Link>
          </div>

          <img
            src={programOfTheDay.coverImage}
            alt={programOfTheDay.title}
            style={styles.dailyFeatureImage}
          />
        </section>
      ) : null}

      {featuredPrograms.length > 0 ? (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.eyebrow}>Featured Shelf</div>
              <h2 style={styles.sectionTitle}>
                Program Covers From the Archive
              </h2>
            </div>

            <p style={styles.sectionIntro}>
              A rotating shelf of colorful covers and historic publications
              from the museum collection.
            </p>
          </div>

          <div style={styles.featuredRail}>
            {featuredPrograms.map((program) => (
              <Link
                key={program.slug}
                href={`/media/race-programs/${program.slug}`}
                style={styles.featuredCard}
              >
                <img
                  src={program.coverImage}
                  alt={program.title}
                  style={styles.featuredImage}
                />

                <div style={styles.featuredMeta}>
                  <span>{program.year ?? "Year Unknown"}</span>
                  <strong>{program.title}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section style={styles.section}>
        <div style={styles.archiveHeader}>
          <div>
            <div style={styles.eyebrow}>Browse the Collection</div>
            <h2 style={styles.sectionTitle}>Printed Racing Archive</h2>
          </div>

          <p style={styles.sectionIntro}>
            Showing <strong>{filteredPrograms.length}</strong> of{" "}
            <strong>{programs.length}</strong> archived publications. Each card
            opens a preserved program or yearbook.
          </p>
        </div>

        {filteredPrograms.length === 0 ? (
          <div style={styles.emptyPanel}>
            No race programs matched that filter.
          </div>
        ) : (
          <div style={styles.masonryGrid}>
            {filteredPrograms.map((program) => (
              <article
                key={program.slug}
                style={styles.programCard}
                className="program-card"
              >
                <div style={styles.cardBadgeRow}>
                  {program.isNew ? <span style={styles.newBadge}>NEW</span> : null}

                  {program.trackLogo ? (
                    <img src={program.trackLogo} alt="" style={styles.trackLogoBadge} />
                  ) : null}
                </div>

                <Link
                  href={`/media/race-programs/${program.slug}`}
                  style={styles.coverLink}
                >
                  {program.coverImage ? (
                    <img
                      src={program.coverImage}
                      alt={program.title}
                      style={styles.coverImage}
                      className="program-cover"
                    />
                  ) : (
                    <div style={styles.coverPlaceholder}>
                      <span>Cover Image</span>
                      <strong>Coming Soon</strong>
                    </div>
                  )}
                </Link>

                <div style={styles.cardBody}>
                  <div style={styles.metaRow}>
                    <span style={styles.yearBadge}>
                      {program.year ?? "Unknown Year"}
                    </span>

                    <span style={styles.typeBadge}>
                      {(program.type ?? "program").trim().toUpperCase()}
                    </span>
                  </div>

                  <h3 style={styles.cardTitle}>{program.title}</h3>

                  {program.subtitle ? (
                    <div style={styles.cardSubtitle}>{program.subtitle}</div>
                  ) : null}

                  {program.description ? (
                    <p style={styles.cardText}>{program.description}</p>
                  ) : null}

                  <div style={styles.linkRow}>
                    {program.track_slug && program.track ? (
                      <Link
                        href={`/tracks/${program.track_slug}`}
                        style={styles.textLink}
                      >
                        {program.track}
                      </Link>
                    ) : null}

                    {program.series_slug && program.series ? (
                      <Link
                        href={`/series/${program.series_slug}`}
                        style={styles.textLink}
                      >
                        {program.series}
                      </Link>
                    ) : null}
                  </div>

                  <Link
                    href={`/media/race-programs/${program.slug}`}
                    style={styles.openButton}
                  >
                    Open Program
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const heroCoverPositions: React.CSSProperties[] = [
  {
    left: 18,
    top: 46,
    transform: "rotate(-8deg)",
    zIndex: 1,
  },
  {
    left: 116,
    top: 8,
    transform: "rotate(5deg)",
    zIndex: 4,
  },
  {
    left: 214,
    top: 64,
    transform: "rotate(9deg)",
    zIndex: 2,
  },
  {
    left: 78,
    top: 138,
    transform: "rotate(-2deg)",
    zIndex: 3,
  },
]

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    maxWidth: 1380,
    margin: "0 auto",
    padding: "24px 18px 90px",
  },

  heroPanel: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    padding: "54px 42px",
    marginBottom: 36,
    background:
      "radial-gradient(circle at 82% 20%, rgba(121, 80, 31, 0.2), transparent 32%), linear-gradient(135deg, #f8efd9 0%, #ead9bb 52%, #dfc9a2 100%)",
    border: "1px solid rgba(97, 69, 34, 0.28)",
    boxShadow: "0 20px 48px rgba(47, 32, 18, 0.14)",
  },

  heroWatermark: {
    position: "absolute",
    right: -42,
    bottom: -30,
    fontSize: 110,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.06em",
    color: "rgba(70, 47, 23, 0.065)",
    transform: "rotate(-5deg)",
    userSelect: "none",
    pointerEvents: "none",
  },

  heroGrid: {
    position: "relative",
    zIndex: 2,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) 390px",
    gap: 38,
    alignItems: "center",
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#7d613c",
    marginBottom: 10,
  },

  title: {
    margin: 0,
    maxWidth: 820,
    fontSize: "clamp(2.6rem, 5vw, 5.1rem)",
    lineHeight: 0.96,
    color: "#2e2115",
    letterSpacing: "-0.045em",
  },

  heroQuote: {
    margin: "18px 0 0",
    maxWidth: 760,
    fontSize: "clamp(1.25rem, 2vw, 1.8rem)",
    lineHeight: 1.35,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    color: "#6b4a21",
  },

  heroIntro: {
    marginTop: 18,
    maxWidth: 850,
    fontSize: 17,
    lineHeight: 1.75,
    color: "#594331",
  },

  statsRibbon: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 28,
  },

  statChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255, 249, 235, 0.76)",
    border: "1px solid rgba(96, 67, 33, 0.22)",
    color: "#5f4427",
    fontSize: 13,
    fontWeight: 800,
    boxShadow: "0 6px 16px rgba(60, 40, 20, 0.06)",
  },

  heroCollage: {
    position: "relative",
    minHeight: 330,
  },

  heroCover: {
    position: "absolute",
    width: 150,
    aspectRatio: "3 / 4",
    borderRadius: 14,
    overflow: "hidden",
    background: "#f7eedb",
    border: "1px solid rgba(82, 58, 31, 0.3)",
    boxShadow: "0 20px 34px rgba(43, 30, 17, 0.28)",
  },

  heroCoverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    filter: "sepia(0.08) contrast(1.04)",
  },

  heroCaption: {
    position: "absolute",
    left: 34,
    right: 30,
    bottom: 0,
    padding: "13px 15px",
    borderRadius: 14,
    background: "rgba(45, 32, 20, 0.84)",
    color: "#fff4d9",
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 800,
    textAlign: "center",
    boxShadow: "0 10px 24px rgba(30, 20, 12, 0.2)",
  },

  quickNavPanel: {
    marginTop: 26,
    marginBottom: 34,
    padding: "20px 22px",
    borderRadius: 20,
    background:
      "linear-gradient(135deg, rgba(248,239,217,0.95), rgba(233,218,188,0.85))",
    border: "1px solid rgba(97, 69, 34, 0.22)",
    boxShadow: "0 10px 26px rgba(45, 31, 18, 0.08)",
  },

  quickNavTitle: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#7d613c",
    marginBottom: 12,
  },

  quickNavRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },

  quickNavChip: {
    display: "inline-flex",
    padding: "9px 13px",
    borderRadius: 999,
    background: "#3a2a1b",
    color: "#fff1d0",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: "0.04em",
  },

  quickNavChipActive: {
    background: "#76562f",
    color: "#fff6e8",
    boxShadow: "0 6px 14px rgba(68, 44, 22, 0.16)",
  },

  collectionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
  },

  collectionChip: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#e4d2ad",
    color: "#694d2f",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    textDecoration: "none",
  },

  collectionChipActive: {
    background: "#76562f",
    color: "#fff6e8",
    boxShadow: "0 6px 14px rgba(68, 44, 22, 0.16)",
  },

  dailyFeaturePanel: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 170px",
    gap: 22,
    alignItems: "center",
    marginBottom: 38,
    padding: 22,
    borderRadius: 22,
    background:
      "linear-gradient(135deg, #3a2a1b 0%, #76562f 100%)",
    color: "#fff4df",
    boxShadow: "0 16px 36px rgba(45, 31, 18, 0.18)",
  },

  dailyEyebrow: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#f4dfb8",
    marginBottom: 10,
  },

  dailyFeatureTitle: {
    margin: "0 0 10px",
    fontSize: "clamp(1.8rem, 3vw, 3rem)",
    lineHeight: 1,
    color: "#fff4df",
  },

  dailyFeatureText: {
    margin: "0 0 16px",
    fontSize: 16,
    lineHeight: 1.6,
    color: "#f4dfb8",
  },

  dailyButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 999,
    background: "#fff4df",
    color: "#3a2a1b",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 900,
  },

  dailyFeatureImage: {
    width: "100%",
    borderRadius: 14,
    boxShadow: "0 14px 28px rgba(20, 12, 6, 0.35)",
  },

  section: {
    marginTop: 42,
  },

  sectionHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 440px)",
    gap: 24,
    alignItems: "end",
    marginBottom: 18,
  },

  archiveHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 520px)",
    gap: 24,
    alignItems: "end",
    marginBottom: 20,
  },

  sectionTitle: {
    margin: 0,
    fontSize: "clamp(1.9rem, 3vw, 3rem)",
    lineHeight: 1,
    color: "#302216",
    letterSpacing: "-0.03em",
  },

  sectionIntro: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.65,
    color: "#604b38",
  },

  featuredRail: {
    display: "flex",
    gap: 18,
    overflowX: "auto",
    padding: "6px 2px 18px",
    scrollSnapType: "x mandatory",
  },

  featuredCard: {
    flex: "0 0 190px",
    scrollSnapAlign: "start",
    textDecoration: "none",
    color: "inherit",
    background: "#f6edd9",
    border: "1px solid rgba(95, 68, 39, 0.22)",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 12px 26px rgba(48, 33, 18, 0.12)",
  },

  featuredImage: {
    display: "block",
    width: "100%",
    aspectRatio: "3 / 4",
    objectFit: "cover",
    background: "#eadcc3",
  },

  featuredMeta: {
    padding: 12,
    display: "grid",
    gap: 5,
    fontSize: 12,
    color: "#6b543c",
  },

  masonryGrid: {
    columnCount: 4,
    columnGap: "22px",
  },

  programCard: {
    position: "relative",
    display: "inline-block",
    width: "100%",
    margin: "0 0 22px",
    breakInside: "avoid",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0)), #f4ead5",
    border: "1px solid rgba(97, 69, 34, 0.22)",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 10px 26px rgba(45, 31, 18, 0.1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  cardBadgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 3,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "none",
  },

  newBadge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    background: "#8b1e17",
    color: "#fff4df",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    boxShadow: "0 6px 14px rgba(60, 20, 10, 0.22)",
  },

  trackLogoBadge: {
    width: 38,
    height: 38,
    objectFit: "contain",
    borderRadius: 999,
    background: "rgba(255, 246, 225, 0.92)",
    border: "1px solid rgba(80, 55, 29, 0.22)",
    padding: 4,
    boxShadow: "0 6px 14px rgba(45, 31, 18, 0.18)",
  },

  coverLink: {
    display: "block",
    padding: 14,
    paddingBottom: 0,
    textDecoration: "none",
    overflow: "hidden",
  },

  coverImage: {
    display: "block",
    width: "100%",
    height: "auto",
    borderRadius: 12,
    boxShadow: "0 8px 18px rgba(40, 28, 18, 0.12)",
    transition: "transform 0.2s ease",
  },

  coverPlaceholder: {
    width: "100%",
    aspectRatio: "3 / 4",
    borderRadius: 12,
    background:
      "linear-gradient(135deg, #efe2c5 0%, #faf2df 45%, #e3cfaa 100%)",
    border: "1px dashed rgba(105, 76, 40, 0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#725536",
    textAlign: "center",
    gap: 4,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  cardBody: {
    padding: 15,
  },

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },

  yearBadge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    background: "#3a2a1b",
    color: "#fff1d0",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  typeBadge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    background: "#e4d2ad",
    color: "#694d2f",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  cardTitle: {
    margin: "0 0 7px",
    fontSize: 21,
    lineHeight: 1.12,
    color: "#2f2115",
    letterSpacing: "-0.02em",
  },

  cardSubtitle: {
    marginBottom: 9,
    fontSize: 14,
    lineHeight: 1.45,
    color: "#70583f",
    fontWeight: 700,
  },

  cardText: {
    margin: "0 0 13px",
    fontSize: 14,
    lineHeight: 1.58,
    color: "#5a4634",
  },

  linkRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 13,
  },

  textLink: {
    fontSize: 13,
    fontWeight: 800,
    color: "#7a5425",
    textDecoration: "none",
    borderBottom: "1px solid rgba(122, 84, 37, 0.35)",
  },

  openButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 13px",
    borderRadius: 999,
    background: "#76562f",
    color: "#fff6e8",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 900,
    boxShadow: "0 6px 14px rgba(68, 44, 22, 0.16)",
  },

  emptyPanel: {
    background: "#f5eddc",
    border: "1px solid rgba(115, 88, 52, 0.22)",
    borderRadius: 16,
    padding: "22px 20px",
    color: "#554332",
    fontSize: 16,
    lineHeight: 1.7,
  },
}