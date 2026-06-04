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

export default function PrintMediaPage() {
  return (
    <main style={pageWrap}>
      <section style={heroPanel}>
        <div style={eyebrow}>Media Archive</div>
        <h1 style={titleStyle}>Print Media</h1>

        <p style={introStyle}>
          This collection will feature selected pages and highlighted content
          from racing newspapers, magazines, newsletters, and other print
          publications that documented the sport over time.
        </p>

        <div style={actionRow}>
          <Link href="/media" style={ghostButton}>
            Back to Media Archive
          </Link>
          <Link href="/series" style={ghostButton}>
            Explore Series
          </Link>
          <Link href="/tracks" style={ghostButton}>
            Explore Tracks
          </Link>
        </div>
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}>Collection Coming Soon</h2>
        <p style={textStyle}>
          This section is being planned as a curated archive rather than a raw
          document dump. The goal is to feature important stories, memorable
          pages, and publication highlights while connecting them back to the
          rest of the museum.
        </p>

        <ul style={listStyle}>
          <li>Featured pages from racing newspapers and magazines</li>
          <li>Issue highlights tied to drivers, tracks, and series</li>
          <li>Historic article callouts and event coverage</li>
          <li>Selected scans presented as museum artifacts</li>
          <li>Links into related records, standings, and photo collections</li>
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