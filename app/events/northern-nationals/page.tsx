import Link from 'next/link'
import styles from '../special-event.module.css'

export const revalidate = 300

const lateModelFinales = [
  [1989,'Tom Nesbitt'],[1990,'Larry Prochnow'],[1991,'Archive gap'],[1992,'Tom Waseleski Sr.'],
  [1993,'Tim McMann'],[1994,'Steve Laursen'],[1995,'Mike Chamernick'],[1996,'Tom Nesbitt'],
  [1997,'Mitch Johnson'],[1998,'Pat Doar'],[1999,'Lance Matthees'],[2000,'John Kaanta'],
  [2001,'Tony Bahr'],[2002,'Don Shaw'],[2003,'Pat Doar'],[2004,'Darrell Nelson'],
  [2005,'Tom Nesbitt'],[2006,'Pat Doar'],[2007,'Jake Redetzke'],[2008,'Adam Hensel'],
  [2009,'Adam Hensel'],[2010,'Ashley Anderson'],[2011,'A.J. Diemel'],[2012,'Darrell Nelson'],
  [2013,'Darrell Nelson'],[2014,'Brady Smith'],[2015,'Mike Prochnow'],[2016,'Darrell Nelson'],
  [2017,'Marshall Fegers'],[2018,'Darrell Nelson'],[2019,'Darrell Nelson'],[2020,'Pat Doar'],
  [2021,'Pat Doar'],[2022,'Darrell Nelson'],[2023,'Late Model result not yet verified'],
  [2024,'Ashley Anderson'],[2025,'James Giossi'],[2026,'Kevin Eder'],
] as const

const modernMultiNight = [
  {year:2021, note:'Pat Doar won both preserved Late Model programs.'},
  {year:2025, note:'Kevin Eder won Friday; James Giossi won the Saturday finale.'},
  {year:2026, note:'Pat Doar won Friday; Kevin Eder won the Saturday finale.'},
]

export default function NorthernNationalsPage() {
  const verified = lateModelFinales.filter(([,winner]) => !winner.toLowerCase().includes('archive') && !winner.toLowerCase().includes('not yet'))
  const winners = new Set(verified.map(([,winner]) => winner))

  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Northern Nationals</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Northern Nationals</h1>
        <p className={styles.tagline}>Superior's Post-Labor Day Dirt-Track Finale</p>
        <p className={styles.intro}>The Northern Nationals at Superior Speedway — now Gondik Law Speedway — began in 1989 and reached its 38th annual running in 2026. The multi-division weekend has long paired WISSOTA Late Models, Modifieds and stock-car divisions with major sprint-car appearances, while the Russ Laursen Late Model Classic remains part of the event's deeper Superior tradition.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/superior-speedway-wi" className={styles.button}>Open Superior Archive</Link>
          <Link href="#winners" className={styles.buttonGhost}>Late Model Winners</Link>
          <a href="https://www.atdracingnews.com/content/9-9-page-23" target="_blank" rel="noreferrer" className={styles.buttonGhost}>2025 Race Report</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Annual Run" value="1989–2026"/>
          <Stat label="2026 Edition" value="38th"/>
          <Stat label="Verified Finale Winners" value={String(verified.length)}/>
          <Stat label="Different Winners" value={String(winners.size)}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Northern Nationals Lineage</div>
            <strong>The annual-number trail establishes 1989 as the first Northern Nationals.</strong>
            <p>The 29th running was documented in 2017, the 34th in 2022, the 36th in 2024, the 37th in 2025 and the 38th in 2026. Those independent year markers align to a continuous 1989 start.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Russ Laursen Connection</div>
            <strong>Superior's late-model memorial tradition predates the Northern Nationals name.</strong>
            <p>Superior hosted a memorial race for Russ Laursen after his death in 1970. Modern Northern Nationals weekends continue to include the Russ Laursen Late Model Classic, so the museum preserves that history as a precursor and embedded tradition rather than moving the Northern Nationals start date back to 1970.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>How the Weekend Evolved</h2><div className={styles.sectionNote}>The class mix changed over time, but the post-Labor Day Superior identity remained intact.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1989–1998</div><div className={styles.eraValue}>Early Northern Nationals</div><div className={styles.eraNote}>Late Models, Modifieds and stock-car divisions formed the core of the event.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1999–2019</div><div className={styles.eraValue}>IRA Sprint Era</div><div className={styles.eraNote}>IRA 410 winged sprints became a Friday-night Northern Nationals fixture alongside the WISSOTA program.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2020–2026</div><div className={styles.eraValue}>Expanded Multi-Night Weekend</div><div className={styles.eraNote}>The event grew into several nights of racing with multiple complete programs and a broad WISSOTA class lineup.</div></div>
        </div>
      </section>

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Headline Late Model Lineage</div>
        <div className={styles.sectionHead}><h2>Northern Nationals Late Model Finale Winners</h2><div className={styles.sectionNote}>Built from the museum's Superior results archive and verified modern race reports. The two unresolved years are left visibly open rather than guessed.</div></div>
        <div className={styles.eraGrid}>
          {lateModelFinales.map(([year,winner]) => <div key={year} className={styles.eraCard}>
            <div className={styles.eraYear}>{year}</div>
            <div className={styles.eraValue}>{winner}</div>
            <div className={styles.eraNote}>{year >= 2021 ? 'Modern Northern Nationals weekend' : 'Superior Speedway • Northern Nationals'}</div>
          </div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Modern Multi-Night Winners</div>
        <div className={styles.sectionHead}><h2>When One Weekend Produced More Than One Late Model Winner</h2><div className={styles.sectionNote}>The main chronology above uses the final-night winner as the annual headline winner.</div></div>
        <div className={styles.eraGrid}>
          {modernMultiNight.map(item => <div key={item.year} className={styles.eraCard}><div className={styles.eraYear}>{item.year}</div><div className={styles.eraValue}>Multiple Late Model Features</div><div className={styles.eraNote}>{item.note}</div></div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Research Status</div>
          <strong>This page is live-ready with a nearly complete Late Model chronology, but it should remain an enrichment target.</strong>
          <p>The next museum pass should recover the 1991 Late Model winner, settle the 2023 Late Model status, and then expand the archive by division — Modified, Super Stock, Midwest Modified/B-Mod, Street Stock/Pure Stock and sprint-car winners — using the existing Superior database records plus MRN/CFRN clippings.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/superior-speedway-wi" className={styles.footerLink}>Superior Speedway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue archival enrichment →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({label,value}:{label:string,value:string}) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
