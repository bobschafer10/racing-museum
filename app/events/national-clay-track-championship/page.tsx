import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300
const SERIES_ID = 188

type Edition = { year:number; winner:string; laps:string; note?:string }
type ResultRow = { id:number; finishing_position:number|null; driver_name:string; driver_slug:string|null }
type EventRow = { id:number; race_date:string|null; winner_name:string|null; SeriesEventResults:ResultRow[] }

const editions:Edition[]=[
 {year:1995,winner:'John Provenzano',laps:'100 laps'},{year:1994,winner:'Kevin Roderick',laps:'200 laps'},{year:1993,winner:'John Gill',laps:'160 laps',note:'Rain-shortened'},
 {year:1992,winner:'John Provenzano',laps:'200 laps'},{year:1991,winner:'Billy Moyer',laps:'200 laps'},{year:1990,winner:'John Provenzano',laps:'200 laps'},
 {year:1989,winner:'Pete Parker',laps:'200 laps'},{year:1988,winner:'John Provenzano',laps:'200 laps'},{year:1987,winner:'John Provenzano',laps:'200 laps'},
 {year:1986,winner:'Arnie Gardner',laps:'200 laps'},{year:1985,winner:'Larry Jackson',laps:'200 laps'},{year:1984,winner:'Bob Pierce',laps:'200 laps'},
 {year:1983,winner:"Jim O'Connor",laps:'200 laps'},{year:1982,winner:'Brian Leslie',laps:'200 laps'},{year:1981,winner:'Arnie Gardner',laps:'200 laps'},
 {year:1980,winner:'Ken Pohlman',laps:'200 laps'},{year:1979,winner:"Jim O'Connor",laps:'200 laps'},{year:1978,winner:'Tony Izzo',laps:'200 laps'},
 {year:1977,winner:'Tony Izzo',laps:'200 laps'},{year:1976,winner:"Jim O'Connor",laps:'200 laps'},{year:1975,winner:'Arnie Gardner',laps:'200 laps'},
 {year:1974,winner:'Tony Izzo',laps:'200 laps'},{year:1973,winner:'Earl J. Hubert',laps:'200 laps'},{year:1972,winner:"Jim O'Connor",laps:'200 laps'},
 {year:1971,winner:'Bob Kelly',laps:'200 laps'},{year:1970,winner:'Arnie Gardner',laps:'200 laps'},{year:1969,winner:'Bill Van Allen',laps:'200 laps'},
 {year:1968,winner:'Bill Van Allen',laps:'200 laps'},{year:1967,winner:'Dick Nelson',laps:'200 laps'},
 {year:1966,winner:'Skippy Michaels',laps:'250 laps',note:'First listed 1966 championship race'},
 {year:1966,winner:'Dick Nelson',laps:'200 laps',note:'Second listed 1966 championship race'},
 {year:1965,winner:'Don Waldvogel',laps:'200 laps'},{year:1964,winner:'Bill Van Allen',laps:'200 laps'},{year:1963,winner:'Rich Clement',laps:'200 laps'},
 {year:1962,winner:'Bill Van Allen',laps:'200 laps'},{year:1961,winner:'Gene Crowe',laps:'100 laps'},{year:1960,winner:'Roy Martinelli',laps:'100 laps'},
 {year:1959,winner:'Rich Clement',laps:'100 laps'},{year:1958,winner:'Bill Gibson',laps:'100 laps'},{year:1957,winner:'Ken Boyer',laps:'300 laps'},
 {year:1956,winner:'Skippy Michaels',laps:'300 laps'},{year:1955,winner:'Johnny Kapovich',laps:'300 laps'},{year:1954,winner:'Bill Van Allen',laps:'300 laps'},
 {year:1953,winner:'Fred Kasten',laps:'200 laps'},
]

