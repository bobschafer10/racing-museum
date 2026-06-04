import Link from "next/link"
import { notFound } from "next/navigation"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabase"

export default async function TrackClassWinnersPage({
  params,
}: {
  params: Promise<{ slug: string; className: string }>
}) {
  const { slug, className } = await params
  const decodedClassName = decodeURIComponent(className)

const logoPath = `/logos/tracks/${slug}.jpg`

  const { data: track } = await supabase
    .from("track_profile_view_v3")
    .select("slug, track_name, city, state")
    .eq("slug", slug)
    .maybeSingle()

  if (!track) notFound()

  const { data: results } = await supabase
  .from("global_results_view")
  .select("track_slug, class_name, driver_name, driver_slug, finishing_position")
  .eq("track_slug", slug)
  .eq("class_name", decodedClassName)
  .eq("finishing_position", 1)
  .not("driver_name", "is", null)

  const winnerMap = new Map<string, any>()

  for (const r of results || []) {
    const key = r.driver_slug || r.driver_name

    if (!winnerMap.has(key)) {
      winnerMap.set(key, {
        driver_name: r.driver_name,
driver_slug: r.driver_slug,
        win_count: 0,
      })
    }

    winnerMap.get(key).win_count += 1
  }

  const winners = Array.from(winnerMap.values()).sort(
    (a, b) => b.win_count - a.win_count
  )
const totalFeatures = results?.length || 0

const leadingWinner = winners[0] || null

const { data: trackWinnerPhotos } = leadingWinner?.driver_slug
  ? await supabase
      .from("photos")
      .select("file_name, driver_slug, track_slug, year, photographer_slug")
      .eq("driver_slug", leadingWinner.driver_slug)
      .eq("track_slug", slug)
      .limit(1)
  : { data: [] }

const { data: anyWinnerPhotos } =
  leadingWinner?.driver_slug && (!trackWinnerPhotos || trackWinnerPhotos.length === 0)
    ? await supabase
        .from("photos")
        .select("file_name, driver_slug, track_slug, year, photographer_slug")
        .eq("driver_slug", leadingWinner.driver_slug)
        .limit(1)
    : { data: [] }

const leadingWinnerPhoto =
  trackWinnerPhotos?.[0] || anyWinnerPhotos?.[0] || null
  return (
    <main style={pageStyle}>
      <Link href={`/tracks/${slug}`} style={backLink}>
        ← Back to {track.track_name}
      </Link>

      <section style={heroBox}>
  <div style={heroGrid}>
    <div>
      <div style={eyebrow}>Track Class Leaders</div>

      <img
        src={logoPath}
        alt={`${track.track_name} logo`}
        style={trackLogo}
      />

      <h1 style={pageTitle}>{decodedClassName}</h1>

      <div style={locationLine}>
        {track.track_name}
        {[track.city, track.state].filter(Boolean).length > 0
          ? ` • ${[track.city, track.state].filter(Boolean).join(", ")}`
          : ""}
      </div>

      <div style={summaryLine}>
        {totalFeatures} recorded feature race{totalFeatures === 1 ? "" : "s"} in this class
      </div>
    </div>

    <div style={leaderBox}>
  <div style={leaderLabel}>Leading Winner</div>

  {leadingWinnerPhoto ? (
    <Link href={`/drivers/${leadingWinner.driver_slug}`} style={{ display: "block" }}>
  <img
    src={`/photos/${leadingWinnerPhoto.file_name}`}
    alt={leadingWinner?.driver_name || "Leading winner"}
    style={leaderPhoto}
  />
</Link>
  ) : (
    <div style={leaderPhotoPlaceholder}>Photo Coming Soon</div>
  )}

  {leadingWinner && (
    <div style={leaderName}>
  <Link href={`/drivers/${leadingWinner.driver_slug}`} style={inlineLink}>
    {leadingWinner.driver_name}
  </Link>{" "}
  — {leadingWinner.win_count} wins
</div>
  )}
</div>
  </div>
</section>

      <section style={panelCard}>
  <h2 style={sectionTitle}>All-Time Feature Winners</h2>

  {winners.length === 0 ? (
    <div style={emptyPanel}>
      No feature winners found for this class at this track.
    </div>
  ) : (
    <>
      <div style={tableHeader}>
        <div>Driver</div>
        <div>Wins</div>
      </div>

      <div style={listWrap}>
        {winners.map((w, idx) => (
          <div key={`${w.driver_slug || w.driver_name}-${idx}`} style={listRow}>
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
    </>
  )}
</section>
    </main>
  )
}

const pageStyle: CSSProperties = {
  maxWidth: "1000px",
  margin: "0 auto",
  padding: "34px 18px 80px",
}

const backLink: CSSProperties = {
  display: "inline-block",
  marginBottom: 18,
  color: "#6c4d22",
  fontWeight: 700,
  textDecoration: "none",
}

const heroBox: CSSProperties = {
  background: "#f3ead7",
  border: "1px solid rgba(115, 88, 52, 0.24)",
  borderRadius: 18,
  padding: "26px 24px",
  boxShadow: "0 10px 28px rgba(60, 40, 20, 0.06)",
  marginBottom: 24,
}

const eyebrow: CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#7a6348",
  marginBottom: 10,
}

const pageTitle: CSSProperties = {
  margin: 0,
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

const panelCard: CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const sectionTitle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 28,
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
  fontSize: 16,
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

const inlineLink: CSSProperties = {
  textDecoration: "none",
  color: "#6c4d22",
  fontWeight: 700,
}

const summaryLine: CSSProperties = {
  marginTop: 10,
  fontSize: 15,
  color: "#6b5643",
  fontWeight: 600,
}

const tableHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#7f684e",
  borderBottom: "1px solid rgba(115, 88, 52, 0.22)",
  paddingBottom: 8,
  marginBottom: 10,
}

const heroGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 340px",
  gap: 28,
  alignItems: "center",
}

const trackLogo: CSSProperties = {
  maxWidth: "320px",
  maxHeight: "110px",
  objectFit: "contain",
  display: "block",
  marginBottom: 14,
  mixBlendMode: "multiply",
}

const leaderBox: CSSProperties = {
  background: "#fbf5e8",
  border: "1px solid rgba(115, 88, 52, 0.18)",
  borderRadius: 14,
  padding: 12,
  textAlign: "center",
}

const leaderLabel: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#7f684e",
  marginBottom: 8,
}

const leaderPhoto: CSSProperties = {
  width: "100%",
  height: "190px",
  objectFit: "cover",
  borderRadius: 10,
  border: "1px solid #b29364",
  background: "#efe7d6",
}

const leaderPhotoPlaceholder: CSSProperties = {
  height: "160px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid #b29364",
  background: "#efe7d6",
  color: "#7a6348",
  fontStyle: "italic",
}

const leaderName: CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  fontWeight: 700,
  color: "#5a3a1b",
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