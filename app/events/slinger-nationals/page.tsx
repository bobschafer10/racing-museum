import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

const SERIES_ID = 38
const mrnYears = [1981, 1982, 1983, 1987, 1999]
const eras = [
  { label: '1980', value: '3 races', note: 'Opening season of the Slinger Nationals series format.' },
  { label: '1981–1982', value: '4 races/year', note: 'Multi-race Nationals series seasons.' },
  { label: '1983–1998', value: 'Generally 3/year', note: 'Historic series-era structure.' },
  { label: '1999', value: '2 races', note: 'Final multi-race Nationals season.' },
  { label: '2000–2026', value: '1 race/year', note: 'Modern annual Slinger Nationals event.' },
]

function photoUrl(fileName?: string | null, year?: string | null) {
  if (!fileName) return ''
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? `${base}/storage/v1/object/public/media/photos/master/slinger-speedway-wi/${year || 'unknown-year'}/${fileName}` : ''
}

export default async function SlingerNationalsPage() {
  const [{ data: events }, { data: photos }] = await Promise.all([
    supabase.from('SeriesEvents').select('id,race_date').eq('series_id', SERIES_ID).order('race_date', { ascending: false }),
    supabase.from('photos').select('file_name,year').eq('track_slug', 'slinger-speedway-wi').neq('credit_type', 'unknown').order('year', { ascending: false }).limit(8),
  ])
  const eventIds = (events || []).map((row: any) => row.id)
  const { count: resultCount } = eventIds.length
    ? await supabase.from('SeriesEventResults').select('id', { count: 'exact', head: true }).in('series_event_id', eventIds)
    : { count: 0 }
  const heroPhoto = photos?.[0]
  const heroSrc = photoUrl(heroPhoto?.file_name, heroPhoto?.year)

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc ? <img src={heroSrc} alt="Historic racing at Slinger Speedway" className={styles.heroImage} /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Slinger Nationals</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Slinger Nationals</h1>
        <p className={styles.tagline}>The Nationals Build Legends</p>
        <p className={styles.intro}>From the original multi-race Nationals series to the modern annual classic at Slinger Speedway, this archive preserves feature winners, full finishing orders, DNQs where available, and surviving historical point standings.</p>
        <div className={styles.heroActions}><Link href="/tracks/slinger-speedway-wi" className={styles.button}>Open Slinger Speedway</Link><Link href="#years" className={styles.buttonGhost}>Browse Years</Link></div>
        <div className={styles.stats}>
          <Stat label="Years Covered" value="1980–2026" />
          <Stat label="Race Events" value={String(events?.length || 88)} />
          <Stat label="Result Rows" value={(resultCount || 0).toLocaleString('en-US')} />
          <Stat label="Archive Status" value="Complete" />
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div>
            <div className={styles.kicker}>Event Evolution</div>
            <div className={styles.sectionHead}><h2>Archive Structure</h2></div>
            <div className={styles.eraGrid}>{eras.map((era) => <div key={era.label} className={styles.eraCard}><div className={styles.eraYear}>{era.label}</div><div className={styles.eraValue}>{era.value}</div><div className={styles.eraNote}>{era.note}</div></div>)}</div>
          </div>
          <aside className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Historical Sources</div>
            <strong>Point standings and surviving race records</strong>
            <p>The Third Turn is the primary race-results source. Midwest Racing News supplements final point standings where the publication preserved clearer totals.</p>
            <div>{mrnYears.map((year) => <span key={year} className={styles.badge} style={{marginRight:6}}>{year}</span>)}</div>
            <p>Missing totals remain blank rather than reconstructed. Weekly Slinger Speedway track points are not treated as Slinger Nationals standings.</p>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Museum Archive Status</div>
        <div className={styles.sectionHead}><h2>Current Archive Status</h2></div>
        <div className={styles.statusGrid}>
          <Status title="Race inventory" value="Complete through 2026" />
          <Status title="Feature results" value={`${(resultCount || 0).toLocaleString('en-US')} rows`} />
          <Status title="DNQs" value="Preserved where listed" />
          <Status title="Source conflicts" value="Reviewed and cleaned" />
          <Status title="Point standings" value="Partial by surviving source" />
          <Status title="Museum archive" value="Connected" />
        </div>
      </section>

      <section className={styles.section} id="years">
        <div className={styles.kicker}>Complete Event History</div>
        <div className={styles.sectionHead}><h2>Year-by-Year Archive</h2><div className={styles.sectionNote}>Open a season to view race results, DNQs, and point standings where preserved.</div></div>
        <div className={styles.yearGrid}>{Array.from({ length: 47 }, (_, i) => 2026 - i).map((year) => <Link key={year} href={`/events/slinger-nationals/${year}`} className={styles.yearCard}><div className={styles.yearNumber}>{year}</div><div className={styles.yearStatus}>{year < 2000 ? 'Series era' : 'Annual event'}</div>{mrnYears.includes(year) ? <div className={styles.badge}>MRN points</div> : null}</Link>)}</div>
      </section>

      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/slinger-speedway-wi" className={styles.footerLink}>Slinger Speedway<span>Open track archive →</span></Link><Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link></div>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
function Status({title,value}:{title:string;value:string}){return <div className={styles.statusCard}><div className={styles.statusTitle}>{title}</div><div className={styles.statusValue}>{value}</div></div>}
