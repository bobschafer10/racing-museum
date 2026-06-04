import Link from "next/link"

const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "24px 18px 80px",
}

const heroPanel: React.CSSProperties = {
  background: "linear-gradient(180deg, #f4ead6 0%, #eadcc3 100%)",
  border: "1px solid rgba(115, 88, 52, 0.24)",
  borderRadius: 18,
  padding: "42px 28px",
  boxShadow: "0 10px 28px rgba(60, 40, 20, 0.08)",
}

const eyebrow: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#7a6348",
  marginBottom: 10,
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
  lineHeight: 1.05,
  color: "#2f2419",
}

const introStyle: React.CSSProperties = {
  marginTop: 16,
  maxWidth: 860,
  fontSize: 17,
  lineHeight: 1.75,
  color: "#554332",
}

const panel: React.CSSProperties = {
  marginTop: 28,
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  padding: "24px 22px",
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const sectionTitle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 28,
  color: "#34271c",
}

const textStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: "#5c4836",
}

const listStyle: React.CSSProperties = {
  margin: "14px 0 0 18px",
  color: "#5c4836",
  lineHeight: 1.8,
}

const actionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 22,
}

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 999,
  textDecoration: "none",
  background: "#7b5c34",
  color: "#fff8ee",
  fontWeight: 700,
  border: "1px solid #7b5c34",
}

const ghostButton: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: 999,
  textDecoration: "none",
  background: "rgba(255,255,255,0.6)",
  color: "#5a442d",
  fontWeight: 700,
  border: "1px solid rgba(123, 92, 52, 0.28)",
}

export default function PhotosPage() {
  return (
    <main style={pageWrap}>
      <section style={heroPanel}>
        <div style={eyebrow}>Media Archive</div>
        <h1 style={titleStyle}>Through the Lens</h1>

        <p style={introStyle}>
          This collection will preserve historic racing photographs featuring
          drivers, cars, tracks, crews, fans, victory lane moments, and the
          atmosphere that surrounded race night across the Upper Midwest.
        </p>

        <div style={actionRow}>
          <Link href="/media" style={ghostButton}>
            Back to Media Archive
          </Link>
          <Link href="/tracks" style={ghostButton}>
            Explore Tracks
          </Link>
          <Link href="/drivers" style={ghostButton}>
            Explore Drivers
          </Link>
        </div>
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}>Collection Coming Soon</h2>
        <p style={textStyle}>
          This door has not been fully opened yet. The photo archive is planned
          as a searchable, browsable collection connected to tracks, drivers,
          series, events, and photographers.
        </p>

        <ul style={listStyle}>
          <li>Driver and car photo galleries</li>
          <li>Track and facility photography</li>
          <li>Photographer collections and credits</li>
          <li>Linked images on driver, track, and series pages</li>
          <li>Historic captions, tags, and year-based browsing</li>
        </ul>

        <div style={actionRow}>
          <Link href="/media/race-programs" style={buttonStyle}>
            View Race Programs
          </Link>
        </div>
      </section>
    </main>
  )
}