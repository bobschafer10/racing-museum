import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import fs from "fs"
import path from "path"
import type { CSSProperties } from "react"
import NewspaperPageViewer from "./NewspaperPageViewer"

type IssuePageData = {
  slug: string
  publicationTitle: string
  issueTitle: string
  issueDate: string
  volume?: string
  number?: string
  summary: string
  coverImage: string
  pages: { label: string; image: string }[]
  highlights: { title: string; pageLabel: string; note?: string }[]
  topHighlights: string[]
  relatedTracks: { name: string; slug: string }[]
  relatedDrivers: string[]
}

function getPageSortValue(file: string, coverFile: string) {
  const lower = file.toLowerCase()

  if (file === coverFile || lower.includes("front")) return 0
  if (lower.includes("back")) return 9999

  const pageNum = lower.match(/^(\d+)/)?.[1]
  return pageNum ? Number(pageNum) : 5000
}

function getIssueData(
  publicationSlug: string,
  issueSlug: string
): IssuePageData | null {
  const issueDir = path.join(
    process.cwd(),
    "public",
    "media",
    "newspapers",
    publicationSlug,
    issueSlug
  )

  const metaPath = path.join(issueDir, "meta.json")

  if (!fs.existsSync(issueDir) || !fs.existsSync(metaPath)) {
    return null
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"))

    const coverFile =
      meta.coverImage ||
      (fs.existsSync(path.join(issueDir, "front_cover.jpg"))
        ? "front_cover.jpg"
        : fs.existsSync(path.join(issueDir, "front-cover.jpg"))
          ? "front-cover.jpg"
          : "")

    if (!coverFile) return null

    const imageFiles = fs
      .readdirSync(issueDir)
      .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .sort((a, b) => {
        const aSort = getPageSortValue(a, coverFile)
        const bSort = getPageSortValue(b, coverFile)

        return aSort - bSort || a.localeCompare(b)
      })

    const pages = imageFiles.map((file, index) => {
  const lower = file.toLowerCase()

  let label = `Page ${index + 1}`

  if (file === coverFile || lower.includes("front")) {
    label = "Front Cover"
  } else if (lower.includes("back")) {
    label = "Back Cover"
  } else {
    const pageNum = lower.match(/page[_-]?(\d+)/)?.[1] || lower.match(/^(\d+)/)?.[1]
    label = pageNum ? `Page ${Number(pageNum)}` : `Page ${index + 1}`
  }

  return {
    label,
    image: `/media/newspapers/${publicationSlug}/${issueSlug}/${file}`,
  }
})

    return {
      slug: issueSlug,
      publicationTitle: meta.publicationTitle || "Newspaper",
      issueTitle: meta.issueTitle || meta.issueDate || issueSlug,
      issueDate: meta.issueDate || meta.issueTitle || issueSlug,
      volume: meta.volume || "",
      number: meta.number || "",
      summary:
        meta.summary ||
        "Historic racing newspaper issue featuring race coverage, results, photos, standings, and regional reporting.",
      coverImage: `/media/newspapers/${publicationSlug}/${issueSlug}/${coverFile}`,
      pages,
      highlights: meta.highlights || [],
      topHighlights: meta.topHighlights || [],
      relatedTracks: meta.relatedTracks || [],
      relatedDrivers: meta.relatedDrivers || [],
    }
  } catch {
    return null
  }
}

