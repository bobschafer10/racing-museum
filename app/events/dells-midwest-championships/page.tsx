import Link from 'next/link'
import styles from '../special-event.module.css'
import { SpecialEventResults } from '../SpecialEventResults'
import { getSpecialEventResults, type SpecialEventRaceConfig } from '@/lib/specialEventResults'

export const revalidate = 43200

type Row = { year: number; winner: string; note?: string }

const hero = 'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/dells-motor-speedway/1979/dells-motor-speedway_1979_dick-trickle_kurt-luoma_photo_001.jpg'
const archiveImage = 'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/unknown-track/unknown-year/unknown-track_unknown-year_dells-midwest-championships-results_unknown-photographer_photo_001.jpg'

const rows: Row[] = [
  { year: 1972, winner: 'Dick Trickle', note: 'Inaugural 200-lap championship' },
  { year: 1973, winner: 'Joe Ruttman' },
  { year: 1974, winner: 'Joe Shear' },
  { year: 1975, winner: 'Ed Howe' },
  { year: 1976, winner: 'Joe Shear' },
  { year: 1977, winner: 'Mike Miller' },
  { year: 1978, winner: 'Mike Miller' },
  { year: 1979, winner: 'Marv Marzofka' },
  { year: 1980, winner: 'Dick Trickle' },
  { year: 1981, winner: 'Larry Detjens' },
  { year: 1982, winner: 'Jim Sauter' },
  { year: 1983, winner: 'Jim Back' },
  { year: 1984, winner: 'Mark Martin', note: '13th annual Midwest Championships' },
  { year: 1985, winner: 'Dick Trickle', note: 'Saturday 40-lap winner; Sunday twin 50s rained out' },
  { year: 1986, winner: 'Butch Miller', note: 'Saturday 50-lap winner; Sunday finale rained out' },
  { year: 1987, winner: 'Steve Carlson', note: 'Overall late model champion' },
  { year: 1988, winner: 'Steve Holzhausen', note: 'Overall late model champion; Doug Herbst won Saturday 100' },
  { year: 1989, winner: 'Steve Carlson', note: '100-lap late model feature' },
  { year: 1990, winner: 'Kevin Cywinski', note: '100-lap CWRA late model feature' },
  { year: 1991, winner: 'Jim Weber', note: '20th Anniversary; 150-lap ARTGO feature' },
]

