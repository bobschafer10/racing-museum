import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewspaperIssuesByPublication } from "@/lib/newspapers"
import "../../archive-dark.css"

const PUBLICATION_LOGOS: Record<string, string> = {
  "checkered-flag-racing-news": "/newspaper-assets/checkered-flag-racing-news.jpg",
  "midwest-racing-news": "/newspaper-assets/midwest-racing-news.jpg",
  "national-speed-sport-news": "/newspaper-assets/national-speed-sport-news.jpg",
  "hawkeye-racing-news": "/newspaper-assets/hawkeye-racing-news.jpg",
  "all-the-dirt-racing-news": "/newspaper-assets/all-the-dirt-racing-news.jpg",
}

export default async function PublicationPage({ params }: { params: Promise<{ publication: string }> }) {
  const { publication } = await params
  const issues = await getNewspaperIssuesByPublication(publication)
  if (!issues.length) notFound()

  const publicationName = issues[0].publication
  const byYear = issues.reduce((acc, issue) => { acc[String(issue.year)] = (acc[String(issue.year)] || 0) + 1; return acc }, {} as Record<string,number>)
  const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b)
  const totalPages = issues.reduce((sum, issue) => sum + (issue.pages?.length || 0), 0)
  const newest = [...issues].sort((a,b)=>b.issueDate.localeCompare(a.issueDate)).slice(0,6)
  const hero = newest[0]?.coverImage

  return <main className="ma-page">
    <section className="ma-hero" style={hero ? {backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.97),rgba(5,8,10,.8) 52%,rgba(5,8,10,.45)),url(${hero})`,backgroundSize:'cover',backgroundPosition:'center 20%'}:undefined}>
      <div className="ma-hero-inner">
        <div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/media/newspapers">Newspapers</Link><span>›</span><span>{publicationName}</span></div>
        <div className="ma-hero-grid">
          <div><div className="ma-eyebrow">Newspaper Publication Archive</div><h1 className="ma-title">{publicationName}</h1><div className="ma-subtitle">{years[0]}–{years[years.length-1]}</div><p className="ma-lede">Explore every digitized issue currently preserved for {publicationName}. Browse by year or jump into one of the most recently indexed issues below.</p><div className="ma-actions"><Link href="/media/newspapers" className="ma-button">All Newspapers</Link><Link href="/media" className="ma-button-ghost">Media Archive</Link></div></div>
          <div className="ma-hero-media">{PUBLICATION_LOGOS[publication] ? <img className="ma-logo" src={PUBLICATION_LOGOS[publication]} alt={publicationName} /> : null}</div>
        </div>
        <div className="ma-stats"><div className="ma-stat"><strong>{issues.length}</strong><span>Digitized Issues</span></div><div className="ma-stat"><strong>{years.length}</strong><span>Years Represented</span></div><div className="ma-stat"><strong>{totalPages.toLocaleString()}</strong><span>Preserved Pages</span></div><div className="ma-stat"><strong>{years[0]}</strong><span>Earliest Year</span></div><div className="ma-stat"><strong>{years[years.length-1]}</strong><span>Latest Year</span></div></div>
      </div>
    </section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Publication Timeline</div><h2 className="ma-h2">Browse by Year</h2></div><div className="ma-note">Each year opens the complete issue set currently preserved for that season.</div></div><div className="ma-year-grid">{years.slice().reverse().map(year => <Link key={year} className="ma-year" href={`/media/newspapers/${publication}/year/${year}`}><strong>{year}</strong><span>{byYear[String(year)]} issue{byYear[String(year)]===1?'':'s'}</span></Link>)}</div></section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Latest Indexed Material</div><h2 className="ma-h2">Featured Issues</h2></div><div className="ma-note">A quick doorway into the publication archive.</div></div><div className="ma-grid-3">{newest.map(issue => <Link key={issue.slug} className="ma-card" href={`/media/newspapers/${publication}/${issue.slug}`}><div className="ma-card-media contain"><img src={issue.coverImage} alt={`${publicationName} ${issue.title}`} /></div><div className="ma-card-body"><div className="ma-card-label">{issue.year} • {issue.pages.length} pages</div><div className="ma-card-title">{issue.title}</div><div className="ma-card-meta">{issue.volume ? `Volume ${issue.volume}` : 'Digitized newspaper issue'}</div><span className="ma-card-link">Open issue →</span></div></Link>)}</div></section>

    <section className="ma-section"><div className="ma-footer-links"><Link href="/media/newspapers" className="ma-footer-link">Newspaper Archive<span>All publications →</span></Link><Link href="/media/race-programs" className="ma-footer-link">Race Programs<span>Browse publications →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}