import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewspaperIssues } from "@/lib/newspapers"
import "../../../newspapers.css"

export default async function NewspaperYearPage({
  params,
}: {
  params: Promise<{ publication: string; year: string }>
}) {
  const { publication, year } = await params

  const allIssues = await getNewspaperIssues()

  const issues = allIssues.filter(
    (issue) =>
      issue.publicationSlug === publication &&
      String(issue.year) === String(year)
  )

  if (!issues.length) notFound()

  const publicationName = issues[0].publication

  return (
    <main className="newspapers-page">
      <section className="newspapers-hero compact">
        <div className="hero-copy">
          <p className="eyebrow">Newspaper Archive</p>
          <h1>
            {publicationName} — {year}
          </h1>
          <p>
            {issues.length} available issue{issues.length === 1 ? "" : "s"} from{" "}
            {year}.
          </p>

          <div className="breadcrumb-links">
            <Link href="/media/newspapers">Newspapers</Link>
            <span>›</span>
            <Link href={`/media/newspapers/${publication}`}>
              {publicationName}
            </Link>
          </div>
        </div>
      </section>

      <section className="issue-browser full-width">
        <div className="section-title">
          <h2>▣ {year} Issues</h2>
        </div>

        <div className="issue-grid">
          {issues.map((issue) => (
            <Link
              key={issue.slug}
              href={`/media/newspapers/${issue.publicationSlug}/${issue.slug}`}
              className="issue-card"
            >
              <img
                src={issue.coverImage}
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