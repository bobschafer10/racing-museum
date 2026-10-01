import Link from 'next/link'
import styles from '../special-event.module.css'
import { SpecialEventResults } from '../SpecialEventResults'
import { getSpecialEventResults, type SpecialEventRaceConfig } from '@/lib/specialEventResults'

export const revalidate = 300

type Winner={year:number;winner:string;venue?:string}
const hero='https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/capital-super-speedway/1975/capital-super-speedway_1975_joe-shear_mike-napierala_photo_001.jpg'
const winners:Winner[]=[
 {year:2008,winner:'Dan Fredrickson'},{year:2009,winner:'Nathan Haseleu'},{year:2010,winner:'Steve Carlson'},
 {year:2011,winner:'Ross Kenseth'},{year:2012,winner:'Andrew Morrissey'},{year:2013,winner:'Travis Sauter'},
 {year:2014,winner:'Nathan Haseleu'},{year:2015,winner:'Johnny Sauter'},{year:2016,winner:'Ty Majeski'},
 {year:2017,winner:'Andrew Morrissey'},{year:2018,winner:'Austin Nason'},{year:2019,winner:'Bubba Pollard'},
 {year:2020,winner:'Johnny Sauter',venue:'Dells Raceway Park'},{year:2021,winner:'Rich Bickle Jr.'},{year:2022,winner:'Casey Johnson'},
 {year:2023,winner:'Ty Majeski'},{year:2024,winner:'Ty Majeski'},{year:2025,winner:'Casey Johnson'},
 {year:2026,winner:'Austin Nason'}
]
const resultRaces: SpecialEventRaceConfig[]=[
 {year:2008,raceId:69813,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2009,raceId:35282,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2010,raceId:109519,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2011,raceId:157581,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2012,raceId:157588,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2013,raceId:157597,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2014,raceId:112704,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2015,raceId:113647,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2016,raceId:114626,label:'Joe Shear Classic',venue:'Madison International Speedway'},
 {year:2017,raceId:115719,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2018,raceId:116400,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2019,raceId:117052,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2020,raceId:27477,label:'Joe Shear Classic',venue:'Dells Raceway Park'},
 {year:2021,raceId:49896,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2022,raceId:15323,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2023,raceId:10324,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2024,raceId:27476,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2025,raceId:27487,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
 {year:2026,raceId:153806,label:'Joe Shear Classic 200',venue:'Madison International Speedway'},
]

const counts=winners.reduce((m,r)=>m.set(r.winner,(m.get(r.winner)||0)+1),new Map<string,number>())
const repeats=[...counts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))

