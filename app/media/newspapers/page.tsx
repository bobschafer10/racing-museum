import Link from "next/link"
import { getNewspaperIssues } from "@/lib/newspapers"
import "../archive-dark.css"

type PublicationGroup = { slug: string; name: string; years: Record<string, number>; issueCount: number; latestCover?: string }

const PUBLICATION_LOGOS: Record<string, string> = {
  "checkered-flag-racing-news": "/newspaper-assets/checkered-flag-racing-news.jpg",
  "midwest-racing-news": "/newspaper-assets/midwest-racing-news.jpg",
  "national-speed-sport-news": "/newspaper-assets/national-speed-sport-news.jpg",
  "hawkeye-racing-news": "/newspaper-assets/hawkeye-racing-news.jpg",
  "all-the-dirt-racing-news": "/newspaper-assets/all-the-dirt-racing-news.jpg",
}

export default async function NewspapersPage() {
  const issues = await getNewspaperIssues()
  const publications = Object.values(issues.reduce((acc, issue) => {
    if (!acc[issue.publicationSlug]) acc[issue.publicationSlug] = { slug: issue.publicationSlug, name: issue.publication, years: {}, issueCount: 0, latestCover: issue.coverImage }
    acc[issue.publicationSlug].years[String(issue.year)] = (acc[issue.publicationSlug].years[String(issue.year)] || 0) + 1
    acc[issue.publicationSlug].issueCount += 1
    acc[issue.publicationSlug].latestCover = issue.coverImage || acc[issue.publicationSlug].latestCover
    return acc
  }, {} as Record<string, PublicationGroup>)).sort((a,b) => b.issueCount - a.issueCount)

  const years = issues.map(i => i.year).filter(Boolean)
  const earliest = years.length ? Math.min(...years) : null
  const latest = years.length ? Math.max(...years) : null
  const pageCount = issues.reduce((sum, issue) => sum + (issue.pages?.length || 0), 0)
  const heroCover = issues.find(i => i.coverImage)?.coverImage

  return (
    <main className="ma-page">
      <section className="ma-hero" style={heroCover ? { backgroundImage: `linear-gradient(90deg,rgba(5,8,10,.97),rgba(5,8,10,.82) 50%,rgba(5,8,10,.48)),url(${heroCover})`, backgroundSize:'cover', backgroundPosition:'center 20%' } : undefined}>
        <div className="ma-hero-inner">
          <div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><span>Newspapers</span></div>
          <div className="ma-hero-grid">
            <div>
              <div className="ma-eyebrow">OCR / Newspaper Archive</div>
              <h1 className="ma-title">Racing Newspapers</h1>
              <div className="ma-subtitle">The Weekly Record of the Sport</div>
              <p className="ma-lede">Browse digitized racing newspapers by publication, year, and issue. These pages preserve results, personalities, advertising, controversy, schedules, photographs, and the day-to-day history surrounding Upper Midwest racing.</p>
              <div className="ma-actions"><Link href="/media" className="ma-button">Back to Media Archive</Link><Link href="/media/search?source=newspaper" className="ma-button-ghost">Search Newspaper OCR</Link><Link href="/media/race-programs" className="ma-button-ghost">Race Programs</Link></div>
            </div>
            <div className="ma-hero-media">
              {publications.slice(0,2).map(pub => PUBLICATION_LOGOS[pub.slug] ? <img key={pub.slug} src={PUBLICATION_LOGOS[pub.slug]} alt={pub.name} className="ma-logo" /> : null)}
            </div>
          </div>
          <div className="ma-stats">
            <div className="ma-stat"><strong>{issues.length.toLocaleString()}</strong><span>Digitized Issues</span></div>
            <div className="ma-stat"><strong>{publications.length}</strong><span>Publications</span></div>
            <div className="ma-stat"><strong>{pageCount.toLocaleString()}</strong><span>Preserved Pages</span></div>
            <div className="ma-stat"><strong>{earliest ?? '—'}</strong><span>Earliest Issue</span></div>
            <div className="ma-stat"><strong>{latest ?? '—'}</strong><span>Latest Issue</span></div>
          </div>
        </div>
      </section>

      <section className="ma-section">
        <div className="ma-section-head"><div><div className="ma-kicker">Browse Publications</div><h2 className="ma-h2">Newspaper Collections</h2></div><div className="ma-note">Open a publication to browse its complete year-by-year issue archive.</div></div>
        <div className="ma-grid-3">
          {publications.map(pub => {
            const pubYears = Object.keys(pub.years).map(Number).sort((a,b)=>a-b)
            return <Link key={pub.slug} href={`/media/newspapers/${pub.slug}`} className="ma-card">
              <div className="ma-card-media contain">{PUBLICATION_LOGOS[pub.slug] ? <img src={PUBLICATION_LOGOS[pub.slug]} alt={pub.name} /> : pub.latestCover ? <img src={pub.latestCover} alt={pub.name} /> : null}</div>
              <div className="ma-card-body"><div className="ma-card-label">Publication Archive</div><div className="ma-card-title">{pub.name}</div><div className="ma-card-meta">{pubYears[0]}–{pubYears[pubYears.length-1]} • {pub.issueCount} issues • {pubYears.length} years represented</div><span className="ma-card-link">Browse publication →</span></div>
            </Link>
          })}
        </div>
      </section>

      <section className="ma-section">
        <div className="ma-section-head"><div><div className="ma-kicker">Research Directory</div><h2 className="ma-h2">Browse by Year</h2></div><div className="ma-note">Jump directly into a year within any newspaper collection.</div></div>
        <div className="ma-grid-2">
          {publications.map(pub => <div className="ma-panel" key={pub.slug}>
            <div className="ma-card-label">{pub.name}</div>
            <div className="ma-card-title">{pub.issueCount} Archived Issues</div>
            <div className="ma-year-grid">{Object.keys(pub.years).sort((a,b)=>Number(b)-Number(a)).map(year => <Link className="ma-year" key={year} href={`/media/newspapers/${pub.slug}/year/${year}`}><strong>{year}</strong><span>{pub.years[year]} issue{pub.years[year]===1?'':'s'}</span></Link>)}</div>
          </div>)}
        </div>
      </section>

      <section className="ma-section"><div className="ma-footer-links"><Link href="/media/search?source=newspaper" className="ma-footer-link">Search Newspaper OCR<span>Search words inside every OCR page →</span></Link><Link href="/media/race-programs" className="ma-footer-link">Race Programs<span>Browse printed publications →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
    </main>
  )
}