import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewspaperIssues } from "@/lib/newspapers"
import "../../../../archive-dark.css"

const CFRN_PARTIAL_ARCHIVE_YEARS = new Set(["1990", "1992", "1995", "1996", "1997", "1998", "1999", "2000", "2001", "2003", "2004", "2005"])

export default async function NewspaperYearPage({ params }: { params: Promise<{ publication: string; year: string }> }) {
  const { publication, year } = await params
  const allIssues = await getNewspaperIssues()
  const issues = allIssues.filter(issue => issue.publicationSlug === publication && String(issue.year) === String(year)).sort((a,b)=>a.issueDate.localeCompare(b.issueDate))
  if (!issues.length) notFound()

  const publicationName = issues[0].publication
  const pageCount = issues.reduce((sum, issue)=>sum+(issue.pages?.length||0),0)
  const hero = issues[0].thumbnailImage || issues[0].thumbnail || issues[0].coverImage
  const isPartialArchive = publication === "checkered-flag-racing-news" && CFRN_PARTIAL_ARCHIVE_YEARS.has(String(year))

  return <main className="ma-page">
    <section className="ma-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.97),rgba(5,8,10,.82) 50%,rgba(5,8,10,.48)),url(${hero})`,backgroundSize:'cover',backgroundPosition:'center top'}}>
      <div className="ma-hero-inner">
        <div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/media/newspapers">Newspapers</Link><span>›</span><Link href={`/media/newspapers/${publication}`}>{publicationName}</Link><span>›</span><span>{year}</span></div>
        <div className="ma-hero-grid"><div><div className="ma-eyebrow">{isPartialArchive ? "Partial Newspaper Year Archive" : "Newspaper Year Archive"}</div><h1 className="ma-title">{publicationName}<br/>{year}</h1><div className="ma-subtitle">{issues.length} Digitized Issue{issues.length===1?'':'s'}{isPartialArchive ? ' • Partial Archive' : ''}</div><p className="ma-lede">{isPartialArchive ? `This is a partial archive of the issues currently preserved from ${year}. Additional editions may be added as they are located and digitized.` : `Browse every currently preserved issue from ${year}. Select a cover to open the full page-by-page digitized newspaper.`}</p><div className="ma-actions"><Link href={`/media/newspapers/${publication}`} className="ma-button">Back to Publication</Link><Link href="/media/newspapers" className="ma-button-ghost">All Newspapers</Link></div></div><div className="ma-hero-media"><img src={hero} alt={`${publicationName} ${year}`} className="ma-cover" /></div></div>
        <div className="ma-stats"><div className="ma-stat"><strong>{issues.length}</strong><span>Available Issues</span></div><div className="ma-stat"><strong>{pageCount.toLocaleString()}</strong><span>Preserved Pages</span></div><div className="ma-stat"><strong>{year}</strong><span>Archive Year</span></div><div className="ma-stat"><strong>{issues[0].issueDate.slice(5)}</strong><span>First Issue Date</span></div><div className="ma-stat"><strong>{issues[issues.length-1].issueDate.slice(5)}</strong><span>Last Issue Date</span></div></div>
      </div>
    </section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">{isPartialArchive ? "Partial Archive" : "Complete Year"}</div><h2 className="ma-h2">{year} Issues</h2></div><div className="ma-note">{isPartialArchive ? "Only the currently preserved issues are shown; additional editions may be added as they are found." : "Issues are presented in chronological order."}</div></div><div className="ma-issue-grid">{issues.map(issue => <Link key={issue.slug} href={`/media/newspapers/${publication}/${issue.slug}`} className="ma-issue"><img src={issue.thumbnailImage || issue.thumbnail || issue.coverImage} alt={`${issue.publication} ${issue.title}`} loading="lazy" /><strong>{issue.title}</strong><div className="ma-card-meta">{issue.pages.length} preserved pages</div><span>Open issue →</span></Link>)}</div></section>

    <section className="ma-section"><div className="ma-footer-links"><Link href={`/media/newspapers/${publication}`} className="ma-footer-link">{publicationName}<span>Publication archive →</span></Link><Link href="/media/newspapers" className="ma-footer-link">Newspapers<span>All publications →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}