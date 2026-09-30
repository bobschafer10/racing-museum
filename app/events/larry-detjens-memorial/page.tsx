import Link from 'next/link'
import styles from '../special-event.module.css'

export const revalidate = 300

type Winner = { year: number; winner: string }

const winners: Winner[] = [
  { year: 1981, winner: 'Dick Trickle' },
  { year: 1982, winner: 'Dick Trickle' },
  { year: 1983, winner: 'Kevin Stepan' },
  { year: 1984, winner: 'Tom Reffner' },
  { year: 1985, winner: 'Dick Trickle' },
  { year: 1986, winner: 'Kevin Cywinski' },
  { year: 1987, winner: 'Tom Reffner' },
  { year: 1988, winner: 'Wayne Breitenfeldt' },
  { year: 1989, winner: 'Wayne Lodholz' },
  { year: 1990, winner: 'Bryan Reffner' },
  { year: 1991, winner: 'Donnie Woller' },
  { year: 1992, winner: 'Kirby Kurth' },
  { year: 1993, winner: 'Joe Krzykowski' },
  { year: 1994, winner: 'Donnie Woller' },
  { year: 1995, winner: 'Kirby Kurth' },
  { year: 1996, winner: 'Wayne Breitenfeldt' },
  { year: 1997, winner: 'Donnie Woller' },
  { year: 1998, winner: 'Jesse Haase' },
  { year: 1999, winner: 'Mark Mackesy' },
  { year: 2000, winner: 'Chris Wimmer' },
  { year: 2001, winner: 'Scott Wimmer' },
  { year: 2002, winner: 'Scott Wimmer' },
  { year: 2003, winner: 'Chris Weinkauf' },
  { year: 2004, winner: 'Charlie Menard' },
  { year: 2005, winner: 'Allen Check' },
  { year: 2006, winner: 'Mark Mackesy' },
  { year: 2007, winner: 'Eugene Gregorich Jr.' },
  { year: 2008, winner: 'Eugene Gregorich Jr.' },
  { year: 2009, winner: 'Andrew Morrissey' },
  { year: 2010, winner: 'Chris Weinkauf' },
  { year: 2011, winner: 'Chris Weinkauf' },
  { year: 2012, winner: 'Mark Mackesy' },
  { year: 2013, winner: 'Tim Sauter' },
  { year: 2014, winner: 'Tim Sauter' },
  { year: 2015, winner: 'Johnny Sauter' },
  { year: 2016, winner: 'Derek Kraus' },
  { year: 2017, winner: 'Chris Wimmer' },
  { year: 2018, winner: 'Casey Johnson' },
  { year: 2019, winner: 'Gabe Sommers' },
  { year: 2020, winner: 'Justin Mondeik' },
  { year: 2021, winner: 'Ty Majeski' },
  { year: 2022, winner: 'Jonathan Eilen' },
  { year: 2023, winner: 'Brock Heinrich' },
  { year: 2024, winner: 'Justin Mondeik' },
  { year: 2025, winner: 'Mark Mackesy' },
  { year: 2026, winner: 'Casey Johnson' },
]

const eras = [
  { label: '1981–1989', start: 1981, end: 1989 },
  { label: '1990–1999', start: 1990, end: 1999 },
  { label: '2000–2009', start: 2000, end: 2009 },
  { label: '2010–2019', start: 2010, end: 2019 },
  { label: '2020–2026', start: 2020, end: 2026 },
]

const gallery = [
  {
    src: '/special-events/larry-detjens-memorial/larry-detjens-25-pits.jpg',
    alt: 'Larry Detjens No. 25 in the pits',
    caption: 'Larry Detjens No. 25 in the pits',
    credit: 'Kurt Luoma photo',
  },
  {
    src: '/special-events/larry-detjens-memorial/larry-detjens-25-victory-lane.jpg',
    alt: 'Larry Detjens No. 25 in victory lane',
    caption: 'Victory lane celebration',
    credit: 'Kurt Luoma photo',
  },
  {
    src: '/special-events/larry-detjens-memorial/larry-detjens-25-on-track.jpg',
    alt: 'Larry Detjens No. 25 on track',
    caption: 'No. 25 on track',
    credit: 'Photographer unknown',
  },
]

const winCounts = winners.reduce((map, row) => {
  map.set(row.winner, (map.get(row.winner) || 0) + 1)
  return map
}, new Map<string, number>())

const repeatWinners = [...winCounts.entries()]
  .filter(([, wins]) => wins > 1)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

