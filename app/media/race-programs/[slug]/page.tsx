import Link from "next/link"
import { notFound } from "next/navigation"
import { getRaceProgramBySlug } from "@/lib/race-programs"

export default async function RaceProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const program = await getRaceProgramBySlug(slug)

  if (!program) notFound()

  return (
    <main style={styles.viewerDesk}>
      <section style={styles.viewerToolbar}>
        <Link href="/media/race-programs" style={styles.backLink}>
          ← Back to Printed Archive
        </Link>

        <div style={styles.viewerLabel}>Museum Scan Viewer</div>
      </section>

      <section style={styles.programHeader}>
        <div>
          <div style={styles.eyebrow}>{program.type ?? "Program"}</div>
          <h1 style={styles.title}>{program.title}</h1>

          <div style={styles.metaRow}>
            <span style={styles.metaChip}>{program.year ?? "Unknown Year"}</span>

            {program.track ? (
              <span style={styles.metaChip}>{program.track}</span>
            ) : null}

            {program.series ? (
              <span style={styles.metaChip}>{program.series}</span>
            ) : null}
          </div>
        </div>

        {program.coverImage ? (
          <img
            src={program.coverImage}
            alt={program.title}
            style={styles.coverPreview}
          />
        ) : null}
      </section>

      <section style={styles.openProgram}>
        {program.images.length === 0 ? (
          <div style={styles.emptyPanel}>No scanned pages found.</div>
        ) : (
          <div style={styles.pagesStack}>
            {program.images.map((image, index) => (
              <figure key={image} style={styles.pageFrame}>
                <img
                  src={image}
                  alt={`${program.title} page ${index + 1}`}
                  style={styles.pageImage}
                />
                <figcaption style={styles.pageCaption}>
                  Page {index + 1} of {program.images.length}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  viewerDesk: {
    minHeight: "100vh",
    padding: "34px 18px 80px",
    background:
      "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.12), transparent 24%), linear-gradient(135deg, #3a2515 0%, #6b4525 48%, #2d1c10 100%)",
  },

  viewerToolbar: {
    maxWidth: 1180,
    margin: "0 auto 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#fff4df",
  },

  backLink: {
    color: "#fff4df",
    textDecoration: "none",
    fontWeight: 900,
  },

  viewerLabel: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#f4dfb8",
  },

  programHeader: {
    maxWidth: 1180,
    margin: "0 auto 24px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 150px",
    gap: 24,
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    background: "rgba(246, 234, 210, 0.94)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#76562f",
    marginBottom: 10,
  },

  title: {
    margin: 0,
    fontSize: "clamp(2rem, 4vw, 4rem)",
    lineHeight: 1,
    color: "#2f2115",
    letterSpacing: "-0.04em",
  },

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 16,
  },

  metaChip: {
    display: "inline-flex",
    padding: "7px 10px",
    borderRadius: 999,
    background: "#3a2a1b",
    color: "#fff1d0",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },

  coverPreview: {
    width: "100%",
    borderRadius: 14,
    boxShadow: "0 14px 28px rgba(45, 31, 18, 0.28)",
  },

  openProgram: {
    maxWidth: 980,
    margin: "0 auto",
    padding: 26,
    borderRadius: 26,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0)), #f6ead2",
    boxShadow:
      "0 28px 70px rgba(0,0,0,0.38), inset 0 0 0 1px rgba(80,55,29,0.18)",
  },

  pagesStack: {
    display: "grid",
    gap: 30,
  },

  pageFrame: {
    margin: 0,
    padding: 18,
    borderRadius: 22,
    background: "#fbf3df",
    boxShadow:
      "0 18px 38px rgba(42, 27, 14, 0.22), inset 0 0 0 1px rgba(91, 62, 31, 0.14)",
  },

  pageImage: {
    width: "100%",
    display: "block",
    borderRadius: 12,
    background: "#eadcc3",
  },

  pageCaption: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#76562f",
  },

  emptyPanel: {
    padding: 24,
    borderRadius: 18,
    background: "#fbf3df",
    color: "#5a4634",
    fontSize: 16,
    lineHeight: 1.6,
  },
}