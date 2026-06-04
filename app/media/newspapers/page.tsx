import Link from "next/link"
import Image from "next/image"

import type { CSSProperties } from "react"
import {
  getNewspaperIssues,
  newspaperPublications,
} from "@/lib/newspapers"

  

export default async function NewspapersPage({
  searchParams,
}: {
  searchParams?: Promise<{ publication?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const selectedPublication = resolvedSearchParams?.publication ?? "all"

 const issues = await getNewspaperIssues()

  const filteredIssues =
    selectedPublication === "all"
      ? issues
      : issues.filter((issue) => issue.publicationSlug === selectedPublication)

  return (
    <main style={pageStyle}>
      <section style={heroWrap}>
        <div style={heroInner}>
  <div style={newspaperArtifact}>
    <img
      src="/media/newspapers/nssn-corner.png"
      alt="Vintage National Speed Sport News newspaper"
      style={newspaperArtifactImage}
    />
  </div>

  <div style={heroTopGrid}>
    <div>
      <div style={eyebrow}>Media Archive</div>
      <h1 style={pageTitle}>Newspapers</h1>
      <p style={introText}>
        Browse historic newspaper issues featuring race coverage,
        results, photos, standings, and archived reporting from tracks
        across the Upper Midwest.
      </p>
    </div>

    <div style={logoPanel}>
              <div style={logoStripTitle}>Newspaper Publications</div>

              <div style={logoStrip}>
                {newspaperPublications.map((pub) => {
                  const isSelected = selectedPublication === pub.slug
                  const isComingSoon = pub.status === "coming-soon"

                  const logoContent = (
                    <div
                      style={{
                        ...publicationButton,
                        ...(isSelected ? publicationButtonSelected : {}),
                        ...(isComingSoon ? publicationButtonComingSoon : {}),
                      }}
                    >
                     <span style={publicationText}>
  {pub.name}
</span>

                      {isComingSoon && (
                        <span style={comingSoonBadge}>Coming Soon</span>
                      )}
                    </div>
                  )

                  if (isComingSoon) {
                    return (
                      <div key={pub.slug} title={`${pub.name} coming soon`}>
                        {logoContent}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={pub.slug}
                      href={
                        pub.slug === "all"
                          ? "/media/newspapers"
                          : `/media/newspapers?publication=${pub.slug}`
                      }
                      style={publicationLink}
                    >
                      {logoContent}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        {filteredIssues.length === 0 ? (
          <div style={emptyState}>
            No newspaper issues found for this publication yet.
          </div>
        ) : (
          <div style={issuesGrid}>
            {filteredIssues.map((issue) => (
              <Link
                key={issue.slug}
                href={`/media/newspapers/${issue.publicationSlug}/${issue.slug}`}
                style={issueCardLink}
              >
                <article style={issueCard}>
                  <div style={coverWrap}>
                    <Image
                      src={issue.coverImage}
                       alt={`${issue.publication} ${issue.title}`}
                      width={320}
                      height={440}
                      style={coverImage}
                      unoptimized
                    />
                  </div>

                  <div style={issueBody}>
                    <div style={publicationLine}>{issue.publicationTitle}</div>
                    <h2 style={issueTitle}>{issue.issueDate}</h2>

                    {(issue.volume || issue.number) && (
                      <div style={issueMeta}>
                        {issue.volume} {issue.number}
                      </div>
                    )}

                    <p style={issueSummary}>{issue.summary}</p>
                    <div style={issueButton}>Open Issue</div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
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

const heroInner: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "20px",
}

const heroTopGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "22px",
  alignItems: "start",
}

const newspaperArtifact: CSSProperties = {
  position: "absolute",
  top: "16px",
  right: "34px",
  width: "360px",
  maxWidth: "34%",
  transform: "rotate(2deg)",
  opacity: 0.48,
  pointerEvents: "none",
  zIndex: 1,
}

const newspaperArtifactImage: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  filter: "sepia(0.45) grayscale(0.35) contrast(0.85) brightness(1.04)",
  border: "1px solid rgba(122, 105, 70, 0.42)",
  boxShadow: "0 12px 24px rgba(52, 42, 25, 0.18)",
}

const eyebrow: CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#7a6348",
  marginBottom: "10px",
}

const pageTitle: CSSProperties = {
  fontSize: "52px",
  lineHeight: 1.02,
  margin: "0 0 10px",
  color: "#34271c",
}

const introText: CSSProperties = {
  fontSize: "19px",
  lineHeight: 1.7,
  maxWidth: "900px",
  margin: 0,
}

const publicationText: CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: "15px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#3a2f20",
  textAlign: "center",
  lineHeight: 1.25,
}

const logoPanel: CSSProperties = {
  position: "relative",
  zIndex: 2,
  background: "transparent",
  border: "none",
  padding: "80px 0 0",
  width: "100%",
}

const publicationLogo: CSSProperties = {
  width: "100%",
  height: "54px",
  display: "block",
  objectFit: "fill",
  filter: "grayscale(100%) sepia(25%) contrast(0.9)",
}


const logoStrip: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
  gap: "12px",
}

const publicationLink: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
}

const publicationButton: CSSProperties = {
  position: "relative",
  minHeight: "58px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  border: "1px solid rgba(116, 93, 52, 0.45)",
  background: "rgba(255, 252, 239, 0.72)",
  cursor: "pointer",
  overflow: "hidden",
}

const publicationButtonSelected: CSSProperties = {
  border: "2px solid rgba(86, 63, 28, 0.85)",
  background: "rgba(218, 203, 160, 0.7)",
  boxShadow: "0 2px 8px rgba(60, 45, 20, 0.18)",
}

const publicationButtonComingSoon: CSSProperties = {
  opacity: 0.38,
  filter: "grayscale(1)",
  cursor: "not-allowed",
}

const allPublicationsText: CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: "15px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#3a2f20",
  textAlign: "center",
  lineHeight: 1.25,
}

const comingSoonBadge: CSSProperties = {
  position: "absolute",
  right: "8px",
  bottom: "5px",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#5f4a28",
  background: "rgba(238, 230, 204, 0.9)",
  border: "1px solid rgba(116, 93, 52, 0.35)",
  padding: "2px 5px",
}

const sectionStyle: CSSProperties = {
  marginTop: "20px",
}

const issuesGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "20px",
}

const issueCardLink: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
}

const issueCard: CSSProperties = {
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "14px",
  height: "100%",
}

const coverWrap: CSSProperties = {
  marginBottom: "14px",
}

const coverImage: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  border: "1px solid #b29364",
  background: "#efe7d6",
}

const issueBody: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

const publicationLine: CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#34271c",
}

const issueTitle: CSSProperties = {
  fontSize: "32px",
  lineHeight: 1.08,
  margin: 0,
  color: "#34271c",
}

const issueMeta: CSSProperties = {
  fontSize: "16px",
  color: "#6a5641",
}

const issueSummary: CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.65,
  margin: 0,
  color: "#4b3929",
}

const issueButton: CSSProperties = {
  display: "inline-block",
  marginTop: "8px",
  background: "#7a5827",
  color: "#fff8ea",
  padding: "10px 14px",
  border: "1px solid #5d3f17",
  width: "fit-content",
}

const logoStripTitle: CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#7a6348",
  marginBottom: "12px",
  fontWeight: 700,
}

const emptyState: CSSProperties = {
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "18px",
  fontSize: "17px",
  color: "#4b3929",
}