const resultRaces: SpecialEventRaceConfig[] = [
  { year: 1972, raceId: 51975, label: '200-lap Late Model feature', venue: 'Dells Motor Speedway' },
  { year: 1973, raceId: 22122, label: 'Late Model feature', venue: 'Dells Motor Speedway' },
  { year: 1976, raceId: 23946, label: 'Late Model feature 1', venue: 'Dells Motor Speedway' },
  { year: 1976, raceId: 47740, label: 'Late Model feature 2', venue: 'Dells Motor Speedway' },
  { year: 1976, raceId: 75191, label: 'Late Model feature 3', venue: 'Dells Motor Speedway' },
  { year: 1978, raceId: 47735, label: 'Late Model feature 1', venue: 'Dells Motor Speedway' },
  { year: 1978, raceId: 69747, label: 'Late Model feature 2', venue: 'Dells Motor Speedway' },
  { year: 1978, raceId: 23953, label: 'Late Model feature 3', venue: 'Dells Motor Speedway' },
  { year: 1979, raceId: 37206, label: 'Late Model feature', venue: 'Dells Motor Speedway' },
  { year: 1982, raceId: 19360, label: 'Weekend feature 1', venue: 'Dells Motor Speedway' },
  { year: 1982, raceId: 40268, label: 'Weekend feature 2', venue: 'Dells Motor Speedway' },
  { year: 1982, raceId: 22149, label: 'Weekend feature 3', venue: 'Dells Motor Speedway' },
  { year: 1983, raceId: 87473, label: 'Weekend feature 1', venue: 'Dells Motor Speedway' },
  { year: 1983, raceId: 5515, label: 'Weekend feature 2', venue: 'Dells Motor Speedway' },
  { year: 1983, raceId: 5521, label: 'Weekend feature 3', venue: 'Dells Motor Speedway' },
  { year: 1984, raceId: 1155, label: 'First 50-lap feature', venue: 'Dells Motor Speedway' },
  { year: 1984, raceId: 70178, label: 'Second 50-lap feature', venue: 'Dells Motor Speedway' },
  { year: 1985, raceId: 40250, label: 'Saturday 40-lap Invitational', venue: 'Dells Motor Speedway' },
  { year: 1986, raceId: 70203, label: 'Saturday 50-lap Invitational', venue: 'Dells Motor Speedway' },
  { year: 1987, raceId: 60764, label: 'Weekend feature 1', venue: 'Dells Motor Speedway' },
  { year: 1987, raceId: 1692, label: 'Weekend feature 2', venue: 'Dells Motor Speedway' },
  { year: 1987, raceId: 69838, label: 'Weekend feature 3', venue: 'Dells Motor Speedway' },
  { year: 1988, raceId: 70165, label: 'Saturday 100-lap feature', venue: 'Dells Motor Speedway' },
  { year: 1988, raceId: 69883, label: 'Sunday 100-lap feature', venue: 'Dells Motor Speedway' },
  { year: 1989, raceId: 74247, label: '100-lap Late Model feature', venue: 'Dells Motor Speedway' },
  { year: 1990, raceId: 1685, label: '100-lap CWRA Late Model feature', venue: 'Dells Motor Speedway' },
  { year: 1991, raceId: 52278, label: '150-lap ARTGO feature', venue: 'Dells Motor Speedway' },
]

const winCounts = rows.reduce((m,row)=>m.set(row.winner,(m.get(row.winner)||0)+1),new Map<string,number>())
const repeats=[...winCounts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))

