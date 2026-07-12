// app/track/[slug]/page.tsx

import Link from "next/link"
import { notFound } from "next/navigation"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabase"
import { getRacePrograms } from "@/lib/race-programs"

function getPhotoUrl(photo: any) {
  if (!photo?.file_name) return ""

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
 const trackSlug = photo.track_slug || photo.file_name.split("_")[0]
  const year = photo.year || photo.file_name.split("_")[1] || "unknown-year"

 return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
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

  if (!track) notFound()

  const [
    { data: archiveQuality },
    { data: photos },
    { data: winners },
    { data: champions },
    { data: classes },
    { data: results },
    { data: resultYears },
    { count: featureWinsCount },
  ] = await Promise.all([
    supabase
      .from("track_archive_quality_with_coverage_view")
      .select("*")
      .eq("track_slug", slug)
      .maybeSingle(),

    supabase
      .from("photos")
      .select("*")
      .or(`track_slug.eq.${slug},track_slug.eq.${baseSlug}`)
      .order("year", { ascending: true, nullsFirst: false })
      .order("sequence", { ascending: true }),

    supabase
      .from("track_top_winners_view")
      .select("track_slug, track_name, driver_name, driver_slug, win_count")
      .eq("track_slug", slug)
      .order("win_count", { ascending: false })
      .limit(10),

    supabase
      .from("track_top_champions_view")
      .select("track_slug, track_name, driver_name, driver_slug, title_count")
      .eq("track_slug", slug)
      .order("title_count", { ascending: false })
      .limit(10),

    supabase
      .from("track_top_classes_view")
      .select("*")
      .eq("track_slug", slug)
      .limit(10),

    supabase
      .from("track_recent_results_summary_view")
      .select("*")
      .eq("track_slug", slug)
      .order("race_date", { ascending: true })
      .order("class_name", { ascending: true })
      .limit(60),

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

  const sortedClasses = [...(classes || [])].sort(
    (a: any, b: any) => (b.race_count || 0) - (a.race_count || 0)
  )

  const groupedResults = Object.values(
    (results || []).reduce((acc: Record<string, any>, r: any) => {
      const date = r.race_date || "Unknown date"
      if (!acc[date]) acc[date] = { date, races: [] }
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

  const allPrograms = await getRacePrograms()

  const relatedPrograms = allPrograms
    .filter((program) => program.track_slug === slug)
    .sort((a, b) => Number(a.year ?? 0) - Number(b.year ?? 0))

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
    if (!value || value === "unknown-year") return "Year Unknown"
    return String(value)
  }

  function displayDriver(name?: string | null, slug?: string | null) {
    if (!name) return "-"
    if (!slug) return name

    return (
      <Link href={`/drivers/${slug}`} style={inlineLink}>
        {name}
      </Link>
    )
  }

  const maxProfilePhotos = 30
  const allPhotos = photos || []

  function getDayOfYear(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
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

  const firstResultYear =
    availableYears.length > 0 ? availableYears[0] : null

  const latestResultYear =
    availableYears.length > 0
      ? availableYears[availableYears.length - 1]
      : null

  const topWinner = winners?.[0] || null
  const topChampions =
  champions && champions.length > 0
    ? champions.filter(
        (champion: any) =>
          champion.title_count === champions[0].title_count
      )
    : []

const topChampion = topChampions[0] || null
  const topClass = sortedClasses?.[0] || null

  const leftFacts = [
    firstResultYear
      ? {
          key: "results-span",
          label: "Archive Begins",
          value: String(firstResultYear),
          detail: "First year with discovered feature results.",
        }
      : null,

    featureWinsCount
      ? {
          key: "feature-wins",
          label: "Feature Wins",
          value: Number(featureWinsCount).toLocaleString(),
          detail: "First-place feature results discovered.",
        }
      : null,

    topWinner
      ? {
          key: "top-winner",
          label: "Leading Winner",
          value: topWinner.driver_name,
          detail: `${Number(topWinner.win_count || 0).toLocaleString()} discovered feature wins.`,
        }
      : null,

   topChampions.length > 0
  ? {
      key: "top-champion",
      label:
        topChampions.length > 1
          ? "Championship Leaders"
          : "Leading Champion",
      value: topChampions
        .map((champion: any) => champion.driver_name)
        .join(" & "),
      detail: `${Number(
        topChampions[0].title_count || 0
      ).toLocaleString()} discovered track titles each.`,
    }
  : null,

    topClass
      ? {
          key: "top-class",
          label: "Leading Class",
          value: topClass.class_name || topClass.division_name,
          detail: `${Number(topClass.race_count || 0).toLocaleString()} discovered feature wins.`,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    label: string
    value: string
    detail: string
  }>

  const rightFacts = [
    allPhotos.length > 0
      ? {
          label: "Museum Spotlight",
          key: "photos",
          title: "Historic Photo Collection",
          text: `${allPhotos.length.toLocaleString()} photographs connected to ${track.track_name} are preserved in the Museum archive.`,
          href: `/tracks/${slug}/photos`,
          linkLabel: "Browse Photo Archive →",
        }
      : null,

    featureWinsCount
      ? {
          label: "Museum Spotlight",
          key: "feature-wins",
          title: "Feature Race Archive",
          text: `${Number(featureWinsCount).toLocaleString()} first-place feature results have been discovered for ${track.track_name}.`,
          href: `/tracks/${slug}/results`,
          linkLabel: "Explore Feature Results →",
        }
      : null,

    topWinner
      ? {
          label: "Museum Spotlight",
          key: "top-winner",
          title: "Victory Lane Leader",
          text: `${topWinner.driver_name} leads the discovered feature-win archive with ${Number(
            topWinner.win_count || 0
          ).toLocaleString()} wins at ${track.track_name}.`,
          href: topWinner.driver_slug
            ? `/drivers/${topWinner.driver_slug}`
            : `/tracks/${slug}/results`,
          linkLabel: topWinner.driver_slug
            ? `View ${topWinner.driver_name} →`
            : "Explore Feature Results →",
        }
      : null,

   topChampions.length > 0
  ? {
      key: "top-champion",
      label: "Museum Spotlight",
      title:
        topChampions.length > 1
          ? "Championship Leaders"
          : "Championship Leader",
      text:
        topChampions.length > 1
          ? `${topChampions
              .map((champion: any) => champion.driver_name)
              .join(" and ")} share the discovered championship lead with ${Number(
              topChampions[0].title_count || 0
            ).toLocaleString()} track titles each.`
          : `${topChampion.driver_name} leads the discovered championship archive with ${Number(
              topChampion.title_count || 0
            ).toLocaleString()} track titles.`,
      href: `/tracks/${slug}`,
      linkLabel: "View Track Champions →",
    }
  : null,

    topClass
      ? {
          label: "Museum Spotlight",
          key: "top-class",
          title: "Leading Division",
          text: `${
            topClass.class_name || topClass.division_name
          } leads the class archive with ${Number(
            topClass.race_count || 0
          ).toLocaleString()} discovered feature wins.`,
          href: `/tracks/${slug}/classes/${encodeURIComponent(
            topClass.class_name || topClass.division_name || "Unknown Class"
          )}`,
          linkLabel: "View Class Results →",
        }
      : null,

    firstResultYear && latestResultYear
      ? {
          label: "Museum Spotlight",
          key: "results-span",
          title: "Results Through the Years",
          text: `Discovered feature results currently span ${firstResultYear} through ${
            latestResultYear === new Date().getFullYear()
              ? "the present"
              : latestResultYear
          }.`,
          href: `/tracks/${slug}/results`,
          linkLabel: "Browse Results by Year →",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    label: string
    title: string
    text: string
    href: string
    linkLabel: string
  }>

  const dailyIndex = getDayOfYear()

  const leftFact =
    leftFacts.length > 0
      ? leftFacts[dailyIndex % leftFacts.length]
      : null

  const eligibleRightFacts = leftFact
    ? rightFacts.filter((fact) => fact.key !== leftFact.key)
    : rightFacts

  const rightFact =
    eligibleRightFacts.length > 0
      ? eligibleRightFacts[(dailyIndex + 2) % eligibleRightFacts.length]
      : null

  return (
    <main style={pageStyle} className="track-profile-page">
      <section style={heroSection}>
        <div style={heroInner} className="track-profile-hero-inner">
          <div style={heroText}>
            <div style={eyebrow}>Track Profile</div>

<div style={logoFactRow} className="track-logo-fact-row">
  <div style={logoWrap}>
    <img
      src={logoPath}
      alt={`${track.track_name} logo`}
      style={logoImg}
    />
  </div>

  {leftFact ? (
    <div style={logoFactCard}>
      <div style={factEyebrow}>Today in the Archive</div>
      <div style={logoFactLabel}>{leftFact.label}</div>
      <div style={logoFactValue}>{leftFact.value}</div>
      <div style={logoFactDetail}>{leftFact.detail}</div>
    </div>
  ) : null}
</div>

<h1 style={pageTitle}>{track.track_name}</h1>


            <div style={locationLine}>
              {[track.city, track.state].filter(Boolean).join(", ") ||
                "Location unknown"}
            </div>

            {track.track_status ? (
              <div style={statusLine}>Status: {track.track_status}</div>
            ) : null}

            {archiveBadges.length > 0 ? (
              <div style={archiveBadgesWrap} className="track-archive-badges">
                {archiveBadges.map((badge) => (
                  <span
                    key={`${badge.icon}-${badge.label}`}
                    style={archiveBadge}
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
                Historic racing venue with deep regional significance. Full
                records and archives continue to be expanded.
              </p>
            )}

            <div style={metaGrid} className="track-meta-grid">
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
  <div style={metaLabel}>Results Discovered</div>
  <div style={metaValue}>
    {availableYears.length > 0
      ? `${availableYears[0]}–Present`
      : "Unknown"}
  </div>
</div>

              <div style={metaCard}>
                <div style={metaLabel}>Feature Wins Discovered</div>
                <div style={metaValue}>
                  {featureWinsCount ?? 0}
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
        src={getPhotoUrl(heroPhotoItem)}
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

      {rightFact ? (
        <div style={heroFactCard}>
          <div style={factEyebrow}>{rightFact.label}</div>
          <div style={heroFactTitle}>{rightFact.title}</div>
          <div style={heroFactText}>{rightFact.text}</div>

          <Link href={rightFact.href} style={heroFactLink}>
            {rightFact.linkLabel}
          </Link>
        </div>
      ) : null}
    </div>
  )}
</div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={threeColGrid} className="track-three-col-grid">
          <InfoPanel title="Top Winners">
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
          </InfoPanel>

          <InfoPanel title="Top Champions">
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
          </InfoPanel>

          <InfoPanel title="Feature Wins by Class">
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
          </InfoPanel>
        </div>
      </section>

      <section style={photosSection}>
        <h2 style={photosHeading}>Photo Archive</h2>

        {profilePhotos.length === 0 ? (
          <div style={emptyArchiveBox}>No photos available yet.</div>
        ) : (
          <>
            <div style={photoGrid} className="track-photo-grid">
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
                          src={getPhotoUrl(photo)}
                          alt={driverName}
                          style={{ ...photoImage, cursor: "pointer" }}
                        />
                      </Link>
                    ) : (
                      <img
                        src={getPhotoUrl(photo)}
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
          Recent grouped results from this track. Full records continue to be
          expanded.
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
                  {day.races.map((r: any, idx: number) => (
                    <div
                      key={`${r.class_name}-${r.race_date}-${idx}`}
                      style={resultRaceCard}
                      className="track-result-race-card"
                    >
                      <div style={resultClassName}>
                        {r.class_name || "Unknown Class"}
                      </div>

                      <div style={resultFinishGrid}>
                        <div style={resultFinishItem}>
                          <span style={resultFinishLabel}>Winner</span>
                          <span style={resultFinishName}>
                            {displayDriver(
                              r.first_place_name,
                              r.first_place_driver_slug
                            )}
                          </span>
                        </div>

                        <div style={resultFinishItem}>
                          <span style={resultFinishLabel}>2nd</span>
                          <span style={resultFinishName}>
                            {displayDriver(
                              r.second_place_name,
                              r.second_place_driver_slug
                            )}
                          </span>
                        </div>

                        <div style={resultFinishItem}>
                          <span style={resultFinishLabel}>3rd</span>
                          <span style={resultFinishName}>
                            {displayDriver(
                              r.third_place_name,
                              r.third_place_driver_slug
                            )}
                          </span>
                        </div>

                        <div style={resultFinishItem}>
                          <span style={resultFinishLabel}>4th</span>
                          <span style={resultFinishName}>
                            {displayDriver(
                              r.fourth_place_name,
                              r.fourth_place_driver_slug
                            )}
                          </span>
                        </div>
                      </div>
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
          <div style={relatedProgramsGrid} className="track-related-programs-grid">
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

function InfoPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={panelCard}>
      <h2 style={panelTitle}>{title}</h2>
      {children}
    </div>
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

const logoWrap: CSSProperties = {
  marginBottom: 0,
  maxWidth: "240px",
}

const logoImg: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "150px",
  objectFit: "contain",
  display: "block",
  mixBlendMode: "multiply",
}

const pageTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(2rem, 4vw, 3.2rem)",
  lineHeight: 1.05,
  color: "#2f2419",
}

const locationLine: CSSProperties = {
  marginTop: 10,
  fontSize: 18,
  color: "#5f4935",
  fontWeight: 600,
}

const statusLine: CSSProperties = {
  marginTop: 8,
  fontSize: 15,
  color: "#755736",
}

const archiveBadgesWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px",
  maxWidth: "760px",
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
  whiteSpace: "normal",
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

const resultRaceCard: CSSProperties = {
  borderTop: "1px solid rgba(0,0,0,0.12)",
  padding: "12px 0",
}

const logoFactRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(170px, 0.8fr) minmax(220px, 1.2fr)",
  gap: 22,
  alignItems: "center",
  marginBottom: 18,
  maxWidth: 700,
}

const logoFactCard: CSSProperties = {
  padding: "16px 18px",
  borderLeft: "3px solid #9a7440",
  background: "rgba(251, 245, 232, 0.58)",
  borderRadius: "0 12px 12px 0",
}

const factEyebrow: CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "#8a704f",
  fontWeight: 700,
  marginBottom: 7,
}

const logoFactLabel: CSSProperties = {
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6f5434",
  marginBottom: 4,
}

const logoFactValue: CSSProperties = {
  fontSize: 23,
  lineHeight: 1.15,
  color: "#2f2419",
  fontWeight: 800,
  marginBottom: 6,
}

const logoFactDetail: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "#66503b",
}

const heroFactCard: CSSProperties = {
  marginTop: 18,
  padding: "18px",
  background: "#fbf5e8",
  border: "1px solid rgba(115, 88, 52, 0.18)",
  borderRadius: 12,
}

const heroFactTitle: CSSProperties = {
  fontSize: 21,
  lineHeight: 1.2,
  color: "#2f2419",
  fontWeight: 800,
  marginBottom: 8,
}

const heroFactText: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.65,
  color: "#4f3c2b",
}

const heroFactLink: CSSProperties = {
  display: "inline-block",
  marginTop: 12,
  color: "#6c4d22",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
}
const resultClassName: CSSProperties = {
  fontWeight: 800,
  marginBottom: "10px",
  color: "#2f2419",
  fontSize: "18px",
}

const resultFinishGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
}

const resultFinishItem: CSSProperties = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
}

const resultFinishLabel: CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7f684e",
  fontWeight: 700,
}

const resultFinishName: CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.35,
  color: "#2f2419",
  minWidth: 0,
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