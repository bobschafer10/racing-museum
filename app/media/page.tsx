import Link from "next/link"

type ArchiveSection = {
  title: string
  href: string
  description: string
  status: "Open Now" | "Coming Soon"
  isLive: boolean
  isFeatured?: boolean
  buttonText: string
}

const pageWrap: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "24px 18px 80px",
}

const heroPanel: React.CSSProperties = {
  background: "linear-gradient(180deg, #f4ead6 0%, #eadcc3 100%)",
  border: "1px solid rgba(115, 88, 52, 0.30)",
  borderRadius: 18,
  padding: "42px 28px",
  boxShadow: "0 10px 28px rgba(60, 40, 20, 0.08)",
  marginBottom: 30,
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
  fontSize: "clamp(2.2rem, 4vw, 3.8rem)",
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

const taglineStyle: React.CSSProperties = {
  marginTop: 14,
  maxWidth: 860,
  fontSize: 18,
  lineHeight: 1.65,
  color: "#4e3d2b",
  fontStyle: "italic",
}

const actionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 24,
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

const sectionStyle: React.CSSProperties = {
  marginTop: 34,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 30,
  margin: "0 0 12px",
  color: "#34271c",
}

const sectionIntro: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: "#5c4836",
  maxWidth: 940,
  marginBottom: 18,
}

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
}

const infoCard: React.CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.30)",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const infoCardTitle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 22,
  fontWeight: 600,
  color: "#2f2419",
}

const infoCardText: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.6,
  color: "#554332",
}

const archiveGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 20,
}

const archiveCardBase: React.CSSProperties = {
  border: "1px solid rgba(115, 88, 52, 0.30)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.08)",
  display: "flex",
  flexDirection: "column",
  minHeight: 300,
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
}

const archiveCardDefault: React.CSSProperties = {
  background: "#f5eddc",
}

const archiveCardFeatured: React.CSSProperties = {
  background: "#efe3ca",
  border: "2px solid #7b5c34",
}

const statusChipBase: React.CSSProperties = {
  display: "inline-block",
  alignSelf: "flex-start",
  marginBottom: 12,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.03em",
}

const statusChipOpen: React.CSSProperties = {
  background: "#e3d4b8",
  color: "#5b442c",
}

const statusChipSoon: React.CSSProperties = {
  background: "#eadcc3",
  color: "#664f39",
}

const archiveCardTitle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 28,
  fontWeight: 600,
  color: "#2f2419",
}

const archiveCardText: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "#554332",
  marginBottom: 18,
}

const archiveButtonLive: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "auto",
  padding: "10px 18px",
  minWidth: 170,
  minHeight: 42,
  borderRadius: 999,
  textDecoration: "none",
  background: "#7b5c34",
  color: "#fff8ee",
  fontWeight: 700,
  border: "1px solid #7b5c34",
  alignSelf: "flex-start",
  whiteSpace: "nowrap",
}

const archiveButtonDisabled: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "auto",
  padding: "10px 18px",
  minWidth: 150,
  borderRadius: 999,
  textDecoration: "none",
  background: "#cbbca1",
  color: "#6b5a3f",
  fontWeight: 700,
  border: "1px solid #cbbca1",
  alignSelf: "flex-start",
  cursor: "not-allowed",
  opacity: 0.75,
  pointerEvents: "none",
  whiteSpace: "nowrap",
}


const quotePanel: React.CSSProperties = {
  marginTop: 34,
  background: "#efe3ca",
  border: "1px solid rgba(115, 88, 52, 0.30)",
  borderRadius: 16,
  padding: "24px 22px",
  color: "#4f3d2d",
  fontSize: 20,
  lineHeight: 1.7,
  fontStyle: "italic",
}