export default async function DellsMidwestChampionshipsPage(){
  const resultArchive = await getSpecialEventResults(resultRaces)
  return <main className={styles.page}>
    <section className={styles.hero}>
      <img src={hero} alt="Dells Motor Speedway period late model racing" className={styles.heroImage}/>
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Dells Midwest Championships</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Dells Midwest Championships</h1>
        <p className={styles.tagline}>20 Editions of Wisconsin Dells Fall Championship Racing</p>
        <p className={styles.intro}>From 1972 through 1991, the Midwest Championships served as Dells Motor Speedway's major late-season special. The event evolved from a rich 200-lap open late model race into ARTGO championship weekends and later CWRA-era fall finales.</p>
        <div className={styles.heroActions}><a href="#chronology" className={styles.button}>View 20 Editions</a><Link href="/tracks/dells-motor-speedway-wi" className={styles.buttonGhost}>Dells Motor Speedway</Link></div>
        <div className={styles.stats}><Stat label="Editions" value="20"/><Stat label="Years" value="1972–1991"/><Stat label="Inaugural Distance" value="200 laps"/><Stat label="Archive Backbone" value="MRN OCR"/></div>
      </div>
    </section>
    <div className={styles.content}>
      <section className={styles.section}><div className={styles.twoCol}>
        <div className={styles.sourceCard}><div className={styles.sourceLabel}>The Beginning</div><strong>A major two-day late model race from its first running.</strong><p>Midwest Racing News advertised the inaugural 1972 event with a $16,000 purse, a 200-lap feature and $2,500 to the winner. Dick Trickle won that first edition. The 1973 advertising explicitly called the race the second annual Midwest Championship, fixing the beginning of the lineage at 1972.</p></div>
        <div className={styles.sourceCard}><div className={styles.sourceLabel}>How It Evolved</div><strong>The format changed, but the September tradition remained.</strong><p>The weekend moved through long-distance features, twin-feature formats, ARTGO season finales and open/CWRA years. Weather also shaped the history: the Sunday finals were rained out in both 1985 and 1986.</p></div>
      </div></section>

      <section className={styles.section}><div className={styles.kicker}>Period Archive</div><div className={styles.sectionHead}><h2>Midwest Championships Material</h2><div className={styles.sectionNote}>Museum-held Dells results material and period imagery.</div></div>
        <div className={styles.twoCol}>
          <figure style={{margin:0,border:'1px solid #343a3e',background:'#101417',overflow:'hidden'}}><img src={hero} alt="Dick Trickle at Dells Motor Speedway" style={{display:'block',width:'100%',aspectRatio:'4 / 3',objectFit:'cover'}}/><figcaption style={{padding:12,fontSize:12,color:'#c9ccce'}}><strong style={{display:'block',color:'#fff'}}>Dells Motor Speedway, 1979</strong>Kurt Luoma photo</figcaption></figure>
          <figure style={{margin:0,border:'1px solid #343a3e',background:'#101417',overflow:'hidden'}}><img src={archiveImage} alt="Dells Midwest Championships results archive" style={{display:'block',width:'100%',aspectRatio:'4 / 3',objectFit:'cover'}}/><figcaption style={{padding:12,fontSize:12,color:'#c9ccce'}}><strong style={{display:'block',color:'#fff'}}>Midwest Championships results material</strong>Museum archive</figcaption></figure>
        </div>
      </section>

      <section className={styles.section}><div className={styles.kicker}>Repeat Headline Winners</div><div className={styles.sectionHead}><h2>Drivers with Multiple Wins</h2><div className={styles.sectionNote}>The event format changed over time, so the chronology preserves the headline/overall winner recognized for each edition.</div></div><div className={styles.eraGrid}>
        {repeats.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{rows.filter(r=>r.winner===name).map(r=>r.year).join(' • ')}</div></div>)}
      </div></section>

      <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Research Note</div><strong>The 20-year lineage is established, but “winner” does not always mean the same race format.</strong><p>For 1972–1984, MRN's own 1985 prior-winners list provides the event winner chronology. Beginning in 1985, the weekend format changed enough that the museum records rain-shortened editions, overall champions and headline feature winners with notes rather than forcing every year into a single identical definition.</p></div></section>

      <section className={styles.section} id="chronology"><div className={styles.kicker}>Complete Headline Chronology</div><div className={styles.sectionHead}><h2>1972–1991</h2><div className={styles.sectionNote}>Twenty consecutive annual editions documented in Midwest Racing News.</div></div>
        <article className={styles.eventCard}><div className={styles.panelBody}>
          <div style={{display:'grid',gridTemplateColumns:'72px minmax(150px,.7fr) minmax(230px,1.3fr)',gap:8,padding:'7px 8px',borderBottom:'1px solid #4a5054',color:'#92989b',fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:900}}><span>Year</span><span>Winner</span><span>Format / Note</span></div>
          {rows.map(row=><div key={row.year} style={{display:'grid',gridTemplateColumns:'72px minmax(150px,.7fr) minmax(230px,1.3fr)',gap:8,padding:'10px 8px',borderBottom:'1px solid #22282c',fontSize:12,color:'#c9ccce'}}><strong style={{color:'#d0ad63'}}>{row.year}</strong><strong style={{color:'#fff'}}>{row.winner}</strong><span>{row.note||'Midwest Championships headline winner'}</span></div>)}
        </div></article>
      </section>
      <SpecialEventResults
        races={resultArchive}
        note="The 20-edition winner lineage is complete. Recovered finishing orders are shown to the depth preserved by MRN and museum records; unresolved positions remain blank rather than reconstructed."
      />
      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/dells-motor-speedway-wi" className={styles.footerLink}>Dells Motor Speedway<span>Open track archive →</span></Link><Link href="/research" className={styles.footerLink}>Research Center<span>Continue research →</span></Link></div>
    </div>
  </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
