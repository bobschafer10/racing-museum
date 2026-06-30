import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewspaperIssuesByPublication } from "@/lib/newspapers"
import "../newspapers.css"

const PUBLICATION_LOGOS: Record<string, string> = {
  "checkered-flag-racing-news": "/newspaper-assets/checkered-flag-racing-news.jpg",
  "midwest-racing-news": "/newspaper-assets/midwest-racing-news.jpg",
  "national-speed-sport-news": "/newspaper-assets/national-speed-sport-news.jpg",
  "hawkeye-racing-news": "/newspaper-assets/hawkeye-racing-news.jpg",
  "all-the-dirt-racing-news": "/newspaper-assets/all-the-dirt-racing-news.jpg",
}

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ publication: string }>
}) {
  const { publication } = await params
  const issues = await getNewspaperIssuesByPublication(publication)

  if (!issues.length) notFound()

  const publicationName = issues[0].publication
  const years: Record<string, number> = {}

  issues.forEach((issue) => {
    years[String(issue.year)] = (years[String(issue.year)] || 0) + 1
  })

  const sortedYears = Object.keys(years).sort()

  return (
    <main className="newspapers-page">
      <section className="newspapers-hero compact">
        <div className="hero-copy">
          <p className="eyebrow">Newspaper Archive</p>

          {PUBLICATION_LOGOS[publication] && (
            <img
              src={PUBLICATION_LOGOS[publication]}
              alt={publicationName}
              className="publication-hero-logo"
            />
          )}

          <h1>{publicationName}</h1>
          <p>Browse available years from the {publicationName} archive.</p>

          <Link href="/media/newspapers" className="back-link">
            ← Back to Newspapers
          </Link>
        </div>
      </section>

      <section className="archive-main full-width">
        <div className="publication-year-group">
          <div className="publication-year-header color-0">
            <h3>{publicationName}</h3>
            <p>
              {sortedYears[0]} – {sortedYears[sortedYears.length - 1]} •{" "}
              {issues.length} Issues
            </p>
          </div>

          <div className="year-grid">
            {sortedYears.map((year) => (
              <Link
                key={year}
                href={`/media/newspapers/${publication}/year/${year}`}
                className="year-card"
              >
                <strong>{year}</strong>
                <em />
                <span>{years[year]} Issues</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}