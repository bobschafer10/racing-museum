import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './exhibit.module.css'

const ROOM_IS_OPEN = process.env.HALL_OF_FAME_ROOM_OPEN === 'true'

export const metadata: Metadata = {
  title: 'Hall of Fame Exhibit Preview | Upper Midwest Auto Racing Museum',
  description: 'Private preview of the Upper Midwest Auto Racing Museum Hall of Fame inductee exhibit.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

const milestones = [
  ['Era', 'Career span and primary racing eras'],
  ['Home', 'Hometown, state, and regional identity'],
  ['Competition', 'Primary divisions, series, and sanctioning bodies'],
  ['Signature', 'The accomplishment most closely associated with the inductee'],
]

const timeline = [
  ['Early Career', 'The exhibit will establish where the story began, the first important tracks, and the breakthrough seasons.'],
  ['Rise to Prominence', 'Championships, marquee victories, regional recognition, and defining competitive seasons will be placed in context.'],
  ['Peak Years', 'The strongest stretch of the career will be documented with results, contemporary reporting, and historical photographs.'],
  ['Lasting Legacy', 'The exhibit will explain why the career or contribution still matters to Upper Midwest racing history.'],
]

const archiveCards = [
  ['Career Highlights', 'A curated list of the accomplishments that belong on the Hall of Fame record — not every statistic.'],
  ['Championships & Major Victories', 'Track titles, touring championships, crown-jewel wins, and historically significant accomplishments.'],
  ['Tracks Won At', 'A geographic view of the venues where the inductee left a measurable mark.'],
  ['Historic Photos', 'Selected racing images, portraits, cars, crews, trophies, and moments from the museum photo archive.'],
  ['Newspapers & Articles', 'Contemporary Midwest Racing News, Checkered Flag Racing News, programs, yearbooks, and other primary sources.'],
  ['Complete Museum Record', 'A path into the full underlying driver, result, standings, special-event, and research records.'],
]

export default function HallOfFameExhibitPreviewPage() {
  if (!ROOM_IS_OPEN) notFound()

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.backRow}>
            <Link href="/hall-of-fame/room">← Back to Hall of Plaques</Link>
            <span>Private exhibit template</span>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.portraitFrame} aria-hidden="true">
              <div className={styles.portraitMedallion}>HF</div>
              <div className={styles.portraitCaption}>Inductee portrait / bronze relief</div>
            </div>

            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>Upper Midwest Auto Racing Museum Hall of Fame</div>
              <h1>Inductee Name</h1>
              <div className={styles.identity}>Hometown, State • Competitor or Contributor • Founding Class</div>
              <p className={styles.lead}>
                This page is the private template for every Hall of Fame inductee. The final version will combine a concise,
                museum-written Hall of Fame citation with the strongest evidence, accomplishments, images, and archival material
                from the museum&apos;s collections.
              </p>
              <div className={styles.heroStamp}>Hall of Fame • Founding Class</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.citationSection}>
        <div className={styles.citationCard}>
          <div className={styles.sectionKicker}>Hall of Fame Citation</div>
          <h2>Why this person belongs in the Hall.</h2>
          <p>
            The plaque itself will summarize the essential accomplishments. This larger citation will explain the historical case:
            what the inductee accomplished, the level of competition involved, the era in which it happened, the influence the person
            had on the sport, and why the story of Upper Midwest auto racing would be incomplete without them.
          </p>
          <p>
            The tone should read like permanent museum interpretation rather than a biography or statistical profile. The Hall of Fame
            distinction should remain selective, evidence-based, and historically grounded.
          </p>
        </div>
      </section>

      <section className={styles.snapshotSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionKicker}>Career at a Glance</div>
            <h2>The essentials, immediately visible.</h2>
          </div>
          <p>Four concise anchors give visitors context before they explore the deeper record.</p>
        </div>
        <div className={styles.snapshotGrid}>
          {milestones.map(([label, text]) => (
            <article key={label} className={styles.snapshotCard}>
              <span>{label}</span>
              <strong>{text}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.timelineSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionKicker}>Career Timeline</div>
            <h2>A museum narrative, not a data dump.</h2>
          </div>
          <p>The timeline will combine verified results with the historical context that raw totals cannot provide.</p>
        </div>
        <div className={styles.timeline}>
          {timeline.map(([title, text], index) => (
            <article key={title} className={styles.timelineItem}>
              <div className={styles.timelineNumber}>{String(index + 1).padStart(2, '0')}</div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.archiveSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionKicker}>Inside the Exhibit</div>
            <h2>The museum record behind the plaque.</h2>
          </div>
          <p>Every module will eventually link directly to the museum&apos;s underlying collections where practical.</p>
        </div>
        <div className={styles.archiveGrid}>
          {archiveCards.map(([title, text]) => (
            <article key={title} className={styles.archiveCard}>
              <h3>{title}</h3>
              <p>{text}</p>
              <span>Exhibit module →</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.footerPanel}>
        <div>
          <div className={styles.sectionKicker}>Design Principle</div>
          <h2>The plaque earns attention. The exhibit earns time.</h2>
          <p>
            Visitors should be able to understand the Hall of Fame case in seconds from the plaque, then spend as long as they want
            exploring the complete story behind it.
          </p>
        </div>
        <Link href="/hall-of-fame/room" className={styles.returnButton}>Return to Hall of Plaques →</Link>
      </section>
    </main>
  )
}
