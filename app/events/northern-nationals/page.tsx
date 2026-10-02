import Link from 'next/link'
import styles from '../special-event.module.css'

export const revalidate = 300

const precursorLateModels = [
  [1970,'Phil Prusak','Laursen family benefit — not part of the numbered Classic sequence'],
  [1971,'Harold Mueller','1st Russ Laursen Classic'],
  [1972,'John Jones','2nd Russ Laursen Classic'],
  [1973,'Harold Mueller','3rd Russ Laursen Classic'],
  [1974,'Jim Eliason','4th Russ Laursen Classic'],
  [1975,'Tom Steuding','Russ Laursen Classic'],
  [1976,'Leon Plank','Russ Laursen Classic'],
  [1977,'John Jones','Russ Laursen Classic'],
  [1978,'John Jones','Russ Laursen Classic'],
  [1979,'Tom Nesbitt','9th Russ Laursen Memorial'],
  [1980,'Gary Dorn','Russ Laursen Classic'],
  [1981,'Phil Prusak','11th Russ Laursen Classic'],
  [1982,'Rick Popovich','12th Northwest Racing Circuit Classic'],
  [1983,'Steve Fegers','13th Northwest Racing Circuit Classic'],
  [1984,'Jeff Hinkemeyer','Superior Classic'],
  [1985,'Not yet documented','No Wisconsin fall-classic result located in the current MRN/database pass'],
  [1986,'Not yet documented','No Wisconsin fall-classic result located in the current MRN/database pass'],
  [1987,'Rick Popovich / Tom Steuding','Superior Speedway Super Series — Friday / Saturday winners'],
  [1988,'Tom Nesbitt','Superior Speedway Classic / Invitational'],
] as const

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
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Northern Nationals & Russ Laursen Classic</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Northern Nationals & Russ Laursen Classic</h1>
        <p className={styles.tagline}>Superior's Post-Labor Day Dirt-Track Tradition</p>
        <p className={styles.intro}>Superior Speedway — now Gondik Law Speedway — has staged a major post-Labor Day dirt-track finale for more than half a century. Midwest Racing News establishes a direct historical chain from the Russ Laursen Classic, through the Northwest Racing Circuit Classic and Superior Speedway Classic/Super Series era, to the Northern Nationals name first documented by MRN in 1989. The modern Northern Nationals sequence reached its 38th running in 2026, while the Russ Laursen Late Model Classic remains an important race within the modern weekend.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/superior-speedway-wi" className={styles.button}>Open Superior Archive</Link>
          <Link href="#winners" className={styles.buttonGhost}>Late Model Winners</Link>
          <a href="https://www.atdracingnews.com/content/9-9-page-23" target="_blank" rel="noreferrer" className={styles.buttonGhost}>2025 Race Report</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Modern Sequence" value="1989–2026"/>
          <Stat label="2026 Edition" value="38th"/>
          <Stat label="Verified Finale Winners" value={String(verified.length)}/>
          <Stat label="Deepest Roots" value="1970"/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Northern Nationals Lineage</div>
            <strong>MRN now confirms 1989 as the contemporary start of the Northern Nationals name.</strong>
            <p>The Aug. 24, 1989 issue announced that Superior's season would wind down Sept. 8–9 with the Northern Nationals. The Sept. 14 race report was headed “Northern Nationals Shows” and documented Tom Nesbitt's 35-lap Late Model victory. Later annual-number markers — including the 38th running in 2026 — align exactly with that 1989 naming breakpoint.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Russ Laursen Connection</div>
            <strong>The Russ Laursen race is the documented historical root of Superior's fall classic.</strong>
            <p>The Sept. 25, 1970 race was advertised immediately after Russ Laursen's death as a benefit for his family. MRN then advertised the Sept. 12, 1971 race as the Russ Laursen Classic, and the 1973 event as the third annual. Later numbering is consistent with 1971 as the first numbered Classic. The 1970 benefit is therefore preserved as the origin point, not retroactively labeled the first annual Classic.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Documented Name Trail</div>
        <div className={styles.sectionHead}><h2>From Russ Laursen to the Northern Nationals</h2><div className={styles.sectionNote}>Contemporary MRN terminology is used here rather than applying later names backward.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1970</div><div className={styles.eraValue}>Laursen Family Benefit</div><div className={styles.eraNote}>Held Sept. 25 after Russ Laursen's death. Phil Prusak won the Late Model feature. This is the origin point, but not part of the later annual count.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1971–1981</div><div className={styles.eraValue}>Russ Laursen Classic</div><div className={styles.eraNote}>MRN advertised the 1971 race as the Russ Laursen Classic and the 1973 race as the third annual. The numbered Classic sequence therefore begins in 1971.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1982–1983</div><div className={styles.eraValue}>Northwest Racing Circuit Classic</div><div className={styles.eraNote}>Rick Popovich won the 12th annual in 1982; Steve Fegers won the 13th annual in 1983.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1984</div><div className={styles.eraValue}>Superior Classic</div><div className={styles.eraNote}>Jeff Hinkemeyer won the Late Model Superior Classic over Steve Laursen and Dave Adams.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1985–1986</div><div className={styles.eraValue}>Archive Gap</div><div className={styles.eraNote}>The current MRN and museum-database pass has not established a Wisconsin fall-classic result or contemporary event title for either year.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1987</div><div className={styles.eraValue}>Superior Speedway Super Series</div><div className={styles.eraNote}>A two-night season finale: Rick Popovich won Friday and Tom Steuding won Saturday.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1988</div><div className={styles.eraValue}>Superior Speedway Classic / Invitational</div><div className={styles.eraNote}>Tom Nesbitt won the 40-lap Late Model feature over Joel Cryderman and Tom Waseleski.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1989–2026</div><div className={styles.eraValue}>Northern Nationals</div><div className={styles.eraNote}>MRN first uses the Northern Nationals name in 1989; Tom Nesbitt won the inaugural modern-name Late Model feature.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>How the Weekend Evolved</h2><div className={styles.sectionNote}>The class mix changed over time, but the post-Labor Day Superior identity remained intact.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1970–1983</div><div className={styles.eraValue}>Benefit / Laursen / NRC Foundation</div><div className={styles.eraNote}>A 1970 benefit for the Laursen family was followed by the first numbered Russ Laursen Classic in 1971; the event later evolved into the Northwest Racing Circuit Classic.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1984–1988</div><div className={styles.eraValue}>Superior Classic Transition</div><div className={styles.eraNote}>The finale used Superior Classic, Invitational and Super Series descriptions before the Northern Nationals name appeared.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1989–2019</div><div className={styles.eraValue}>Northern Nationals</div><div className={styles.eraNote}>Late Models, Modifieds, stock-car divisions and later IRA sprint cars built the modern identity.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2020–2026</div><div className={styles.eraValue}>Expanded Multi-Night Weekend</div><div className={styles.eraNote}>Several nights of racing now produce multiple complete programs, with the Russ Laursen Late Model Classic carried inside the larger Northern Nationals weekend.</div></div>
        </div>
      </section>

      <section className={styles.section} id="precursor-winners">
        <div className={styles.kicker}>Fall Classic Before the Northern Nationals</div>
        <div className={styles.sectionHead}><h2>Laursen / NRC / Superior Classic Late Model Winners</h2><div className={styles.sectionNote}>The 1970 benefit is shown as the origin point. The numbered Russ Laursen Classic begins in 1971. Contemporary names are retained through the 1980s transition.</div></div>
        <div className={styles.eraGrid}>
          {precursorLateModels.map(([year,winner,note]) => <div key={year} className={styles.eraCard}>
            <div className={styles.eraYear}>{year}</div>
            <div className={styles.eraValue}>{winner}</div>
            <div className={styles.eraNote}>{note}</div>
          </div>)}
        </div>
      </section>

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Headline Late Model Lineage</div>
        <div className={styles.sectionHead}><h2>Northern Nationals Late Model Finale Winners</h2><div className={styles.sectionNote}>This chronology begins with the first MRN-documented use of the Northern Nationals name in 1989. Earlier fall-classic winners are preserved separately above under their contemporary event names.</div></div>
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
          <strong>The Late Model lineage is now reconstructed from the 1970 benefit through the modern Northern Nationals, with 1985–86 still visibly unresolved.</strong>
          <p>The next museum pass should determine whether a comparable fall classic was held in 1985 and 1986, recover the 1991 Northern Nationals Late Model result, settle the 2023 Late Model status, and then expand the archive by division — Modified, Super Stock, Midwest Modified/B-Mod, Street Stock/Pure Stock and sprint-car winners — using Superior database records plus MRN/CFRN clippings.</p>
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
