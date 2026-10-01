import Link from 'next/link'
import styles from '../special-event.module.css'
import { SpecialEventResults } from '../SpecialEventResults'
import { getSpecialEventResults, type SpecialEventRaceConfig } from '@/lib/specialEventResults'

export const revalidate = 300

type Row={year:number;winner:string;note?:string;open?:boolean}
const hero='https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/hales-corners-speedway/unknown-year/hales-corners-speedway_unknown-year_bill-prietzel_dave-olson_photo_001.jpg'

const rows:Row[]=[
 {year:1976,winner:'Aaron Solsrud',note:'Wally Jors Benefit — open-competition precursor'},
 {year:1977,winner:'Mike Melius'},
 {year:1978,winner:'Al Schill'},
 {year:1979,winner:'Whitey Harris'},
 {year:1980,winner:'Mike Melius'},
 {year:1981,winner:'Bill Prietzel',note:'Track-record qualifying run and feature win'},
 {year:1982,winner:'Brian Leslie'},
 {year:1983,winner:'Brian Leslie'},
 {year:1984,winner:'Whitey Harris'},
 {year:1985,winner:'Mike Melius'},
 {year:1986,winner:'Bill Prietzel',note:'Clean sweep; first Hales late model lap under 16 seconds'},
 {year:1987,winner:'Whitey Harris'},
 {year:1988,winner:'M.J. McBride'},
 {year:1989,winner:'Ted Dolhun'},
 {year:1990,winner:'Russ Scheffler',note:'Rain-postponed to Sept. 22'},
 {year:1991,winner:'Mike Melius',note:'Miller High Life Open 50'},
 {year:1992,winner:'Russ Scheffler',note:'16th annual Miller High Life Open; 50-lap late model feature'},
 {year:1993,winner:'Russ Scheffler / Whitey Harris',note:'Twin 30-lap late model features'},
]

const resultRaces: SpecialEventRaceConfig[] = [
 {year:1976,raceId:29795,label:'Wally Jors Benefit — 44-lap Late Model feature',venue:'Hales Corners Speedway'},
 {year:1977,raceId:79060,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1978,raceId:64005,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1979,raceId:54546,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1980,raceId:1240,label:'Hales Open 50-lap Late Model feature',venue:'Hales Corners Speedway'},
 {year:1981,raceId:9389,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1982,raceId:4264,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1983,raceId:79105,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1984,raceId:56029,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1985,raceId:29092,label:'Hales Open Late Model feature',venue:'Hales Corners Speedway'},
 {year:1986,raceId:54557,label:'Coors Light Hales Open 50',venue:'Hales Corners Speedway'},
 {year:1987,raceId:49255,label:'Coors Light Hales Open 50',venue:'Hales Corners Speedway'},
 {year:1988,raceId:28677,label:'Coors Light Hales Open 50',venue:'Hales Corners Speedway'},
 {year:1989,raceId:4263,label:'Hales Open 50',venue:'Hales Corners Speedway'},
 {year:1990,raceId:58877,label:'Coors Light Hales Open 50',venue:'Hales Corners Speedway'},
 {year:1991,raceId:129256,label:'Miller High Life Open 50',venue:'Hales Corners Speedway'},
 {year:1992,raceId:130364,label:'16th Annual Miller High Life Open 50',venue:'Hales Corners Speedway'},
 {year:1993,raceId:27016,label:'Twin 30-lap feature — Russ Scheffler',venue:'Hales Corners Speedway'},
 {year:1993,raceId:66024,label:'Twin 30-lap feature — Whitey Harris',venue:'Hales Corners Speedway'},
]

const core=rows.filter(r=>r.year>=1977&&r.year<=1991)
const counts=core.reduce((m,r)=>m.set(r.winner,(m.get(r.winner)||0)+1),new Map<string,number>())
const repeats=[...counts.entries()].filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))