const coverage:Record<number,string>={
 1969:'Winner preserved • MRN date verified',1970:'Winner preserved • MRN date verified',1971:'Winner preserved • MRN date verified',
 1972:'Partial field • 10 published positions',1973:'MRN Top 10',1974:'MRN Top 10',1975:'MRN Top 10',1976:'MRN Top 3',1977:'MRN Top 10',
 1978:'MRN full field • 33 cars',1979:'MRN full field • 33 cars',1980:'MRN full field • 34 cars',1981:'MRN full field • 27 cars',
 1982:'MRN full field • 28 cars',1983:'MRN full field • 30 cars',1984:'MRN Top 20',1985:'MRN full field • 28 cars',
 1986:'MRN full field • 30 cars',1987:'MRN Top 10',1988:'MRN Top 12',1989:'MRN full field • 29 cars',1990:'MRN Top 10',
 1991:'MRN Top 6',1992:'MRN Top 6',1993:'MRN Top 6',1994:'MRN Top 6',1995:'MRN Top 10',
}

const sourceIssue:Record<number,string>={
 1972:'Midwest Racing News — Sept. 28, 1972',1973:'Midwest Racing News — Oct. 4, 1973',1974:'Midwest Racing News — Oct. 3, 1974',
 1975:'Midwest Racing News — Oct. 2, 1975',1976:'Midwest Racing News — Oct. 7, 1976',1977:'Midwest Racing News — Sept. 29, 1977',
 1978:'Midwest Racing News — Sept. 28, 1978',1979:'Midwest Racing News — Sept. 27, 1979',1980:'Midwest Racing News — Oct. 2, 1980',
 1981:'Midwest Racing News — Oct. 1, 1981',1982:'Midwest Racing News — Sept. 30, 1982',1983:'Midwest Racing News — Oct. 20, 1983',
 1984:'Midwest Racing News — Oct. 18, 1984',1985:'Midwest Racing News — Oct. 17, 1985',1986:'Midwest Racing News — Oct. 16, 1986',
 1987:'Midwest Racing News — Oct. 15, 1987',1988:'Midwest Racing News — Sept. 29, 1988',1989:'Midwest Racing News — Oct. 12, 1989',
 1990:'Midwest Racing News — Oct. 11, 1990',1991:'Midwest Racing News — Oct. 10, 1991',1992:'Midwest Racing News — Oct. 8, 1992',
 1993:'Midwest Racing News — Oct. 7, 1993',1994:'Midwest Racing News — Oct. 6, 1994',1995:'Midwest Racing News — Sept. 7, 1995',
}

function formatDate(value:string|null){
 if(!value)return'Race date not yet tied to Museum results'
 const [y,m,d]=value.split('-')
 return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
}

