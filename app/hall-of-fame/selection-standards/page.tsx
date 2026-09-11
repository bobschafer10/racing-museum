import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './selection.module.css'

const ROOM_IS_OPEN = process.env.HALL_OF_FAME_ROOM_OPEN === 'true'

export const metadata: Metadata = {
  title: 'Hall of Fame Selection Charter Draft | Upper Midwest Auto Racing Museum',
  description: 'Private working draft of the Hall of Fame selection charter.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

const evaluationPillars = [
  ['Competitive Excellence', 'Championships, victories, performance against strong fields, sustained success, and accomplishments that mattered in their era.'],
  ['Historical Significance', 'Whether the person materially shaped the story of Upper Midwest racing beyond raw totals.'],
  ['Strength of Competition', 'The quality of the fields, tracks, series, divisions, and eras in which the accomplishments occurred.'],
  ['Longevity & Consistency', 'Sustained excellence or contribution over time, while recognizing that some historically important careers were shorter.'],
  ['Influence & Innovation', 'Impact on competitors, fans, tracks, technology, promotion, media, safety, car building, or the culture of the sport.'],
  ['Versatility & Reach', 'Success across tracks, surfaces, divisions, series, regions, or roles when that breadth is historically meaningful.'],
  ['Legacy', 'Whether the person remains essential to understanding the region’s racing history after the statistics are stripped away.'],
  ['Historical Context', 'Allowance for incomplete records, changing schedules, different eras, unequal media coverage, and other limitations in the surviving evidence.'],
]

const proposedRules = [
  ['Founding Class', 'A one-time inaugural class of approximately 10–12 members to establish the Hall’s standard.'],
  ['Annual Classes', 'After the Founding Class, no more than three inductees in a normal year. The Hall is never required to fill all available positions.'],
  ['Election Threshold', 'A proposed 75% approval threshold from the Hall of Fame selection committee.'],
  ['Public Role', 'Fans may be invited to nominate candidates, but induction should not be decided by a public popularity vote.'],
  ['No Automatic Qualification', 'No win total, championship count, major-event victory, or years of service automatically creates Hall of Fame eligibility.'],
  ['No Quotas', 'No required balance by state, era, dirt/asphalt, track, division, or category. The standard should drive the selections.'],
  ['Posthumous Induction', 'Candidates may be elected posthumously when their historical case meets the same standard.'],
  ['Evidence Standard', 'Museum records, results, standings, photographs, newspapers, programs, yearbooks, and contemporary accounts should support the historical case whenever possible.'],
]

export default function HallOfFameSelectionStandardsPage() {
  if (!ROOM_IS_OPEN) notFound()

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.topRow}>
            <Link href="/hall-of-fame/room">← Back to Hall of Plaques</Link>
            <span>Private working draft</span>
          </div>
          <div className={styles.eyebrow}>Upper Midwest Auto Racing Museum Hall of Fame</div>
          <h1>Selection Charter</h1>
          <p className={styles.lead}>
            The Hall should be difficult to enter by design. This working charter defines the principles that protect the value of induction before the Founding Class is selected.
          </p>
          <div className={styles.draftStamp}>Draft • Subject to Museum Approval</div>
        </div>
      </section>

      <section className={styles.standardSection}>
        <div className={styles.standardQuote}>
          <span>The core test</span>
          <blockquote>“You cannot tell the story of Upper Midwest auto racing without this person.”</blockquote>
          <p>
            Being excellent is not, by itself, enough. Hall of Fame induction should identify competitors and contributors whose achievements, influence, or historical importance rise above ordinary recognition.
          </p>
        </div>
      </section>

      <section className={styles.categorySection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionKicker}>One Hall • Two Paths</div>
            <h2>Competitors &amp; Contributors</h2>
          </div>
          <p>Both paths lead to the same honor. The category explains the basis of the historical case; it does not create separate levels of Hall of Famer.</p>
        </div>
        <div className={styles.categoryGrid}>
          <article>
            <span>Competitors</span>
            <h3>Performance that defined an era.</h3>
            <p>Primarily drivers, with exceptional owners or teams considered when their competitive accomplishments are central to the region’s history.</p>
          </article>
          <article>
            <span>Contributors</span>
            <h3>Impact that changed the sport.</h3>
            <p>Promoters, builders, mechanics, officials, owners, media figures, track operators, innovators, and others whose work materially shaped Upper Midwest racing.</p>
          </article>
        </div>
      </section>

      <section className={styles.pillarsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionKicker}>Evaluation Framework</div>
            <h2>What should matter.</h2>
          </div>
          <p>No single pillar has to dominate every case. The committee’s job is to evaluate the whole historical record.</p>
        </div>
        <div className={styles.pillarsGrid}>
          {evaluationPillars.map(([title, text], index) => (
            <article key={title} className={styles.pillarCard}>
              <div className={styles.number}>{String(index + 1).padStart(2, '0')}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.rulesSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionKicker}>Proposed Election Rules</div>
            <h2>Make induction intentionally difficult.</h2>
          </div>
          <p>These are proposed working rules, not yet final museum policy. They can be adjusted before the Founding Class process begins.</p>
        </div>
        <div className={styles.rulesList}>
          {proposedRules.map(([title, text]) => (
            <article key={title} className={styles.ruleRow}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.guardrailsSection}>
        <div className={styles.guardrailCopy}>
          <div className={styles.sectionKicker}>Historical Guardrails</div>
          <h2>The database informs the Hall. It does not decide the Hall.</h2>
          <p>
            A modern driver may have every result preserved while a 1960s star may have only a fraction of a career documented. The committee should consider missing newspapers, incomplete point sheets, lost race reports, changing class names, different schedules, and the availability of historical records before comparing raw totals across eras.
          </p>
          <p>
            Feature wins, championships, tracks won at, major-event victories, newspaper coverage, and career duration are evidence. They are not a mathematical formula for induction.
          </p>
        </div>
      </section>

      <section className={styles.processSection}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.sectionKicker}>Proposed Annual Process</div>
            <h2>A clear path from nomination to plaque.</h2>
          </div>
        </div>
        <div className={styles.processGrid}>
          <article><span>01</span><h3>Nomination</h3><p>Candidates are submitted with a documented historical case, not just a name.</p></article>
          <article><span>02</span><h3>Research Review</h3><p>Museum records and outside primary sources are checked for accuracy, context, and major omissions.</p></article>
          <article><span>03</span><h3>Final Ballot</h3><p>A deliberately small group of the strongest eligible candidates advances to committee consideration.</p></article>
          <article><span>04</span><h3>Election</h3><p>Only candidates meeting the approved voting threshold are elected. Empty induction slots are acceptable.</p></article>
          <article><span>05</span><h3>Museum Citation</h3><p>The museum prepares the permanent plaque language and the long-form historical citation.</p></article>
          <article><span>06</span><h3>Induction</h3><p>The plaque is added to the Hall and the complete digital exhibit opens to visitors.</p></article>
        </div>
      </section>

      <section className={styles.footerPanel}>
        <div>
          <div className={styles.sectionKicker}>Before the First Vote</div>
          <h2>The charter gets finalized first.</h2>
          <p>The Founding Class should be selected under rules we are willing to use for decades, rather than creating rules after seeing which names make the ballot.</p>
        </div>
        <Link href="/hall-of-fame/room" className={styles.returnButton}>Return to Hall of Plaques →</Link>
      </section>
    </main>
  )
}