export default async function HalesOpenPage(){
 const resultArchive = await getSpecialEventResults(resultRaces)
 return <main className={styles.page}>
  <section className={styles.hero}><img src={hero} alt="Hales Corners Speedway late model" className={styles.heroImage}/><div className={styles.heroShade}/><div className={styles.heroInner}>
   <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Hales Open</span></div>
   <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div><h1 className={styles.title}>Hales Open</h1>
   <p className={styles.tagline}>When the Points Ended, the Rulebook Opened Up</p>
   <p className={styles.intro}>After the regular Hales Corners Speedway point season ended, the fall Open invited local stars and outside challengers to try something different on the third-mile clay oval. Liberal rules, wedge bodies, wings and experimental bodywork became part of the event's identity.</p>
   <div className={styles.heroActions}><a href="#chronology" className={styles.button}>View the Lineage</a><Link href="/tracks/hales-corners-speedway-wi" className={styles.buttonGhost}>Hales Corners Speedway</Link></div>
   <div className={styles.stats}><Stat label="Lineage Traced" value="1976–1993"/><Stat label="Core Hales Open Era" value="1977–1991"/><Stat label="Surface" value="Clay"/><Stat label="Archive Source" value="MRN OCR"/></div>
  </div></section>
  <div className={styles.content}>
   <section className={styles.section}><div className={styles.twoCol}>
    <div className={styles.sourceCard}><div className={styles.sourceLabel}>The Post-Season Idea</div><strong>The points were over, but the racing was not.</strong><p>MRN repeatedly described the Hales Open as the open-competition program that followed the championship season. Outside drivers were invited, the purse was boosted, and the usual rulebook was loosened. In some years the late model rules remained fairly controlled while the sportsman cars were allowed especially radical bodywork.</p></div>
    <div className={styles.sourceCard}><div className={styles.sourceLabel}>The 1976 Precursor</div><strong>The Wally Jors Benefit established the open-competition fall formula.</strong><p>The Sept. 18, 1976 season finale drew nearly 4,000 fans and used open rules for a 44-lap late model feature honoring Wally Jors. Aaron Solsrud won. The Hales Open name is documented the following season, and the annual numbering used in later MRN advertising grows from this period.</p></div>
   </div></section>
   <section className={styles.section}><div className={styles.kicker}>What Made It Different</div><div className={styles.sectionHead}><h2>Open Competition at Hales</h2><div className={styles.sectionNote}>A fall laboratory for dirt-track racers and builders.</div></div><div className={styles.eraGrid}>
    <div className={styles.eraCard}><div className={styles.eraYear}>Outside Invaders</div><div className={styles.eraValue}>Regional field</div><div className={styles.eraNote}>Drivers from other Wisconsin and northern Illinois tracks regularly challenged the Hales regulars.</div></div>
    <div className={styles.eraCard}><div className={styles.eraYear}>Liberal Bodies</div><div className={styles.eraValue}>Wedges & wings</div><div className={styles.eraNote}>Open rules encouraged unusual aerodynamic bodywork, especially in the sportsman class.</div></div>
    <div className={styles.eraCard}><div className={styles.eraYear}>Big Purse</div><div className={styles.eraValue}>Fall payoff</div><div className={styles.eraNote}>MRN repeatedly promoted the Open as one of the richest Hales programs of the season.</div></div>
    <div className={styles.eraCard}><div className={styles.eraYear}>1986</div><div className={styles.eraValue}>15.908 sec.</div><div className={styles.eraNote}>Bill Prietzel became the first late model driver under 16 seconds at Hales, then won the 50-lap feature.</div></div>
   </div></section>
   <section className={styles.section}><div className={styles.kicker}>Core-Era Multiple Winners</div><div className={styles.sectionHead}><h2>1977–1991 Hales Open Late Model Winners</h2><div className={styles.sectionNote}>The 1993 twin-feature winners are shown separately below and are not folded into these core-era totals.</div></div><div className={styles.eraGrid}>
    {repeats.map(([name,wins])=><div key={name} className={styles.eraCard}><div className={styles.eraYear}>{wins} wins</div><div className={styles.eraValue}>{name}</div><div className={styles.eraNote}>{core.filter(r=>r.winner===name).map(r=>r.year).join(' • ')}</div></div>)}
   </div></section>
   <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Museum Research Note</div><strong>The late-model Hales Open changed shape near the end of the lineage.</strong><p>The traditional late model Open continued in 1992, when Russ Scheffler won the 16th annual Miller High Life Open 50. MRN also advertised a separate IMCA-style Modified race using the Hales Open name later that September. In 1993 the late models used twin 30-lap features won by Russ Scheffler and Whitey Harris.</p></div></section>
   <section className={styles.section} id="chronology"><div className={styles.kicker}>Year-by-Year Lineage</div><div className={styles.sectionHead}><h2>1976–1993</h2><div className={styles.sectionNote}>Open-competition precursor, core late model years, and the later-format editions.</div></div>
    <article className={styles.eventCard}><div className={styles.panelBody}>
     <div style={{display:'grid',gridTemplateColumns:'72px minmax(160px,.8fr) minmax(230px,1.2fr)',gap:8,padding:'7px 8px',borderBottom:'1px solid #4a5054',color:'#92989b',fontSize:9,textTransform:'uppercase',letterSpacing:'.1em',fontWeight:900}}><span>Year</span><span>Winner</span><span>Note</span></div>
     {rows.map(row=><div key={row.year} style={{display:'grid',gridTemplateColumns:'72px minmax(160px,.8fr) minmax(230px,1.2fr)',gap:8,padding:'10px 8px',borderBottom:'1px solid #22282c',fontSize:12,color:'#c9ccce'}}><strong style={{color:'#d0ad63'}}>{row.year}</strong><strong style={{color:row.open?'#d0ad63':'#fff'}}>{row.winner}</strong><span>{row.note||'Hales Open late model feature'}</span></div>)}
    </div></article>
   </section>
   <SpecialEventResults
    races={resultArchive}
    note="The 1976–1993 lineage is complete. MRN summaries provide top-ten depth for many editions; unrecovered positions remain intentionally blank rather than reconstructed."
   />
   <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/hales-corners-speedway-wi" className={styles.footerLink}>Hales Corners Speedway<span>Open track archive →</span></Link><Link href="/research" className={styles.footerLink}>Research Center<span>Continue OCR research →</span></Link></div>
  </div>
 </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