export default async function NationalClayTrackChampionshipPage(){
 const [{data,error},{data:heroRows}]=await Promise.all([
  supabase.from('SeriesEvents')
   .select('id,race_date,winner_name,SeriesEventResults(id,finishing_position,driver_name,driver_slug)')
   .eq('series_id',SERIES_ID).order('race_date',{ascending:false}),
  supabase.from('track_hero_photo_variants_view').select('image_url').eq('slug','santa-fe-speedway-il').eq('photo_rank',1).limit(1),
 ])
 const events=(data||[]) as EventRow[]
 const eventByYear=new Map(events.map(event=>[Number(event.race_date?.slice(0,4)),event]))
 const resultCount=events.reduce((sum,event)=>sum+event.SeriesEventResults.length,0)
 const heroSrc=heroRows?.[0]?.image_url||''

 return <main className={styles.page}>
  <section className={styles.hero}>
   {heroSrc?<img src={heroSrc} alt="National Clay Track Championship at Santa Fe Speedway" className={styles.heroImage}/>:null}
   <div className={styles.heroShade}/><div className={styles.heroInner}>
    <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>National Clay Track Championship</span></div>
    <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
    <h1 className={styles.title}>National Clay Track Championship</h1>
    <p className={styles.tagline}>Santa Fe Speedway's Fall Championship Tradition</p>
    <p className={styles.intro}>Santa Fe's long-distance fall championship lineage reaches back to the 1950s. Midwest Racing News explicitly promoted the Sept. 28, 1969 race as the first annual Grand National Clay Track Championship; the Museum retains the earlier championship specials as predecessor editions in the later NCTC lineage.</p>
    <div className={styles.heroActions}><Link href="/tracks/santa-fe-speedway-il" className={styles.button}>Open Santa Fe Archive</Link><Link href="#history" className={styles.buttonGhost}>View Winners & Results</Link></div>
    <div className={styles.stats}><Stat label="Lineage" value="1953–1995"/><Stat label="Winning Records" value={String(editions.length)}/><Stat label="Dated NCTC Editions" value={String(events.length)}/><Stat label="Result Rows" value={resultCount.toLocaleString('en-US')}/></div>
   </div>
  </section>

  <div className={styles.content}>
   <section className={styles.section}>
    <div className={styles.sourceCard}><div className={styles.sourceLabel}>MRN Cross-Reference</div>
     <strong>The Santa Fe archive has now been tied back to Midwest Racing News year by year.</strong>
     <p>Complete fields were recovered for 1978–1983, 1985–1986 and 1989. MRN also preserves a Top 20 for 1984, Top 12 for 1988, Top 10s for 1973–1975, 1977, 1987, 1990 and 1995, plus shorter published fields in the remaining later years. The 1972 result was repaired from the MRN account, and the 1988 NCTC date was corrected to Sunday, Sept. 25; Sept. 24 was the Silver Crown 50 preliminary.</p>
    </div>
   </section>
   <section className={styles.section}>
    <div className={styles.sourceCard}><div className={styles.sourceLabel}>Historical Lineage Note</div>
     <strong>1969 is the first year MRN explicitly calls the race the Grand National Clay Track Championship.</strong>
     <p>The earlier 1953–1968 long-distance Santa Fe championship winners remain displayed because later Santa Fe historical sources treat those races as part of the same tradition. The 1966 source chronology contains two winning records, so both are retained rather than forcing them into one edition.</p>
    </div>
   </section>

   <section className={styles.section} id="history">
    <div className={styles.kicker}>Winner Chronology + Published Results</div>
    <div className={styles.sectionHead}><h2>1953–1995 National Clay Track Championship</h2><div className={styles.sectionNote}>Published finishing orders are shown exactly to the depth recovered; missing positions are not reconstructed.</div></div>
    {error?<div className={styles.empty}>Unable to load the live NCTC result archive.</div>:
    <div className={styles.eventStack}>{editions.map((edition,index)=>{
      const event=eventByYear.get(edition.year)
      const rows=event?[...event.SeriesEventResults].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999)):[]
      return <article key={edition.year+'-'+edition.winner+'-'+index} className={styles.eventCard}>
       <div className={styles.eventHeader}>
        <div><div className={styles.eventYear}>{edition.year}</div><div className={styles.eventDate}>{event?formatDate(event.race_date):'Pre-NCTC lineage record'}</div></div>
        <div className={styles.winnerBlock}><span className={styles.winnerLabel}>{edition.laps}{edition.note?' • '+edition.note:''}</span><strong className={styles.winnerName}>{edition.winner}</strong></div>
       </div>
       <div className={styles.panelBody}>
        {event?<div className={styles.winnerBar}><span>{coverage[edition.year]||'Published result'}</span><strong>{sourceIssue[edition.year]||'Museum chronology / MRN verification'}</strong></div>:null}
        {rows.length?<div className={styles.resultsScroller}>
          <div className={styles.compactHeader}><span>Pos.</span><span></span><span>Driver</span><span></span><span></span></div>
          {rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span></span><strong>{row.driver_slug?<Link href={'/drivers/'+row.driver_slug} style={{color:'inherit'}}>{row.driver_name}</Link>:row.driver_name}</strong><span></span><span></span></div>)}
         </div>:<div className={styles.winnerOnly}>Winner and race distance preserved; no deeper published finishing order has been tied to this edition yet.</div>}
        {event?.race_date?<p className={styles.note}><Link href={'/results/'+event.race_date} style={{color:'inherit'}}>Open the complete Museum race-date page →</Link></p>:null}
       </div>
      </article>
    })}</div>}
   </section>

   <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/santa-fe-speedway-il" className={styles.footerLink}>Santa Fe Speedway<span>Open track history →</span></Link><Link href="/stats/feature-winners" className={styles.footerLink}>Research Center<span>Explore feature winners →</span></Link></div>
  </div>
 </main>
}
function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