async function getArchiveSections(): Promise<ArchiveSection[]> {
  return [
    {
      title: "Race Programs",
      href: "/media/race-programs",
      description:
        "A growing archive of race night programs, yearbooks, souvenir books, and special event publications from tracks and series across the Upper Midwest.",
      status: "Open Now",
      isLive: true,
      isFeatured: true,
      buttonText: "View Race Programs",
    },
    {
      title: "Through the Lens",
      href: "/photographers",
      description:
        "Historic racing photographs featuring drivers, cars, tracks, crews, fans, victory lane scenes, and moments captured by photographers across the region.",
      status: "Open Now",
      isLive: true,
      isFeatured: true,
      buttonText: "View Photographers",
    },
    {
  title: "Print Media",
  href: "/media/newspapers",
  description:
    "Selected pages and featured material from racing newspapers, magazines, and publications that helped document the sport across decades.",
  status: "Open Now",
  isLive: true,
  isFeatured: true,
  buttonText: "View Newspapers",
},
    {
      title: "Special Event Posters",
      href: "/media/posters",
      description:
        "Event posters, flyers, promotional sheets, and visual pieces that capture how race nights and marquee specials were marketed to fans.",
      status: "Coming Soon",
      isLive: false,
      buttonText: "Coming Soon",
    },
  ]
}

export default async function MediaArchivePage() {
  const sections = await getArchiveSections()

  return (
    <main style={pageWrap}>
      <style>{`
        .archive-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(60, 40, 20, 0.12) !important;
        }
      `}</style>

      <section style={heroPanel}>
        <div style={eyebrow}>Museum Archive</div>
        <h1 style={titleStyle}>Media Archive</h1>

        <p style={introStyle}>
          The Media Archive preserves the printed, photographic, and visual
          material that helps bring Upper Midwest auto racing history to life.
          Here you can move beyond statistics and results to explore the
          publications, images, and artifacts that surrounded the sport.
        </p>

        <p style={taglineStyle}>
          With every click, a new door opens to another piece of auto racing
          history.
        </p>

        <div style={actionRow}>
          <Link href="/tracks" style={ghostButton}>
            Explore Tracks
          </Link>
          <Link href="/drivers" style={ghostButton}>
            Explore Drivers
          </Link>
          <Link href="/series" style={ghostButton}>
            Explore Series
          </Link>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>How the Archive Works</h2>
        <p style={sectionIntro}>
          Each section in the archive is designed as a museum doorway. Instead
          of simply listing files, the archive presents artifacts as part of a
          broader story—connecting publications, photographs, and visual history
          back to the tracks, drivers, series, and events that shaped them.
        </p>

        <div style={infoGrid}>
          <div style={infoCard}>
            <h3 style={infoCardTitle}>Browse the Artifact</h3>
            <p style={infoCardText}>
              Start with covers, key images, and featured content before diving
              into deeper galleries and full documents.
            </p>
          </div>

          <div style={infoCard}>
            <h3 style={infoCardTitle}>Study the Era</h3>
            <p style={infoCardText}>
              The archive helps show not just what happened, but how racing was
              promoted, photographed, remembered, and experienced.
            </p>
          </div>

          <div style={infoCard}>
            <h3 style={infoCardTitle}>Follow the Connections</h3>
            <p style={infoCardText}>
              Each artifact can lead you back into the museum through linked
              series, tracks, drivers, and historic events.
            </p>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Archive Collections</h2>
        <p style={sectionIntro}>
          Explore the growing sections of the museum archive below.
        </p>

        <div style={archiveGrid}>
          {sections.map((section) => {
            const cardStyle: React.CSSProperties = {
              ...archiveCardBase,
              ...(section.isFeatured ? archiveCardFeatured : archiveCardDefault),
            }

            const chipStyle: React.CSSProperties = {
              ...statusChipBase,
              ...(section.status === "Open Now" ? statusChipOpen : statusChipSoon),
            }

            return (
              <article
                key={section.href}
                className="archive-card-hover"
                style={cardStyle}
              >
                <div style={chipStyle}>{section.status}</div>

                <h3 style={archiveCardTitle}>{section.title}</h3>
                <p style={archiveCardText}>{section.description}</p>

                {section.isLive ? (
  <Link href={section.href} style={archiveButtonLive}>
    {section.buttonText}
  </Link>
) : (
  <span style={archiveButtonDisabled}>{section.buttonText}</span>
)}
              </article>
            )
          })}
        </div>
      </section>

      <section style={quotePanel}>
        The Media Archive is where racing history becomes more than numbers. It
        becomes printed pages, photographed moments, and preserved pieces of the
        world that surrounded race night.
      </section>
    </main>
  )
}