import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './room.module.css'

const ROOM_IS_OPEN = process.env.HALL_OF_FAME_ROOM_OPEN === 'true'

export const metadata: Metadata = {
  title: 'Hall of Fame Room | Upper Midwest Auto Racing Museum',
  description: 'The Hall of Fame plaque room of the Upper Midwest Auto Racing Museum.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

type Plaque = {
  slot: number
  name: string
  location: string
  category: string
  classLabel: string
  highlights: string[]
  citation: string
  slug?: string
}

const foundingPlaques: Plaque[] = Array.from({ length: 12 }, (_, index) => ({
  slot: index + 1,
  name: 'Name to be announced',
  location: 'Upper Midwest',
  category: 'Competitor or Contributor',
  classLabel: 'Founding Class',
  highlights: [
    'Career achievements under historical review',
    'Major victories, championships, or contributions',
    'Lasting impact on Upper Midwest auto racing',
  ],
  citation: 'This plaque is reserved for a member of the Hall of Fame Founding Class.',
  slug: index === 0 ? 'exhibit-preview' : undefined,
}))

function PlaqueCard({ plaque, featured = false }: { plaque: Plaque; featured?: boolean }) {
  const content = (
    <>
      <div className={styles.plaquePortrait} aria-hidden="true">
        <span>{String(plaque.slot).padStart(2, '0')}</span>
      </div>
      <div className={styles.plaqueName}>{plaque.name}</div>
      <div className={styles.plaqueLocation}>{plaque.location}</div>
      <div className={styles.plaqueRule} />
      <div className={styles.plaqueCategory}>{plaque.category}</div>
      <div className={styles.plaqueClass}>{plaque.classLabel}</div>
      <ul className={styles.plaqueHighlights}>
        {plaque.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
      </ul>
      <p className={styles.plaqueCitation}>{plaque.citation}</p>
      <div className={styles.plaqueFoot}>{plaque.slug ? 'Open Hall of Fame Exhibit →' : 'Exhibit opens with induction'}</div>
    </>
  )

  if (plaque.slug) {
    return (
      <Link href={`/hall-of-fame/${plaque.slug}`} className={`${styles.plaque} ${featured ? styles.plaqueFeatured : ''}`}>
        {content}
      </Link>
    )
  }

  return <article className={`${styles.plaque} ${featured ? styles.plaqueFeatured : ''}`}>{content}</article>
}

export default function HallOfFameRoomPage() {
  if (!ROOM_IS_OPEN) notFound()

  const [leadPlaque, ...otherPlaques] = foundingPlaques

  return (
    <main className={styles.page}>
      <section className={styles.roomHero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>Upper Midwest Auto Racing Museum</div>
          <h1>Hall of Fame</h1>
          <p className={styles.heroStatement}>The highest honor of the Upper Midwest Auto Racing Museum.</p>
          <div className={styles.heroRule} />
          <p className={styles.heroQuote}>“You cannot tell the story of Upper Midwest auto racing without them.”</p>
        </div>
      </section>

      <section className={styles.foundingSection} aria-labelledby="founding-class-title">
        <div className={styles.classHeading}>
          <div className={styles.classKicker}>Those chosen to establish the standard</div>
          <h2 id="founding-class-title">Founding Class</h2>
          <p>
            The first class will define what Hall of Fame induction means for every class that follows.
            Plaques will present the essential accomplishments and historical significance of each inductee;
            clicking a plaque will open the complete Hall of Fame exhibit.
          </p>
        </div>

        <div className={styles.galleryWall}>
          <div className={styles.featuredBay}>
            <PlaqueCard plaque={leadPlaque} featured />
          </div>
          <div className={styles.plaqueGrid}>
            {otherPlaques.map((plaque) => <PlaqueCard key={plaque.slot} plaque={plaque} />)}
          </div>
        </div>
      </section>

      <section className={styles.interpretiveSection}>
        <article className={styles.interpretiveCard}>
          <div className={styles.cardNumber}>01</div>
          <h3>Why the Hall Matters</h3>
          <p>
            The Hall recognizes the competitors and contributors whose achievements and influence are
            essential to understanding racing history across the Upper Midwest.
          </p>
        </article>

        <article className={styles.interpretiveCard}>
          <div className={styles.cardNumber}>02</div>
          <h3>Selection Standards</h3>
          <p>
            Career excellence, historical importance, strength of competition, longevity, influence,
            versatility, and lasting impact will matter more than any single statistic.
          </p>
        </article>

        <article className={styles.interpretiveCard}>
          <div className={styles.cardNumber}>03</div>
          <h3>Competitors &amp; Contributors</h3>
          <p>
            Drivers and exceptional competitors will stand beside promoters, builders, owners, officials,
            media figures, and others whose work materially shaped the sport.
          </p>
        </article>
      </section>

      <section className={styles.roomFooter}>
        <div>
          <div className={styles.footerKicker}>Inside every plaque</div>
          <h2>A complete digital exhibit.</h2>
          <p>
            Each Hall of Famer will ultimately have a dedicated exhibit with a Hall of Fame citation,
            career timeline, championships, major victories, tracks, photographs, newspaper coverage,
            special-event history, and links into the museum&apos;s complete research record.
          </p>
        </div>
        <Link href="/hall-of-fame" className={styles.backButton}>Back to Hall Entrance →</Link>
      </section>
    </main>
  )
}
