import Link from "next/link"
import manifest from "../../../museum-newspaper-manager/public/data/newspapers-manifest.json"
import "./newspapers.css"

type NewspaperIssue = {
  slug: string
  title: string
  publication: string
  publicationSlug: string
  year: number
  coverImage?: string
  thumbnail?: string
}

const PUBLICATION_LOGOS: Record<string, string> = {
  "all-the-dirt-racing-news": "/newspaper-assets/all-the-dirt-racing-news.jpg",
  "checkered-flag-racing-news": "/newspaper-assets/checkered-flag-racing-news.jpg",
  "hawkeye-racing-news": "/newspaper-assets/hawkeye-racing-news.jpg",
  "midwest-racing-news": "/newspaper-assets/midwest-racing-news.jpg",
  "national-speed-sport-news": "/newspaper-assets/national-speed-sport-news.jpg",
}

const HERO_PAPERS = [
  "/newspaper-assets/CFRN 5.2.1984.jpg",
  "/newspaper-assets/1(1).jpg",
  "/newspaper-assets/Page 1(2).jpg",
]

export default function NewspapersPage() {
  const issues = manifest as NewspaperIssue[]

  const publications = Object.values(
    issues.reduce((acc, issue) => {
      const slug = issue.publicationSlug

      if (!acc[slug]) {
        acc[slug] = {
          slug,
          name: issue.publication,
          issues: [] as NewspaperIssue[],
          years: {} as Record<string, number>,
        }
      }

      acc[slug].issues.push(issue)
      acc[slug].years[String(issue.year)] =
        (acc[slug].years[String(issue.year)] || 0) + 1

      return acc
    }, {} as Record<string, { slug: string; name: string; issues: NewspaperIssue[]; years: Record<string, number> }>)
  )

  const totalIssues = issues.length
  const allYears = new Set(issues.map((issue) => issue.year))

  return (
    <main className="newspapers-page">
      <section className="newspapers-hero">
        <div className="hero-copy">
          <p className="eyebrow">Media Archive</p>
          <h1>Newspapers</h1>
          <p>Browse historic racing newspapers by publication, year, and issue.</p>

          <div className="hero-logo-strip">
            {Object.entries(PUBLICATION_LOGOS).map(([slug, src]) => (
              <img key={slug} src={src} alt="" />
            ))}
          </div>
        </div>

        <div className="hero-paper-stack">
          {HERO_PAPERS.map((src, index) => (
            <img key={src} src={src} alt="" className={`hero-paper paper-${index + 1}`} />
          ))}
        </div>
      </section>

      <div className="newspapers-layout">
        <aside className="publication-sidebar">
          <h2>▣ Newspaper Publications</h2>

          {publications.map((pub) => {
            const sortedYears = Object.keys(pub.years).sort()
            return (
              <Link key={pub.slug} href={`/media/newspapers/${pub.slug}`} className="publication-card">
                {PUBLICATION_LOGOS[pub.slug] && (
                  <img src={PUBLICATION_LOGOS[pub.slug]} alt={pub.name} className="publication-logo-img" />
                )}

                <h3>{pub.name}</h3>
                <p>{sortedYears[0]} – {sortedYears[sortedYears.length - 1]}</p>
                <strong>{pub.issues.length} Issues</strong>
                <span>Browse Archive →</span>
              </Link>
            )
          })}

          <div className="archive-stats">
            <h2>Archive Statistics</h2>
            <div><strong>{totalIssues}</strong><span>Total Issues</span></div>
            <div><strong>{publications.length}</strong><span>Publications</span></div>
            <div><strong>{allYears.size}</strong><span>Years Covered</span></div>
          </div>
        </aside>

        <section className="archive-main">
          <div className="section-title">
            <h2>▣ Browse by Year</h2>
          </div>

          {publications.map((pub, index) => {
            const sortedYears = Object.keys(pub.years).sort()
            return (
              <section key={pub.slug} className="publication-year-group">
                <div className={`publication-year-header color-${index % 3}`}>
                  <h3>{pub.name}</h3>
                  <p>{sortedYears[0]} – {sortedYears[sortedYears.length - 1]} • {pub.issues.length} Issues</p>
                </div>

                <div className="year-grid">
                  {sortedYears.map((year) => (
                    <Link key={year} href={`/media/newspapers/${pub.slug}/year/${year}`} className="year-card">
                      <strong>{year}</strong>
                      <em />
                      <span>{pub.years[year]} Issues</span>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </section>
      </div>
    </main>
  )
}