import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Hall of Fame | Upper Midwest Auto Racing Museum',
  description: 'The Upper Midwest Auto Racing Museum Hall of Fame is coming soon.',
}

export default function HallOfFamePage() {
  return (
    <main className="hof-landing-page">
      <section className="hof-landing-hero" aria-labelledby="hall-of-fame-title">
        <div className="hof-landing-inner">
          <div className="hof-landing-doorframe">
            <div className="hof-landing-copy">
              <div className="hof-landing-kicker">Upper Midwest Auto Racing Museum</div>
              <h1 id="hall-of-fame-title">Hall of Fame</h1>
              <p>
                Honoring the competitors and contributors whose accomplishments, influence,
                and lasting impact helped define auto racing in the Upper Midwest.
              </p>
            </div>
            <div className="hof-tape hof-tape-landing" aria-hidden="true">
              Hall of Fame — Coming Soon • Hall of Fame — Coming Soon
            </div>
          </div>
        </div>
      </section>

      <section className="hof-landing-content">
        <div className="hof-landing-intro">
          <div>
            <div className="hof-kicker">A Hall Built to Mean Something</div>
            <h2>Selective by design.</h2>
            <p>
              The museum&apos;s Hall of Fame will recognize the people whose careers and contributions
              are essential to the story of Upper Midwest auto racing. Excellence alone will not be
              enough. The standard is intended to be exceptionally high so that induction remains one
              of the museum&apos;s most meaningful honors.
            </p>
            <p>
              Museum records, historical newspapers, championships, major victories, photographs,
              career accomplishments, and contemporary accounts will help inform the process — but
              historical judgment will always matter more than a single statistic.
            </p>
          </div>

          <aside className="hof-founders-note">
            <strong>Founding Class</strong>
            <p>
              The inaugural class will establish the standard for every class that follows. The museum
              is developing the formal selection charter, eligibility rules, and founding-class process
              before any inductees are announced.
            </p>
          </aside>
        </div>

        <div className="hof-principles">
          <h2 className="hof-principles-title">Guiding principles</h2>
          <div className="hof-principles-grid">
            <article className="hof-principle">
              <div className="hof-principle-num">01 · Selectivity</div>
              <h3>The bar stays high.</h3>
              <p>
                Being very good will not automatically make someone a Hall of Famer. Induction should
                identify people who are difficult to leave out of the region&apos;s racing history.
              </p>
            </article>

            <article className="hof-principle">
              <div className="hof-principle-num">02 · Two Paths</div>
              <h3>Competitors &amp; contributors.</h3>
              <p>
                Drivers and exceptional racing competitors will be considered alongside promoters,
                builders, officials, media figures, owners, and other truly consequential contributors.
              </p>
            </article>

            <article className="hof-principle">
              <div className="hof-principle-num">03 · Context</div>
              <h3>History before raw totals.</h3>
              <p>
                Surviving records vary dramatically by era. The Hall will consider competition,
                longevity, influence, significance, and the quality of available historical evidence.
              </p>
            </article>

            <article className="hof-principle">
              <div className="hof-principle-num">04 · Legacy</div>
              <h3>A permanent museum exhibit.</h3>
              <p>
                Each inductee will eventually receive an exhibit-style profile combining career
                highlights, photographs, major victories, archival material, and a museum-written
                Hall of Fame citation.
              </p>
            </article>
          </div>
        </div>

        <div className="hof-landing-actions">
          <Link href="/" className="hof-landing-action">Return to the Museum →</Link>
          <Link href="/stats/feature-winners" className="hof-landing-action hof-landing-action-secondary">
            Visit the Research Center →
          </Link>
        </div>
      </section>
    </main>
  )
}
