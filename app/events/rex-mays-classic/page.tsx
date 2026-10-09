import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 43200

const winners = [
  [1950,'Tony Bettenhausen',100],[1951,'Tony Bettenhausen',100],[1952,'Mike Nazaruk',100],[1953,'Jack McGrath',100],
  [1954,'Chuck Stevenson',100],[1955,'Johnny Thomson',100],[1956,'Pat Flaherty',100],[1957,'Rodger Ward',100],
  [1958,'Art Bisch',100],[1959,'Johnny Thomson',100],[1960,'Rodger Ward',100],[1961,'Rodger Ward',100],
  [1962,'A. J. Foyt',100],[1963,'Rodger Ward',100],[1964,'A. J. Foyt',100],[1965,'Parnelli Jones',100],
  [1966,'Mario Andretti',100],[1967,'Gordon Johncock',150],[1968,'Lloyd Ruby',150],[1969,'Greg Weld / Art Pollard',150],
  [1970,'Joe Leonard',150],[1971,'Al Unser',150],[1972,'Bobby Unser',150],[1973,'Bobby Unser',150],
  [1974,'Johnny Rutherford',150],[1975,'A. J. Foyt',150],[1976,'Mike Mosley',150],[1977,'Johnny Rutherford',150],
  [1978,'Rick Mears',150],[1979,'A. J. Foyt',150],[1980,'Bobby Unser',150],[1981,'Mike Mosley',150],
  [1982,'Gordon Johncock',150],[1983,'Tom Sneva',150],[1984,'Tom Sneva',200],[1985,'Mario Andretti',200],
] as const

const continuation = [
  [1986,'Michael Andretti','Miller American 200, in Honor of Rex Mays'],
  [1987,'Michael Andretti','Miller American 200, in Honor of Rex Mays'],
] as const