export default async function NewspaperIssuePage({
  params,
}: {
  params: Promise<{
    publication: string
    issue: string
  }>
}) {
  const { publication, issue: issueSlug } = await params
  const issue = getIssueData(publication, issueSlug)

  if (!issue) notFound()

  return (
    <main style={pageStyle}>
      <section style={heroWrap}>
        <div style={heroGrid}>
          <div style={coverWrap}>
            <Image
              src={issue.coverImage}
              alt={issue.issueTitle}
              width={420}
              height={560}
              style={coverImage}
              priority
            />
          </div>

          <div style={heroText}>
            <div style={eyebrow}>Newspaper Issue</div>
            <h1 style={pageTitle}>{issue.publicationTitle}</h1>
            <div style={publicationLine}>{issue.issueTitle}</div>

            <div style={issueMeta}>
              {issue.issueDate}
              {(issue.volume || issue.number) && (
                <span>
                  {" "}
                  • {issue.volume} {issue.number}
                </span>
              )}
            </div>

            <p style={summaryText}>{issue.summary}</p>

            <div style={buttonRow}>
              <Link
                href={`/media/newspapers?publication=${publication}`}
                style={primaryButton}
              >
                Back to Newspapers
              </Link>
            </div>
          </div>

          <div style={insideIssuePanel}>
            <div style={insideIssueEyebrow}>Inside This Issue</div>

            {issue.topHighlights.length > 0 ? (
              <ul style={insideIssueList}>
                {issue.topHighlights.map((item, index) => (
                  <li key={`${item}-${index}`} style={insideIssueItem}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={insideIssueEmpty}>
                Add issue highlights in this issue&apos;s meta.json file.
              </div>
            )}
          </div>
        </div>
      </section>

      {issue.highlights.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Featured Highlights</h2>

          <div style={highlightGrid}>
            {issue.highlights.map((item) => {
              const matchingPage =
                issue.pages.find((page) => page.label === item.pageLabel) ||
                issue.pages[0]

              return (
                <div key={`${item.title}-${item.pageLabel}`} style={highlightCard}>
                  {matchingPage ? (
                    <Image
                      src={matchingPage.image}
                      alt={item.title}
                      width={260}
                      height={360}
                      style={highlightImage}
                    />
                  ) : null}

                  <div style={highlightTitle}>{item.title}</div>
                  <div style={highlightMeta}>{item.pageLabel}</div>
                  {item.note ? <div style={highlightNote}>{item.note}</div> : null}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Issue Pages</h2>
        <NewspaperPageViewer pages={issue.pages} />
      </section>

      {(issue.relatedTracks.length > 0 || issue.relatedDrivers.length > 0) && (
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Related Coverage</h2>

          <div style={relatedWrap}>
            {issue.relatedTracks.length > 0 && (
              <div style={relatedBlock}>
                <div style={relatedHeading}>Tracks</div>
                <div style={tagWrap}>
                  {issue.relatedTracks.map((item, index) => (
                    <Link
                      key={`${item.slug}-${index}`}
                      href={`/tracks/${item.slug}`}
                      style={tagLink}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {issue.relatedDrivers.length > 0 && (
              <div style={relatedBlock}>
                <div style={relatedHeading}>Drivers</div>
                <div style={tagWrap}>
                  {issue.relatedDrivers.map((item, index) => {
                    const driverSlug = item.toLowerCase().replace(/\s+/g, "-")

                    return (
                      <Link
                        key={`${driverSlug}-${index}`}
                        href={`/drivers/${driverSlug}`}
                        style={tagLink}
                      >
                        {item}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

const pageStyle: CSSProperties = {
  maxWidth: "1320px",
  margin: "0 auto",
  padding: "26px 18px 80px",
  color: "#2f2417",
  background: "#eadfc7",
  fontFamily: "Georgia, serif",
}

const heroWrap: CSSProperties = {
  background: "#ddc8a2",
  border: "2px solid #b29364",
  padding: "12px",
  marginBottom: "26px",
}

const heroGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "320px 1fr 340px",
  gap: "24px",
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "18px",
}

const coverWrap: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
}

const coverImage: CSSProperties = {
  width: "100%",
  height: "auto",
  maxWidth: "320px",
  border: "1px solid #b29364",
  background: "#efe7d6",
}

const heroText: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
}

const eyebrow: CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#7a6348",
  marginBottom: "10px",
}

const pageTitle: CSSProperties = {
  fontSize: "42px",
  lineHeight: 1.04,
  margin: "0 0 10px",
  color: "#34271c",
}

const publicationLine: CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  marginBottom: "10px",
}

const issueMeta: CSSProperties = {
  fontSize: "18px",
  color: "#5f4935",
  marginBottom: "18px",
}

const summaryText: CSSProperties = {
  fontSize: "17px",
  lineHeight: 1.7,
  maxWidth: "760px",
  margin: "0 0 18px",
}

const buttonRow: CSSProperties = {
  marginTop: "6px",
}

const primaryButton: CSSProperties = {
  display: "inline-block",
  background: "#7a5827",
  color: "#fff8ea",
  padding: "10px 14px",
  border: "1px solid #5d3f17",
  textDecoration: "none",
}

const sectionStyle: CSSProperties = {
  marginTop: "34px",
}

const sectionTitle: CSSProperties = {
  fontSize: "34px",
  margin: "0 0 14px",
  color: "#34271c",
}

const highlightGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
}

const highlightCard: CSSProperties = {
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "14px",
  minHeight: "80px",
}

const highlightImage: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  border: "1px solid #b29364",
  background: "#efe7d6",
  marginBottom: "10px",
}

const insideIssuePanel: CSSProperties = {
  background: "#eadfc7",
  border: "1px solid #c2a97d",
  padding: "16px",
  alignSelf: "stretch",
}

const insideIssueEyebrow: CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#7a6348",
  fontWeight: 700,
  marginBottom: "14px",
}

const insideIssueList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: "12px",
}

const insideIssueItem: CSSProperties = {
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 700,
  color: "#34271c",
  borderBottom: "1px solid #c2a97d",
  paddingBottom: "10px",
}

const insideIssueEmpty: CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.5,
  color: "#7a6348",
  fontStyle: "italic",
}

const highlightTitle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  marginBottom: "6px",
}

const highlightMeta: CSSProperties = {
  fontSize: "16px",
  color: "#6a5641",
}

const highlightNote: CSSProperties = {
  fontSize: "14px",
  color: "#7a6348",
  marginTop: "6px",
  lineHeight: 1.4,
}

const relatedWrap: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
}

const relatedBlock: CSSProperties = {
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "14px",
}

const relatedHeading: CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  marginBottom: "12px",
  color: "#34271c",
}

const tagWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
}

const tagLink: CSSProperties = {
  display: "inline-block",
  background: "#e7d7b7",
  border: "1px solid #b29364",
  padding: "6px 10px",
  fontSize: "15px",
  color: "#3b2b19",
  textDecoration: "none",
}