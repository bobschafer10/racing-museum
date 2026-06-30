import Link from "next/link"
import { notFound } from "next/navigation"
import manifest from "../../../../../../museum-newspaper-manager/public/data/newspapers-manifest.json"
import "../../../newspapers.css"

type NewspaperIssue = {
  slug: string
  title: string
  publication: string
  publicationSlug: string
  year: number
  issueDate?: string
  coverImage?: string
  thumbnail?: string
}

export default async function NewspaperYearPage({
  params,
}: {
  params: Promise<{ publication: string; year: string }>
}) {
  const { publication, year } = await params

  const issues = (manifest as NewspaperIssue[])
    .filter(
      (issue) =>
        issue.publicationSlug === publication &&
        String(issue.year) === String(year)
    )
    .sort((a, b) => (a.issueDate || a.slug).localeCompare(b.issueDate || b.slug))

  if (!issues.length) notFound()

  const publicationName = issues[0].publication

  return (
    <main className="newspapers-page">
      <section className="newspapers-hero compact">
        <div>
          <p className="eyebrow">Newspaper Archive</p>
          <h1>
            {publicationName} — {year}
          </h1>
          <p className="hero-text">
            {issues.length} available issue{issues.length === 1 ? "" : "s"} from {year}.
          </p>

          <div className="breadcrumb-links">
            <Link href="/media/newspapers">Newspapers</Link>
            <span>›</span>
            <Link href={`/media/newspapers/${publication}`}>{publicationName}</Link>
          </div>
        </div>
      </section>

      <section className="issue-browser full-width">
        <div className="section-title">
          <span>▣</span>
          <h2>{year} Issues</h2>
        </div>

        <div className="issue-grid">
          {issues.map((issue) => (
            <Link
              key={issue.slug}
              href={`/media/newspapers/${issue.publicationSlug}/${issue.slug}`}
              className="issue-card"
            >
              <img
                src={issue.thumbnail || issue.coverImage}
                alt={`${issue.publication} ${issue.title}`}
                className="issue-cover-image"
              />

              <strong>{issue.title}</strong>
              <span>Open Issue →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}