export default function LarryDetjensMemorialPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <img
          src="/special-events/larry-detjens-memorial/larry-detjens-25-pits.jpg"
          alt="Larry Detjens No. 25"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span>
            <Link href="/events">Special Events</Link><span>›</span>
            <span>Larry Detjens Memorial Race</span>
          </div>
          <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
          <h1 className={styles.title}>Larry Detjens Memorial Race</h1>
          <p className={styles.tagline}>46 Editions of Wisconsin Short-Track Memorial History</p>
          <p className={styles.intro}>
            First run in 1981, the Larry Detjens Memorial honors one of Wisconsin short-track racing's standout drivers and has carried his name across generations of late model competition. The Museum preserves a year-by-year winner chronology through the 46th running in 2026.
          </p>
          <div className={styles.heroActions}>
            <a href="#winners" className={styles.button}>View Winner Chronology</a>
            <Link href="/tracks/state-park-speedway-wi" className={styles.buttonGhost}>State Park Speedway</Link>
            <Link href="/tracks/dells-motor-speedway-wi" className={styles.buttonGhost}>Dells Raceway Park</Link>
          </div>
          <div className={styles.stats}>
            <Stat label="Editions Preserved" value="46" />
            <Stat label="Years" value="1981–2026" />
            <Stat label="Different Winners" value={String(winCounts.size)} />
            <Stat label="Most Wins" value="Mark Mackesy • 4" />
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.twoCol}>
            <div className={styles.sourceCard}>
              <div className={styles.sourceLabel}>Honoring Larry Detjens</div>
              <strong>A Wisconsin short-track standout remembered through an enduring late model tradition.</strong>
              <p>
                The Memorial began in 1981 after Detjens died in a racing accident earlier that season. His career included the 1977 State Park Speedway championship and major victories such as the Slinger Nationals and Oktoberfest. The annual race became a lasting part of Wisconsin's late model calendar and a gathering point for generations of regional racers.
              </p>
            </div>
            <div className={styles.sourceCard}>
              <div className={styles.sourceLabel}>The Tradition Continues</div>
              <strong>From State Park to the modern Dells era.</strong>
              <p>
                State Park Speedway became the race's longtime home, with other Wisconsin venues appearing in the event's history. After State Park Speedway closed, the Memorial continued at Dells Raceway Park. Casey Johnson won the 46th annual running there in 2026.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.kicker}>From the Museum Photo Collection</div>
          <div className={styles.sectionHead}>
            <h2>Remembering Larry Detjens</h2>
            <div className={styles.sectionNote}>Original period images supplied to the museum archive.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            {gallery.map((photo) => (
              <figure key={photo.src} style={{ margin: 0, border: '1px solid #343a3e', background: '#101417', overflow: 'hidden' }}>
                <img
                  src={photo.src}
                  alt={photo.alt}
                  style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}
                />
                <figcaption style={{ padding: '11px 12px 12px', color: '#f5f2e9', fontSize: 12, lineHeight: 1.45 }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{photo.caption}</strong>
                  <span style={{ color: '#9ca1a4' }}>{photo.credit}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.kicker}>Multiple-Time Winners</div>
          <div className={styles.sectionHead}>
            <h2>Drivers with More Than One Memorial Victory</h2>
            <div className={styles.sectionNote}>Mark Mackesy leads the museum chronology with four wins.</div>
          </div>
          <div className={styles.eraGrid}>
            {repeatWinners.map(([name, wins]) => (
              <div key={name} className={styles.eraCard}>
                <div className={styles.eraYear}>{wins} {wins === 1 ? 'win' : 'wins'}</div>
                <div className={styles.eraValue}>{name}</div>
                <div className={styles.eraNote}>
                  {winners.filter((row) => row.winner === name).map((row) => row.year).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Museum Chronology Note</div>
            <strong>This archive preserves the continuous 46-edition lineage from 1981 through 2026.</strong>
            <p>
              Some later retrospective winner lists differ on four early/middle-era entries. The museum chronology shown here preserves 1988 Wayne Breitenfeldt, 1989 Wayne Lodholz, and Eugene Gregorich Jr. in both 2007 and 2008, while keeping those years flagged for continued source enrichment as full finishing orders are recovered.
            </p>
          </div>
        </section>

        <section className={styles.section} id="winners">
          <div className={styles.kicker}>Complete Winner Chronology</div>
          <div className={styles.sectionHead}>
            <h2>1981–2026 Winners by Year</h2>
            <div className={styles.sectionNote}>46 editions • 28 different winners • full-result enrichment remains in progress.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12 }}>
            {eras.map((era) => {
              const rows = winners.filter((row) => row.year >= era.start && row.year <= era.end)
              return (
                <article key={era.label} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <div>
                      <div className={styles.eventYear}>{era.label}</div>
                      <div className={styles.eventDate}>{rows.length} editions</div>
                    </div>
                  </div>
                  <div className={styles.panelBody}>
                    <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr)', gap: 8, padding: '7px 8px', borderBottom: '1px solid #4a5054', color: '#92989b', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 900 }}>
                      <span>Year</span><span>Winner</span>
                    </div>
                    {rows.map((row) => (
                      <div key={row.year} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr)', gap: 8, padding: '9px 8px', borderBottom: '1px solid #22282c', fontSize: 12, color: '#c9ccce' }}>
                        <strong style={{ color: '#d0ad63' }}>{row.year}</strong>
                        <strong style={{ color: '#fff' }}>{row.winner}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <div className={styles.footerLinks}>
          <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
          <Link href="/results" className={styles.footerLink}>Race Results Archive<span>Browse results →</span></Link>
          <Link href="/research" className={styles.footerLink}>Research Center<span>Open research tools →</span></Link>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
