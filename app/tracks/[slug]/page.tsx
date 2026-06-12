import Link from "next/link"
import { notFound } from "next/navigation"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabase"
import { getRacePrograms } from "@/lib/race-programs"

function getPhotoUrl(fileName?: string | null) {
  if (!fileName) return ''

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return `${baseUrl}/storage/v1/object/public/media/photos/${fileName}`
}

export default async function TrackProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const baseSlug = slug.replace(/-(wi|il|mn|mi)$/i, "")
  const logoPath = `/logos/tracks/${slug}.jpg`

  const { data: track } = await supabase
    .from("track_profile_view_v3")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

const { data: archiveQuality } = await supabase
  .from("track_archive_quality_with_coverage_view")
  .select("*")
  .eq("track_slug", slug)
  .maybeSingle()

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .or(`track_slug.eq.${slug},track_slug.eq.${baseSlug}`)
    .order("year", { ascending: true, nullsFirst: false })
    .order("sequence", { ascending: true })

  if (!track) {
    notFound()
  }

  const { data: winners } = await supabase
    .from("track_top_winners_view")
    .select("track_slug, track_name, driver_name, driver_slug, win_count")
    .eq("track_slug", slug)
    .order("win_count", { ascending: false })
    .limit(10)

  const { data: champions } = await supabase
    .from("track_top_champions_view")
    .select("track_slug, track_name, driver_name, driver_slug, title_count")
    .eq("track_slug", slug)
    .order("title_count", { ascending: false })
    .limit(10)

  const { data: classes } = await supabase
    .from("track_top_classes_view")
    .select("*")
    .eq("track_slug", slug)
    .limit(10)

  const sortedClasses = [...(classes || [])].sort((a: any, b: any) => {
    return (b.race_count || 0) - (a.race_count || 0)
  })

  const { data: results } = await supabase
    .from("track_recent_results_summary_view")
    .select("*")
    .eq("track_slug", slug)
    .order("race_date", { ascending: true })
    .order("class_name", { ascending: true })
    .limit(60)

  const { data: resultYears } = await supabase
    .from("track_results_by_year_view")
    .select("result_year")
    .eq("track_slug", slug)
    .order("result_year", { ascending: true })

  const { count: resultsCount } = await supabase
    .from("global_results_view")
    .select("*", { count: "exact", head: true })
    .eq("track_slug", slug)

  const groupedResults = Object.values(
    (results || []).reduce((acc: Record<string, any>, r: any) => {
      const date = r.race_date || "Unknown date"

      if (!acc[date]) {
        acc[date] = {
          date,
          races: [],
        }
      }

      acc[date].races.push(r)
      return acc
    }, {})
  ).sort((a: any, b: any) => {
    if (a.date === "Unknown date") return 1
    if (b.date === "Unknown date") return -1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  }) as Array<{ date: string; races: any[] }>

  const availableYears = (resultYears || [])
    .map((row: any) => row.result_year)
    .filter(Boolean)

  function formatDate(dateStr: string) {
    if (!dateStr || dateStr === "Unknown date") return "Unknown date"
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const allPrograms = await getRacePrograms()

  const relatedPrograms = allPrograms
    .filter((program) => program.track_slug === slug)
    .sort((a, b) => Number(a.year ?? 0) - Number(b.year ?? 0))

  function formatSlugName(value?: string | null) {
    if (
      !value ||
      value === "unknown-credit" ||
      value === "unknown-driver" ||
      value === "unknown"
    ) {
      return null
    }

    return value
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  function formatPhotoYear(value?: string | number | null) {
    if (!value || value === "unknown-year") {
      return "Year Unknown"
    }

    return String(value)
  }

  const maxProfilePhotos = 30
  const allPhotos = photos || []

  function getDayOfYear(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date.getTime() - start.getTime()
    const oneDay = 1000 * 60 * 60 * 24
    return Math.floor(diff / oneDay)
  }

  const profilePhotos =
    allPhotos.length <= maxProfilePhotos
      ? allPhotos
      : (() => {
          const dayIndex = getDayOfYear()
          const startIndex = (dayIndex * maxProfilePhotos) % allPhotos.length

          const rotated = [
            ...allPhotos.slice(startIndex),
            ...allPhotos.slice(0, startIndex),
          ]

          return rotated.slice(0, maxProfilePhotos)
        })()

  const heroPhotoItem =
    profilePhotos.length > 0
      ? profilePhotos[getDayOfYear() % profilePhotos.length]
      : null

const archiveBadges = [
  archiveQuality?.results_status
    ? { icon: "📚", label: archiveQuality.results_status }
    : null,

  archiveQuality?.photo_status
    ? { icon: "📷", label: archiveQuality.photo_status }
    : null,

archiveQuality?.coverage_status
  ? { icon: "📋", label: archiveQuality.coverage_status }
  : null,

  archiveQuality?.has_recent_results
    ? { icon: "🔥", label: "Active Track" }
    : null,

  archiveQuality?.historic_track
    ? { icon: "🏛", label: "Historic Track" }
    : null,

  {
    icon: "📊",
    label: archiveQuality?.standings_status || "Standings Coming Soon",
  },
].filter(Boolean) as Array<{ icon: string; label: string }>

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={heroText}>
            <div style={eyebrow}>Track Profile</div>

            <div style={logoWrap}>
  <img
    src={logoPath}
    alt={`${track.track_name} logo`}
    style={logoImg}
  />
</div>

            <div style={locationLine}>
              {[track.city, track.state].filter(Boolean).join(", ") ||
                "Location unknown"}
            </div>

            {track.track_status ? (
  <div style={statusLine}>Status: {track.track_status}</div>
) : null}

{archiveBadges.length > 0 ? (
  <div style={archiveBadgesWrap}>
    {archiveBadges.map((badge, index) => (
      <span
        key={`${badge.icon}-${badge.label}`}
        style={{
          ...archiveBadge,
          gridColumn:
            index < 3
              ? "span 2"
              : index === 3
                ? "2 / span 2"
                : "4 / span 2",
        }}
      >
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
      </span>
    ))}
  </div>
) : null}

{track.description ? (
  <p style={introText}>{track.description}</p>
) : (
              <p style={introText}>
                Historic racing venue with deep regional significance. Full records and
                archives continue to be expanded.
              </p>
            )}

            <div style={metaGrid}>
              <div style={metaCard}>
                <div style={metaLabel}>Surface</div>
                <div style={metaValue}>{track.surface_type || "Unknown"}</div>
              </div>

              <div style={metaCard}>
  <div style={metaLabel}>Configuration</div>
  <div style={metaValue}>
    {(track.configuration || "Unknown")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase())}
  </div>
</div>

<div style={metaCard}>
                <div style={metaLabel}>Years Active</div>
                <div style={metaValue}>
                  {track.first_year || track.last_year || archiveQuality?.first_result_year || archiveQuality?.last_result_year
  ? `${track.first_year || archiveQuality?.first_result_year || "?"}–${
      track.last_year || archiveQuality?.last_result_year || "Present"
    }`
  : "Unknown"}
                </div>
              </div>

              <div style={metaCard}>
                <div style={metaLabel}>Results</div>
                <div style={metaValue}>
                  {resultsCount ?? track.recorded_results ?? 0}
                </div>
              </div>
            </div>
          </div>

          <div style={photoPanel}>
            {!heroPhotoItem ? (
              <div style={photoPlaceholder}>Photo Coming Soon</div>
            ) : (
              <div>
                <img
  src={getPhotoUrl(heroPhotoItem.file_name)}
  alt={track.track_name}
  style={heroPhoto}
/>

                <div style={heroCaption}>
                  {[
                    formatSlugName(heroPhotoItem?.driver_slug),
                    formatPhotoYear(heroPhotoItem?.year),
                    formatSlugName(heroPhotoItem?.photographer_slug)
                      ? `${formatSlugName(heroPhotoItem?.photographer_slug)} Photo`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={threeColGrid}>
          <div style={panelCard}>
            <h2 style={panelTitle}>Top Winners</h2>

            {winners && winners.length > 0 ? (
              <div style={listWrap}>
                {winners.map((w: any, idx: number) => (
                  <div
                    key={`${w.driver_slug || w.driver_name}-${w.win_count}-${idx}`}
                    style={listRow}
                  >
                    <div>
                      {w.driver_slug ? (
                        <Link href={`/drivers/${w.driver_slug}`} style={inlineLink}>
                          {w.driver_name}
                        </Link>
                      ) : (
                        w.driver_name
                      )}
                    </div>

                    <div style={listValue}>{w.win_count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyText}>No winner data available yet.</div>
            )}
          </div>

          <div style={panelCard}>
            <h2 style={panelTitle}>Top Champions</h2>

            {champions && champions.length > 0 ? (
              <div style={listWrap}>
                {champions.map((c: any, idx: number) => (
                  <div
                    key={`${c.driver_slug || c.driver_name}-${c.title_count}-${idx}`}
                    style={listRow}
                  >
                    <div>
                      {c.driver_slug ? (
                        <Link href={`/drivers/${c.driver_slug}`} style={inlineLink}>
                          {c.driver_name}
                        </Link>
                      ) : (
                        c.driver_name
                      )}
                    </div>

                    <div style={listValue}>{c.title_count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyText}>No championship data available yet.</div>
            )}
          </div>

          <div style={panelCard}>
            <h2 style={panelTitle}>Top Classes</h2>

            {sortedClasses.length > 0 ? (
              <div style={listWrap}>
                {sortedClasses.map((cl: any, idx: number) => (
                  <div
                    key={`${cl.class_name || cl.division_name || "class"}-${
                      cl.race_count || 0
                    }-${idx}`}
                    style={listRow}
                  >
                    <div>
  <Link
    href={`/tracks/${slug}/classes/${encodeURIComponent(
      cl.class_name || cl.division_name || "Unknown Class"
    )}`}
    style={inlineLink}
  >
    {cl.class_name || cl.division_name || "Unknown Class"}
  </Link>
</div>
                    <div style={listValue}>{cl.race_count || 0}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyText}>No class data available yet.</div>
            )}
          </div>
        </div>
      </section>

      <section style={photosSection}>
        <h2 style={photosHeading}>Photo Archive</h2>

        {profilePhotos.length === 0 ? (
          <div style={emptyArchiveBox}>No photos available yet.</div>
        ) : (
          <>
            <div style={photoGrid}>
              {profilePhotos.map((photo) => {
                const driverName =
                  formatSlugName(photo.driver_slug) || "Unknown Driver"

                const hasDriver =
                  !!photo.driver_slug &&
                  photo.driver_slug !== "unknown-driver" &&
                  photo.driver_slug !== "unknown"

                const driverHref = hasDriver
                  ? `/drivers/${photo.driver_slug}`
                  : null

                return (
                  <div key={photo.photo_id} style={photoCard}>
                    {driverHref ? (
                      <Link href={driverHref} style={{ display: "block" }}>
                        <img
  src={getPhotoUrl(photo.file_name)}
  alt={driverName}
  style={{ ...photoImage, cursor: "pointer" }}
/>
                      </Link>
                    ) : (
                      <img
  src={getPhotoUrl(photo.file_name)}
  alt={driverName}
  style={photoImage}
/>
                    )}

                    <div style={photoMeta}>
                      <div style={{ fontWeight: 700 }}>
                        {driverHref ? (
                          <Link
                            href={driverHref}
                            style={{ ...inlineLink, display: "inline-block" }}
                          >
                            {driverName}
                          </Link>
                        ) : (
                          driverName
                        )}
                      </div>

                      <div>{formatPhotoYear(photo.year)}</div>

                      <div>
                        {formatSlugName(photo.photographer_slug)
                          ? `${formatSlugName(photo.photographer_slug)} Photo`
                          : "Unknown photographer"}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: "18px", textAlign: "center" }}>
              <Link href={`/tracks/${slug}/photos`} style={viewAllLink}>
                View Full Photo Archive →
              </Link>
            </div>
          </>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Feature Results by Year</h2>

        <p style={sectionIntro}>
          Recent grouped results from this track. Full records continue to be expanded.
        </p>

        <div style={yearChipsWrap}>
          {availableYears.map((yr) => (
            <Link
              key={yr}
              href={`/tracks/${slug}/results?year=${yr}`}
              style={yearChip}
            >
              {yr}
            </Link>
          ))}
        </div>

        {groupedResults.length > 0 ? (
          <div style={resultsWrap}>
            {groupedResults.map((day) => (
              <div key={day.date} style={resultDayCard}>
                <h3 style={resultDate}>{formatDate(day.date)}</h3>

                <div style={resultList}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px repeat(4, 1fr)",
                      gap: "10px",
                      fontSize: 12,
                      opacity: 0.6,
                      marginBottom: 6,
                      paddingBottom: 6,
                      borderBottom: "1px solid rgba(0,0,0,0.2)",
                    }}
                  >
                    <div></div>
                    <div>Winner</div>
                    <div>2nd</div>
                    <div>3rd</div>
                    <div>4th</div>
                  </div>

                  {day.races.map((r: any, idx: number) => (
                    <div
                      key={`${r.class_name}-${r.race_date}-${idx}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px repeat(4, 1fr)",
                        gap: "10px",
                        alignItems: "center",
                        padding: "4px 0",
                        borderTop: "1px solid rgba(0,0,0,0.1)",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{r.class_name}</div>
                      <div style={{ fontWeight: 700 }}>
                        {r.first_place_name || "-"}
                      </div>
                      <div>{r.second_place_name || "-"}</div>
                      <div>{r.third_place_name || "-"}</div>
                      <div>{r.fourth_place_name || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={emptyPanel}>No recent results available yet.</div>
        )}

        <div style={{ marginTop: "14px" }}>
          <Link href={`/tracks/${slug}/results`} style={viewAllLink}>
            View Full Results →
          </Link>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Related Race Programs</h2>

        <p style={sectionIntro}>
          Explore yearbooks and printed publications connected to this track.
        </p>

        {relatedPrograms.length === 0 ? (
          <div style={emptyPanel}>
            No related race programs have been linked to this track yet.
          </div>
        ) : (
          <div style={relatedProgramsGrid}>
            {relatedPrograms.map((program) => (
              <article key={program.slug} style={relatedProgramCard}>
                <div style={relatedProgramImageWrap}>
                  {program.coverImage ? (
                    <img
                      src={program.coverImage}
                      alt={program.title}
                      style={relatedProgramImage}
                    />
                  ) : (
                    <div style={emptyPanel}>Cover image coming soon.</div>
                  )}
                </div>

                <div style={relatedProgramBody}>
                  <div style={relatedProgramMeta}>{program.year}</div>
                  <h3 style={relatedProgramTitle}>{program.title}</h3>

                  <Link
                    href={`/media/race-programs/${program.slug}`}
                    style={relatedProgramButton}
                  >
                    View Artifact
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

const pageStyle: CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
  padding: "28px 18px 80px",
}

const heroSection: CSSProperties = {
  marginBottom: 28,
}

const heroInner: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.35fr 0.9fr",
  gap: 24,
  alignItems: "stretch",
}

const heroText: CSSProperties = {
  background: "#f3ead7",
  border: "1px solid rgba(115, 88, 52, 0.24)",
  borderRadius: 18,
  padding: "26px 24px",
  boxShadow: "0 10px 28px rgba(60, 40, 20, 0.06)",
}

const eyebrow: CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#7a6348",
  marginBottom: 10,
}

const viewAllLink: CSSProperties = {
  display: "inline-block",
  marginTop: "14px",
  padding: "10px 16px",
  borderRadius: "999px",
  background: "#7b5c34",
  color: "#fff8ee",
  textDecoration: "none",
  fontWeight: 700,
  border: "1px solid #7b5c34",
  boxShadow: "0 4px 12px rgba(60, 40, 20, 0.08)",
}

const pageTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(2rem, 4vw, 3.2rem)",
  lineHeight: 1.05,
  color: "#2f2419",
}

const logoWrap: CSSProperties = {
  marginBottom: 18,
  maxWidth: "520px",
}

const logoImg: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "150px",
  objectFit: "contain",
  display: "block",
  mixBlendMode: "multiply",
}

const yearChipsWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "14px",
}

const yearChip: CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "#efe4cd",
  color: "#6c4d22",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 700,
  border: "1px solid rgba(115, 88, 52, 0.28)",
}

const archiveBadgesWrap: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "10px",
  marginTop: "14px",
  maxWidth: "760px",
}

const locationLine: CSSProperties = {
  marginTop: 10,
  fontSize: 18,
  color: "#5f4935",
  fontWeight: 600,
}

const archiveBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "9px 12px",
  borderRadius: "999px",
  background: "#fbf5e8",
  border: "1px solid rgba(115, 88, 52, 0.24)",
  color: "#4b3218",
  fontSize: "13px",
  fontWeight: 800,
  boxShadow: "0 3px 10px rgba(60, 40, 20, 0.06)",
  whiteSpace: "nowrap",
}

const statusLine: CSSProperties = {
  marginTop: 8,
  fontSize: 15,
  color: "#755736",
}

const introText: CSSProperties = {
  marginTop: 18,
  fontSize: 16,
  lineHeight: 1.75,
  color: "#554332",
  maxWidth: 760,
}

const metaGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
  marginTop: 22,
}

const metaCard: CSSProperties = {
  background: "#fbf5e8",
  border: "1px solid rgba(115, 88, 52, 0.16)",
  borderRadius: 14,
  padding: "14px 14px",
}

const metaLabel: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#7f684e",
  marginBottom: 6,
}

const metaValue: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.4,
  color: "#2f2419",
  fontWeight: 700,
}

const photoPanel: CSSProperties = {
  background: "#f3ead7",
  border: "1px solid rgba(115, 88, 52, 0.24)",
  borderRadius: 18,
  overflow: "hidden",
  minHeight: 260,
  boxShadow: "0 10px 28px rgba(60, 40, 20, 0.06)",
  padding: "16px",
}

const photoPlaceholder: CSSProperties = {
  color: "#7a6348",
  fontStyle: "italic",
  fontSize: 16,
  minHeight: 240,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
}

const heroPhoto: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 10,
  border: "1px solid #b29364",
  background: "#efe7d6",
}

const heroCaption: CSSProperties = {
  marginTop: "8px",
  fontSize: "14px",
  color: "#5a3a1b",
  textAlign: "center",
  lineHeight: 1.4,
}

const sectionStyle: CSSProperties = {
  marginTop: 34,
}

const sectionTitle: CSSProperties = {
  fontSize: 30,
  margin: "0 0 12px",
  color: "#34271c",
}

const sectionIntro: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: "#5c4836",
  maxWidth: 920,
  marginBottom: 18,
}

const threeColGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
}

const panelCard: CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const panelTitle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 24,
  color: "#2f2419",
}

const listWrap: CSSProperties = {
  display: "grid",
  gap: 10,
}

const listRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "baseline",
  fontSize: 15,
  lineHeight: 1.55,
  color: "#554332",
  borderBottom: "1px solid rgba(115, 88, 52, 0.12)",
  paddingBottom: 8,
}

const listValue: CSSProperties = {
  fontWeight: 700,
  color: "#6c4d22",
  whiteSpace: "nowrap",
}

const emptyText: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#6b5643",
}

const photosSection: CSSProperties = {
  marginTop: 34,
}

const photosHeading: CSSProperties = {
  fontSize: 30,
  margin: "0 0 14px",
  color: "#34271c",
}

const emptyArchiveBox: CSSProperties = {
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "16px",
  borderRadius: 14,
  fontSize: "17px",
  lineHeight: 1.7,
  color: "#5a3a1b",
}

const photoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
}

const photoCard: CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  padding: 12,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const photoImage: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 10,
  border: "1px solid #b29364",
  background: "#efe7d6",
}

const photoMeta: CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#5a3a1b",
  lineHeight: 1.5,
}

const resultsWrap: CSSProperties = {
  display: "grid",
  gap: 18,
}

const resultDayCard: CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const resultDate: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 22,
  color: "#2f2419",
}

const resultList: CSSProperties = {
  display: "grid",
  gap: 10,
}

const inlineLink: CSSProperties = {
  textDecoration: "none",
  color: "#6c4d22",
  fontWeight: 700,
}

const emptyPanel: CSSProperties = {
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "16px",
  borderRadius: 14,
  fontSize: "17px",
  lineHeight: 1.7,
  color: "#5a3a1b",
}

const relatedProgramsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 20,
}

const relatedProgramCard: CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.08)",
  display: "flex",
  flexDirection: "column",
}

const relatedProgramImageWrap: CSSProperties = {
  padding: 14,
  paddingBottom: 0,
}

const relatedProgramImage: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 10,
}

const relatedProgramBody: CSSProperties = {
  padding: 16,
}

const relatedProgramMeta: CSSProperties = {
  fontSize: 13,
  color: "#6a5641",
  marginBottom: 8,
}

const relatedProgramTitle: CSSProperties = {
  fontSize: 22,
  lineHeight: 1.2,
  color: "#2f2419",
  margin: "0 0 12px",
}

const relatedProgramButton: CSSProperties = {
  display: "inline-block",
  marginTop: 8,
  padding: "10px 14px",
  borderRadius: 999,
  textDecoration: "none",
  background: "#7b5c34",
  color: "#fff8ee",
  fontWeight: 700,
  border: "1px solid #7b5c34",
}