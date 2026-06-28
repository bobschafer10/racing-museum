
import Link from "next/link"
import { notFound } from "next/navigation"
import type { CSSProperties } from "react"
import { getNewspaperIssue } from "@/lib/newspapers"
import NewspaperPageViewer from "./NewspaperPageViewer"

export default async function NewspaperIssuePage({
  params,
}: {
  params: Promise<{
    publication: string
    issue: string
  }>
}) {
  const { publication, issue: issueSlug } = await params
  const issue = await getNewspaperIssue(publication, issueSlug)

  if (!issue) notFound()

  const pages = issue.pages.map((image, index) => ({
    label:
      index === 0
        ? "Front Cover"
        : index === issue.pages.length - 1
          ? "Back Cover"
          : `Page ${index + 1}`,
    image,
  }))

 const summary =
  issue.description ||
  `This issue of ${issue.publication}, published on ${issue.title}, preserves a snapshot of short-track racing history through race coverage, photographs, schedules, advertising, and period racing news.`

  return (
  <main style={pageStyle}>
    <section style={heroWrap}>
      <div style={heroGrid}>
        <div style={coverWrap}>
          <img
            src={issue.coverImage}
            alt={`${issue.publication} ${issue.title}`}
            style={coverImage}
          />
        </div>

        <div style={heroText}>
          <div style={eyebrow}>Newspaper Issue</div>
          <h1 style={pageTitle}>{issue.publication}</h1>
          <div style={publicationLine}>{issue.title}</div>

          <div style={issueMeta}>
            {issue.issueDate}
            {(issue.volume || issue.number) && (
              <span> • {issue.volume} {issue.number}</span>
            )}
          </div>

          <p style={summaryText}>{summary}</p>

          <div style={buttonRow}>
            <Link href={`/media/newspapers?publication=${publication}`} style={primaryButton}>
              Back to Newspapers
            </Link>
          </div>
        </div>

        <div style={backCoverPanel}>
  {issue.backCoverImage ? (
    <img
      src={issue.backCoverImage}
      alt={`${issue.publication} ${issue.title} back cover`}
      style={backCoverImage}
    />
  ) : (
    <div style={backCoverPlaceholder}>Back Cover</div>
  )}

  <div style={backCoverCaption}>Back Cover</div>
</div>
      </div>
    </section>

    <section style={sectionStyle}>
      <h2 style={sectionTitle}>Issue Pages</h2>
      <NewspaperPageViewer pages={pages} />
    </section>
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

const insideIssuePanel: CSSProperties = {
  background: "#eadfc7",
  border: "1px solid #c2a97d",
  padding: "16px",
  alignSelf: "stretch",
}

const backCoverPanel: CSSProperties = {
  background: "#eadfc7",
  border: "1px solid #c2a97d",
  padding: "14px",
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
}

const backCoverImage: CSSProperties = {
  width: "100%",
  maxWidth: "300px",
  height: "auto",
  border: "1px solid #b29364",
  background: "#efe7d6",
}

const backCoverCaption: CSSProperties = {
  marginTop: "10px",
  fontSize: "14px",
  fontWeight: 700,
  color: "#5f4935",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const backCoverPlaceholder: CSSProperties = {
  width: "100%",
  maxWidth: "300px",
  aspectRatio: "3 / 4",
  border: "1px dashed #b29364",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#7a6348",
  fontStyle: "italic",
}

const insideIssueEyebrow: CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#7a6348",
  fontWeight: 700,
  marginBottom: "14px",
}

const insideIssueText: CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.65,
  color: "#3d2e1f",
}

const insideIssueRule: CSSProperties = {
  margin: "16px 0",
  border: 0,
  borderTop: "1px solid #c2a97d",
}

const highlightList: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  lineHeight: 1.6,
  color: "#5b4630",
  fontSize: "14px",
}

const insideIssueEmpty: CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.5,
  color: "#7a6348",
  fontStyle: "italic",
}