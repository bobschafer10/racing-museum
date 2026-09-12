import Link from "next/link"
import { notFound } from "next/navigation"
import { getRaceProgramBySlug } from "@/lib/race-programs"
import "../../archive-dark.css"

function scanPageNumber(image: string) {
  const match = image.match(/\/(\d+)\.(jpg|jpeg|png|webp)$/i)
  return match ? Number(match[1]) : null
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

type RaceProgramDetailProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    sourcePage?: string | string[]
    q?: string | string[]
  }>
}

export default async function RaceProgramDetailPage({ params, searchParams }: RaceProgramDetailProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const program = await getRaceProgramBySlug(slug)
  if (!program) notFound()

  const rawSourcePage = firstParam(resolvedSearchParams.sourcePage)
  const requestedSourcePage = rawSourcePage && /^\d+$/.test(rawSourcePage) ? Number(rawSourcePage) : null
  const searchQuery = firstParam(resolvedSearchParams.q)?.trim() || null
  const matchedImage = requestedSourcePage
    ? program.images.find((image) => scanPageNumber(image) === requestedSourcePage) || null
    : null
  const focusedSearchMatch = Boolean(requestedSourcePage && matchedImage)

  const heroImage = program.coverImage || program.images[0] || null
  const pageCount = program.images.length

  return (
    <main className="ma-page">
      <section
        className="ma-hero"
        style={heroImage ? { backgroundImage: `linear-gradient(90deg,rgba(5,8,10,.96),rgba(5,8,10,.82) 48%,rgba(5,8,10,.52)),url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center 30%' } : undefined}
      >
        <div className="ma-hero-inner">
          <div className="ma-breadcrumbs">
            <Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><Link href="/media/race-programs">Race Programs</Link><span>›</span><span>{program.year ?? 'Archive'}</span>
          </div>

          <div className="ma-hero-grid">
            <div>
              <div className="ma-eyebrow">Printed Racing Archive</div>
              <h1 className="ma-title">{program.title}</h1>
              <div className="ma-subtitle">
                {[program.year, program.track, program.type].filter(Boolean).join(' • ')}
              </div>
              <p className="ma-lede">
                {focusedSearchMatch
                  ? `OCR search match${searchQuery ? ` for “${searchQuery}”` : ''}. The exact scanned page containing the match is shown below.`
                  : program.description || program.subtitle || 'A digitized race program preserved by the Upper Midwest Auto Racing Museum. Browse the complete surviving publication below.'}
              </p>
              <div className="ma-actions">
                <Link href="/media/race-programs" className="ma-button">Back to Program Archive</Link>
                {focusedSearchMatch ? <Link href={`/media/race-programs/${program.slug}`} className="ma-button-ghost">View Complete Publication</Link> : null}
                {program.track_slug ? <Link href={`/tracks/${program.track_slug}`} className="ma-button-ghost">Open Track Archive</Link> : null}
                {program.series_slug ? <Link href={`/series/${program.series_slug}`} className="ma-button-ghost">Open Series Archive</Link> : null}
              </div>
            </div>
            <div className="ma-hero-media">
              {program.coverImage ? <img src={program.coverImage} alt={program.title} className="ma-cover" /> : null}
            </div>
          </div>

          <div className="ma-stats">
            <div className="ma-stat"><strong>{program.year ?? '—'}</strong><span>Publication Year</span></div>
            <div className="ma-stat"><strong>{pageCount}</strong><span>Scanned Pages</span></div>
            <div className="ma-stat"><strong>{program.track ? '1' : '—'}</strong><span>Connected Track</span></div>
            <div className="ma-stat"><strong>{program.series ? '1' : '—'}</strong><span>Connected Series</span></div>
            <div className="ma-stat"><strong>Digital</strong><span>Museum Preservation</span></div>
          </div>
        </div>
      </section>

      {focusedSearchMatch && matchedImage && requestedSourcePage ? (
        <section className="ma-section">
          <div className="ma-section-head">
            <div>
              <div className="ma-kicker">OCR Search Match</div>
              <h2 className="ma-h2">Scanned Page {requestedSourcePage}</h2>
            </div>
            <div className="ma-note">
              {searchQuery ? <>Match for “{searchQuery}”. </> : null}
              Select the scan to open the full-resolution page in a new tab.
            </div>
          </div>

          <div className="ma-scan-grid" style={{ gridTemplateColumns: 'minmax(0, 1100px)', justifyContent: 'center' }}>
            <figure className="ma-scan-frame">
              <a href={matchedImage} target="_blank" rel="noreferrer">
                <img src={matchedImage} alt={`${program.title} scanned page ${requestedSourcePage}`} loading="eager" />
              </a>
              <figcaption>Page {requestedSourcePage} • Exact OCR Search Match</figcaption>
            </figure>
          </div>
        </section>
      ) : (
        <section className="ma-section">
          <div className="ma-section-head">
            <div><div className="ma-kicker">Complete Publication</div><h2 className="ma-h2">Scanned Pages</h2></div>
            <div className="ma-note">Select any page to open the full-resolution scan in a new tab.</div>
          </div>

          {pageCount === 0 ? (
            <div className="ma-source">No scanned pages are currently attached to this publication.</div>
          ) : (
            <div className="ma-scan-grid">
              {program.images.map((image, index) => {
                const sourcePage = scanPageNumber(image)
                return (
                  <figure
                    className="ma-scan-frame"
                    key={image}
                    id={sourcePage ? `scan-page-${sourcePage}` : undefined}
                    style={{ scrollMarginTop: 90 }}
                  >
                    <a href={image} target="_blank" rel="noreferrer">
                      <img src={image} alt={`${program.title} page ${index + 1}`} loading={index < 4 ? 'eager' : 'lazy'} />
                    </a>
                    <figcaption>{index === 0 ? 'Front Cover' : index === pageCount - 1 && program.backCoverImage ? 'Back Cover' : `Page ${index + 1} of ${pageCount}`}</figcaption>
                  </figure>
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="ma-section">
        <div className="ma-footer-links">
          <Link href="/media/race-programs" className="ma-footer-link">Race Programs<span>Browse printed archive →</span></Link>
          <Link href="/media/newspapers" className="ma-footer-link">Racing Newspapers<span>Browse newspaper archive →</span></Link>
          <Link href="/media" className="ma-footer-link">Media Archive<span>Return to media archive →</span></Link>
        </div>
      </section>
    </main>
  )
}
