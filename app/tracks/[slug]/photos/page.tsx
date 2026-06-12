import Link from "next/link"
import { notFound } from "next/navigation"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabase"

function getPhotoUrl(photo: any) {
  if (!photo?.file_name) return ""

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  const rawTrackSlug = photo.track_slug || photo.file_name.split("_")[0]
  const trackSlug = rawTrackSlug.replace(/-(wi|il|mn|mi)$/i, "")

  const year = photo.year || photo.file_name.split("_")[1] || "unknown-year"

  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

export default async function TrackPhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: track } = await supabase
    .from("track_profile_view_v3")
    .select("track_name, slug, city, state")
    .eq("slug", slug)
    .maybeSingle()

  if (!track) {
    notFound()
  }

  const baseSlug = slug.replace(/-(wi|il|mn|mi)$/i, "")

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .or(`track_slug.eq.${slug},track_slug.eq.${baseSlug}`)
    .neq("credit_type", "unknown")
    .order("year", { ascending: false, nullsFirst: false })
    .order("sequence", { ascending: true })

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

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/tracks" style={breadcrumbLink}>Tracks</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href={`/tracks/${slug}`} style={breadcrumbLink}>
              {track.track_name}
            </Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>Photo Archive</span>
          </div>

          <div style={eyebrow}>Track Photo Archive</div>
          <h1 style={pageTitle}>{track.track_name}</h1>

          <p style={locationLine}>
            {[track.city, track.state].filter(Boolean).join(", ") || "Location unknown"}
          </p>

          <p style={introText}>Full photo archive connected to this racing venue.</p>

          <div style={{ marginTop: "14px" }}>
            <Link href={`/tracks/${slug}`} style={backButton}>
              Back to Track Profile
            </Link>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>All Photos</h2>

        {!photos || photos.length === 0 ? (
          <div style={emptyPanel}>No photos available yet.</div>
        ) : (
          <>
            <p style={sectionIntro}>
              Showing {photos.length.toLocaleString()} archived photos for {track.track_name}.
            </p>

            <div style={photoGrid}>
              {photos.map((photo) => {
                const driverName = formatSlugName(photo.driver_slug) || "Unknown Driver"

                const hasDriver =
                  !!photo.driver_slug &&
                  photo.driver_slug !== "unknown-driver" &&
                  photo.driver_slug !== "unknown"

                const driverHref = hasDriver ? `/drivers/${photo.driver_slug}` : null

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

                      <div>{photo.year || "Year Unknown"}</div>

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
          </>
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
  background: "#f3ead7",
  border: "1px solid rgba(115, 88, 52, 0.24)",
  borderRadius: 18,
  padding: "26px 24px",
  boxShadow: "0 10px 28px rgba(60, 40, 20, 0.06)",
}

const breadcrumbRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  fontSize: "15px",
  marginBottom: "18px",
  color: "#6b4a22",
}

const breadcrumbLink: CSSProperties = {
  color: "#7a5827",
  textDecoration: "none",
}

const breadcrumbSep: CSSProperties = {
  color: "#8d7049",
}

const breadcrumbCurrent: CSSProperties = {
  color: "#4b351d",
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

const introText: CSSProperties = {
  marginTop: 18,
  fontSize: 16,
  lineHeight: 1.75,
  color: "#554332",
  maxWidth: 760,
}

const backButton: CSSProperties = {
  display: "inline-block",
  background: "#7a5827",
  color: "#fff8ea",
  padding: "12px 18px",
  border: "1px solid #5d3f17",
  textDecoration: "none",
  borderRadius: 999,
  fontWeight: 700,
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

const emptyPanel: CSSProperties = {
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

const inlineLink: CSSProperties = {
  textDecoration: "none",
  color: "#6c4d22",
  fontWeight: 700,
}