export default async function JoeShearClassicPage(){
 const resultArchive = await getSpecialEventResults(resultRaces)
 return <main className={styles.page}>
  <section className={styles.hero}><img src={hero} alt="Joe Shear at Capital Super Speedway" className={styles.heroImage}/><div className={styles.heroShade}/><div className={styles.heroInner}>
   <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Joe Shear Classic</span></div>
   <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div><h1 className={styles.title}>Joe Shear Classic</h1>
   <p className={styles.tagline}>Madison's Spring Memorial for a Midwest Short-Track Legend</p>
   <p className={styles.intro}>Madison International Speedway and the ASA Midwest Tour have honored Joe Shear with the Joe Shear Classic since 2008. The race began as a 100-lap event and became a 200-lap Super Late Model test in 2017.</p>
   <div className={styles.heroActions}><a href="#winners" className={styles.button}>View All Winners</a><Link href="/tracks/capital-super-speedway-wi" className={styles.buttonGhost}>Madison / Capital Archive</Link></div>
   <div className={styles.stats}><Stat label="Editions" value="19"/><Stat label="Years" value="2008–2026"/><Stat label="Current Distance" value="200 laps"/><Stat label="Most Wins" value="Ty Majeski • 3"/></div>
  </div></section>
  <div className={styles.content}>
   <section className={styles.section}><div className={styles.twoCol}>
    <div className={styles.sourceCard}><div className={styles.sourceLabel}>Honoring Joe Shear</div><strong>A driver deeply tied to the Oregon, Wisconsin half-mile.</strong><p>Madison International Speedway's history credits Shear with four track championships at Capital Super Speedway — the earlier name of today's Madison International Speedway — and 66 feature victories at the oval. The memorial race keeps that Madison connection at the center of the event.</p></div>
    <div className={styles.sourceCard}><div className={styles.sourceLabel}>The Classic</div><strong>From 100 laps to a 200-lap spring centerpiece.</strong><p>The inaugural race was held May 4, 2008, with more than 40 cars entered and 28 taking the green. Dan Fredrickson won the first 100-lapper. The event expanded to 200 laps in 2017. The only edition away from Madison came in 2020, when the pandemic moved the race to Dells Raceway Park.</p></div>
   </div></section>
   <section className={styles.section}><div className={styles.kicker}>Joe Shear at Capital</div><div className={styles.sectionHead}><h2>Museum Photo Collection</h2><div className={styles.sectionNote}>Joe Shear at Capital Super Speedway, 1975.</div></div>
    <figure style={{margin:0,border:'1px solid #343a3e',background:'#101417',overflow:'hidden',maxWidth:760}}><img src={hero} alt="Joe Shear at Capital Super Speedway in 1975" style={{display:'block',width:'100%',aspectRatio:'16 / 9',objectFit:'cover'}}/><figcaption style={{padding:12,fontSize:12,color:'#c9ccce'}}><strong style={{display:'block',color:'#fff'}}>Joe Shear — Capital Super Speedway, 1975</strong>Mike Napierala photo</figcaption></figure>
   </section>
   <section className={styles.section}><div className={styles.kicker}>Multiple-Time Winners</div><div className={styles.sectionHead}><h2>Drivers with More Than One Joe Shear Classic Win</h2><div className={styles.sectionNote}>Ty Majeski became the first three-time winner with victories in 2016, 2023 and 2024.</div></div><div className={styles.eraGrid}>
    {repeats.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{winners.filter(r=>r.winner===name).map(r=>r.year).join(' • ')}</div></div>)}
   </div></section>
   <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>2020 Exception</div><strong>One Joe Shear Classic was run away from Madison.</strong><p>The 2020 event moved to Dells Raceway Park during the COVID-19 pandemic. Johnny Sauter won with a last-lap pass on Casey Johnson. The Classic returned to Madison in 2021.</p></div></section>
   <section className={styles.section} id="winners"><div className={styles.kicker}>Complete Winner Chronology</div><div className={styles.sectionHead}><h2>2008–2026</h2><div className={styles.sectionNote}>Winner lineage through the 19th running in 2026.</div></div>
    <article className={styles.eventCard}><div className={styles.panelBody}>
     <div style={{display:'grid',gridTemplateColumns:'72px minmax(180px,1fr) minmax(180px,.8fr)',gap:8,padding:'7px 8px',borderBottom:'1px solid #4a5054',color:'#92989b',fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:900}}><span>Year</span><span>Winner</span><span>Venue</span></div>
     {winners.map(row=><div key={row.year} style={{display:'grid',gridTemplateColumns:'72px minmax(180px,1fr) minmax(180px,.8fr)',gap:8,padding:'10px 8px',borderBottom:'1px solid #22282c',fontSize:12,color:'#c9ccce'}}><strong style={{color:'#d0ad63'}}>{row.year}</strong><strong style={{color:'#fff'}}>{row.winner}</strong><span>{row.venue||'Madison International Speedway'}</span></div>)}
    </div></article>
   </section>
   <SpecialEventResults
    races={resultArchive}
    note="The 2008–2026 winner lineage is complete. Available finishing orders are published to their preserved depth; editions without a reliable full field remain partial rather than inferred."
   />
   <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Primary Event History</div><strong>Madison International Speedway maintains the official Joe Shear Classic history.</strong><p>The museum chronology follows Madison's published past-winners list through 2025 and the track's 2026 report identifying Austin Nason as the May 3, 2026 winner.</p><a href="https://misracing.com/who-was-joe-shear-a-history-of-the-joe-shear-classic-and-its-namesake/" target="_blank" rel="noreferrer" style={{color:'#d0ad63'}}>Madison International Speedway event history →</a></div></section>
   <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/capital-super-speedway-wi" className={styles.footerLink}>Madison / Capital<span>Open track archive →</span></Link><Link href="/tracks/dells-motor-speedway-wi" className={styles.footerLink}>Dells Raceway Park<span>2020 host →</span></Link></div>
  </div>
 </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