export default async function RexMaysClassicPage() {
  const counts = new Map<string,number>()
  for (const [,name] of winners) {
    for (const driver of name.split(' / ')) counts.set(driver,(counts.get(driver)||0)+1)
  }
  const repeats = [...counts.entries()].filter(([,count])=>count>1).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))

  const { data: raceRows } = await supabase
    .from('Events')
    .select('race_id,year,race_date,class_id')
    .in('track_id', [125, 191])
    .in('class_id', [16, 38])
    .gte('race_date', '1950-06-01')
    .lte('race_date', '1985-06-30')
    .order('race_date', { ascending: true })

  const juneRaceRows = (raceRows || []).filter((row: any) => {
    const date = String(row.race_date || '')
    return date.slice(5, 7) === '06' && Number(row.year) >= 1950 && Number(row.year) <= 1985
  })

  const raceIds = juneRaceRows.map((row: any) => Number(row.race_id)).filter(Number.isFinite)
  const { data: resultRows } = raceIds.length
    ? await supabase.from('Results').select('race_id,driver_id,finishing_position').in('race_id', raceIds).order('finishing_position', { ascending: true })
    : { data: [] as any[] }

  const driverIds = Array.from(new Set((resultRows || []).map((row: any) => Number(row.driver_id)).filter(Number.isFinite)))
  const { data: driverRows } = driverIds.length
    ? await supabase.from('Drivers').select('driver_id,driver_name,slug').in('driver_id', driverIds)
    : { data: [] as any[] }

  const drivers = new Map((driverRows || []).map((row: any) => [Number(row.driver_id), row]))
  const fields = juneRaceRows.map((race: any) => ({
    ...race,
    finishers: (resultRows || [])
      .filter((row: any) => Number(row.race_id) === Number(race.race_id))
      .map((row: any) => ({ ...row, driver: drivers.get(Number(row.driver_id)) }))
      .filter((row: any) => row.driver),
  })).filter((race: any) => race.finishers.length)

  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Rex Mays Classic</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Rex Mays Classic</h1>
        <p className={styles.tagline}>The Milwaukee Mile's Post-Indianapolis Championship-Car Classic</p>
        <p className={styles.intro}>Named in 1950 for two-time AAA national champion Rex Mays, the June championship-car race at the Milwaukee Mile carried the Rex Mays Classic name through 1985. It began as a 100-mile dirt-track event, continued after the Mile was paved in 1954, grew to 150 miles in 1967 and reached 200 miles for its final two named editions.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/milwaukee-mile-wi" className={styles.button}>Open Milwaukee Mile</Link>
          <Link href="#winners" className={styles.buttonGhost}>Winner Chronology</Link>
          <a href="https://www.champcarstats.com/tracks/milwaukee.htm" target="_blank" rel="noreferrer" className={styles.buttonGhost}>Champ Car Stats</a>
        </div>
        <div className={styles.stats}>
          <Stat label="Named Editions" value="36"/>
          <Stat label="Years" value="1950–1985"/>
          <Stat label="Original Distance" value="100 mi."/>
          <Stat label="Final Distance" value="200 mi."/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Why Rex Mays?</div>
            <strong>The Milwaukee race was renamed one year after Mays was killed in competition.</strong>
            <p>Mays won at Milwaukee three times before the memorial name existed — in 1937, 1941 and 1946. Beginning with the June 11, 1950 race, the post-Indianapolis Milwaukee championship event became the Rex Mays Classic.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Event Identity</div>
            <strong>The museum treats 1950–1985 as the formal Rex Mays Classic lineage.</strong>
            <p>The 1986 and 1987 races were renamed the Miller American 200 but explicitly retained “in Honor of Rex Mays.” They are shown below as a two-year continuation rather than counted among the 36 named Classic editions.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Event Eras</div>
        <div className={styles.sectionHead}><h2>From AAA Dirt Cars to CART Ground-Effect Machines</h2><div className={styles.sectionNote}>One race name spanning enormous changes in American championship-car racing.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1950–1953</div><div className={styles.eraValue}>AAA • Dirt Mile</div><div className={styles.eraNote}>The first four Classics were 100-mile races on the original dirt Milwaukee Mile.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1954–1966</div><div className={styles.eraValue}>Paved 100-Mile Era</div><div className={styles.eraNote}>Milwaukee was paved in 1954; AAA sanctioned through 1955 and USAC took over in 1956.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1967–1983</div><div className={styles.eraValue}>150-Mile Classic</div><div className={styles.eraNote}>The race expanded to 150 miles and became a major post-Indy test of both speed and durability.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1984–1985</div><div className={styles.eraValue}>200-Mile Finale</div><div className={styles.eraNote}>Tom Sneva and Mario Andretti won the final two races carrying the Rex Mays Classic name.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Multiple-Time Winners</div>
        <div className={styles.sectionHead}><h2>The Repeat Winners</h2><div className={styles.sectionNote}>Rodger Ward and A. J. Foyt each won the Classic four times.</div></div>
        <div className={styles.eraGrid}>
          {repeats.map(([name,count]) => <div key={name} className={styles.eraCard}><div className={styles.eraYear}>{count} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{winners.filter(([,winner])=>winner.split(' / ').includes(name)).map(([year])=>year).join(' • ')}</div></div>)}
        </div>
      </section>

      <section className={styles.section} id="winners">
        <div className={styles.kicker}>Complete Winner Lineage</div>
        <div className={styles.sectionHead}><h2>Rex Mays Classic Winners, 1950–1985</h2><div className={styles.sectionNote}>Year, winning driver and scheduled race distance. The 1969 race is preserved as a shared-drive victory.</div></div>
        <div className={styles.eraGrid}>
          {winners.map(([year,winner,miles]) => <div key={year} className={styles.eraCard}><div className={styles.eraYear}>{year}</div><div className={styles.eraValue}>{winner}</div><div className={styles.eraNote}>{miles} miles • Milwaukee Mile</div></div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Museum Database Results</div>
        <div className={styles.sectionHead}><h2>Preserved Finishing Orders</h2><div className={styles.sectionNote}>These are the finishing positions already preserved in the museum database. Short fields are labeled partial rather than presented as complete.</div></div>
        <div className={styles.eraGrid}>
          {fields.map((race: any) => <div key={race.race_id} className={styles.eraCard}>
            <div className={styles.eraYear}>{race.year} • {race.finishers.length >= 20 ? 'Full field' : 'Partial field'}</div>
            <div className={styles.eraValue}>{race.finishers.length} preserved finishers</div>
            <div className={styles.eraNote}>
              {race.finishers.map((row: any) => {
                const label = `${row.finishing_position}. ${row.driver.driver_name}`
                return row.driver.slug
                  ? <span key={row.driver_id}><Link href={`/drivers/${row.driver.slug}`}>{label}</Link>{' • '}</span>
                  : <span key={row.driver_id}>{label} • </span>
              })}
            </div>
          </div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Epilogue</div>
        <div className={styles.sectionHead}><h2>“In Honor of Rex Mays”</h2><div className={styles.sectionNote}>The memorial identity remained explicit for two seasons after the Classic name disappeared.</div></div>
        <div className={styles.eraGrid}>
          {continuation.map(([year,winner,name]) => <div key={year} className={styles.eraCard}><div className={styles.eraYear}>{year}</div><div className={styles.eraValue}>{winner}</div><div className={styles.eraNote}>{name}</div></div>)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sourceCard}>
          <div className={styles.sourceLabel}>Primary Historical Sources</div>
          <strong>The winner chronology and race distances are cross-checked against Champ Car Stats and Milwaukee Mile historical material.</strong>
          <p>The next enrichment stage is full-field finishing orders for every edition. Championship-car archives are unusually strong for this event, so the Rex Mays Classic should eventually become one of the museum's deepest pre-1980 Special Event collections.</p>
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/milwaukee-mile-wi" className={styles.footerLink}>Milwaukee Mile<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue full-field enrichment →</span></Link>
      </div>
    </div>
  </main>
}

function Stat({label,value}:{label:string,value:string}) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
