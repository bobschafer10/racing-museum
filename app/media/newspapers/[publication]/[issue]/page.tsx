import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewspaperIssue } from "@/lib/newspapers"
import NewspaperPageViewer from "./NewspaperPageViewer"
import "../../../archive-dark.css"

export default async function NewspaperIssuePage({ params }: { params: Promise<{ publication: string; issue: string }> }) {
  const { publication, issue: issueSlug } = await params
  const issue = await getNewspaperIssue(publication, issueSlug)
  if (!issue) notFound()

  const orderedImages = Array.from(new Set([issue.coverImage, ...(issue.pages || []), ...(issue.backCoverImage ? [issue.backCoverImage] : [])].filter(Boolean))) as string[]
  const pages = orderedImages.map((image,index)=>({ label:index===0?'Front Cover':index===orderedImages.length-1 && issue.backCoverImage===image?'Back Cover':`Page ${index+1}`, image }))
  const summary = issue.description || issue.summary || `This issue of ${issue.publication}, published on ${issue.title}, preserves race coverage, photographs, schedules, advertising, results, and period news from the regional racing scene.`

  return <main className="ma-page">
    <section className="ma-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(5,8,10,.98),rgba(5,8,10,.84) 50%,rgba(5,8,10,.48)),url(${issue.coverImage})`,backgroundSize:'cover',backgroundPosition:'center 15%'}}>
      <div className="ma-hero-inner">
        <div className="ma-breadcrumbs"><Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/media/newspapers">Newspapers</Link><span>›</span><Link href={`/media/newspapers/${publication}`}>{issue.publication}</Link><span>›</span><span>{issue.title}</span></div>
        <div className="ma-hero-grid">
          <div><div className="ma-eyebrow">Digitized Newspaper Issue</div><h1 className="ma-title">{issue.publication}</h1><div className="ma-subtitle">{issue.title}</div><p className="ma-lede">{summary}</p><div className="ma-actions"><Link href={`/media/newspapers/${publication}`} className="ma-button">Back to Publication</Link><Link href={`/media/newspapers/${publication}/year/${issue.year}`} className="ma-button-ghost">Browse {issue.year}</Link></div></div>
          <div className="ma-hero-media"><img src={issue.coverImage} alt={`${issue.publication} ${issue.title}`} className="ma-cover" />{issue.backCoverImage ? <img src={issue.backCoverImage} alt={`${issue.publication} back cover`} className="ma-cover" /> : null}</div>
        </div>
        <div className="ma-stats"><div className="ma-stat"><strong>{issue.year}</strong><span>Publication Year</span></div><div className="ma-stat"><strong>{pages.length}</strong><span>Digitized Pages</span></div><div className="ma-stat"><strong>{issue.volume || '—'}</strong><span>Volume</span></div><div className="ma-stat"><strong>{issue.number || '—'}</strong><span>Issue Number</span></div><div className="ma-stat"><strong>OCR</strong><span>Research Ready</span></div></div>
      </div>
    </section>

    <section className="ma-section"><div className="ma-section-head"><div><div className="ma-kicker">Complete Issue</div><h2 className="ma-h2">Issue Pages</h2></div><div className="ma-note">Select any page for a full-screen viewer. Use arrow keys to move through the issue.</div></div><NewspaperPageViewer pages={pages} /></section>

    <section className="ma-section"><div className="ma-source"><strong className="ma-gold">Museum research note:</strong> digitized issues are preserved as archival source material. Page counts reflect the surviving scans currently in the museum collection.</div></section>
    <section className="ma-section"><div className="ma-footer-links"><Link href={`/media/newspapers/${publication}/year/${issue.year}`} className="ma-footer-link">{issue.year} Archive<span>All issues from this year →</span></Link><Link href={`/media/newspapers/${publication}`} className="ma-footer-link">{issue.publication}<span>Publication archive →</span></Link><Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link></div></section>
  </main>
}