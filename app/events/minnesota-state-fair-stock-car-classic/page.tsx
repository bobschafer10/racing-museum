import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 3600

export default async function MinnesotaStateFairClassicPage() {
  const { data: races } = await supabase.from('Events')
    .select('id,race_id,race_date,class_id')
    .eq('track_id',128)
    .gte('year',1949).lte('year',1997)
    .order('race_date',{ascending:false})
  const { data: classData } = await supabase.from('Classes').select('id,name')
  const classes = new Map((classData ?? []).map((c: {id:number;name:string}) => [c.id,c.name]))
  // The source material covers the State Fair Labor Day Stock Car Classic.
  // Show candidate fair-weekend results as cross-references, not confirmed event entries.
  const fairWeekendRaces = (races ?? []).filter((r: {race_date:string|null}) => {
    if (!r.race_date) return false
    const date = new Date(r.race_date+'T12:00:00Z')
    const m = date.getUTCMonth()+1, d = date.getUTCDate()
    return (m===8 && d>=25) || (m===9 && d<=8)
  })
  return <main className={styles.page}>
    <section className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Minnesota State Fair Stock Car Classic</span></div>
      <div className={styles.eyebrow}>Minnesota State Fairgrounds · Saint Paul, Minnesota</div>
      <h1 className={styles.title}>Minnesota State Fair Stock Car Classic</h1>
      <p className={styles.tagline}>The Labor Day Fair Racing Tradition</p>
      <p className={styles.intro}>An important Minnesota State Fair stock car racing tradition, with historical winner material spanning 1949 through 1997. The museum is reconciling its Labor Day 300 / Stock Car Classic records with the full Minnesota State Fair racing archive.</p>
      <div className={styles.heroActions}><Link href="/events" className={styles.buttonGhost}>All Special Events</Link><Link href="#research" className={styles.button}>Historical Race Research</Link></div>
      <div className={styles.stats}><Stat label="Historical Coverage" value="1949–1997"/><Stat label="Museum Track" value="Minnesota State Fair"/><Stat label="1985 Edition" value="Rained Out"/><Stat label="Archive Status" value="Reconciliation"/></div>
    </div></section>
    <div className={styles.content}>
      <section className={styles.section} id="research">
        <div className={styles.kicker}>Historical Research</div><h2>Labor Day Stock Car Racing</h2>
        <div className={styles.sourceCard}><div className={styles.sourceLabel}>Research and Identification</div>
          <strong>Event results are being matched to existing track records.</strong>
          <p>Historical race-winner documentation supplied to the museum includes the Stock Car Classic and related Labor Day racing. Some years have multiple races, classes or sanctioning organizations; they must be checked individually before being assigned to this special event.</p>
          <p>Research notes: the 1981 program included Mike Miller and Butch Lindley among its reported winners. The 1985 edition was rained out. Historical driver-name and division corrections remain under review, including Chuck Magnison (1952) and Dick Hutcherson (1963).</p>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.kicker}>Cross-reference</div><div className={styles.sectionHead}><h2>Museum Fair-Weekend Race Records</h2><div className={styles.sectionNote}>These are candidate source races at the Minnesota State Fair track, not yet certified as part of the Stock Car Classic.</div></div>
        <div className={styles.eventStack}>
          {fairWeekendRaces.map((race: {id:number;race_date:string|null;class_id:number|null}) =>
            <article key={race.id} className={styles.eventCard}><div className={styles.eventHeader}>
              <div><div className={styles.eventYear}>{race.race_date?.slice(0,4) ?? 'Unknown year'}</div><div className={styles.eventDate}>{race.race_date ?? 'Date unknown'}</div></div>
              <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Division</span><strong className={styles.winnerName}>{classes.get(race.class_id ?? -1) ?? 'Not classified'}</strong></div>
            </div></article>)}
        </div>
      </section>
      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>All event collections →</span></Link><Link href="/tracks/minnesota-state-fair-mn" className={styles.footerLink}>Minnesota State Fair<span>Full track archive →</span></Link></div>
    </div>
  </main>
}
function Stat({label,value}:{label:string;value:string}) { return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div> }
