import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 43200

type EventRow = { id:number; race_date:string; class_id:number }
type ResultRow = { race_id:number; driver_id:number|null; finishing_position:number|null }
type DriverRow = { driver_id:number|null; driver_name:string; slug:string|null }
type ClassRow = { id:number; name:string }
type YearNote = { annual:string; note:string; weather?:string }
type SourceRow = { label:string; url?:string }

const STAMPEDE_DATES = [
  '1983-10-09',
  '2011-10-02',
  '2017-09-30',
  '2018-09-22','2018-09-23',
  '2019-09-21','2019-09-22',
  '2020-09-26',
  '2021-09-25','2021-09-26',
  '2022-09-25',
  '2024-09-21','2024-09-22',
  '2025-09-20',
  '2026-10-03','2026-10-04',
]

const YEAR_NOTES: Record<number,YearNote> = {
  1983:{annual:'Paul Bunyan Stampede',note:'Midwest Racing News reported the Oct. 9 Stampede at Bemidji Raceway. Tim McMann won the 35-lap Late Model feature and LaVern Wilson won the Street Stock main. The museum now preserves both complete published feature orders.'},
  2011:{annual:'Annual Paul Bunyan Stampede',note:'A contemporary August preview identified Oct. 1-2 as Bemidji Speedway’s season-ending Stampede. The museum currently has only one surviving database result from that weekend — Shane Sabraski in the B-Modified/Midwest Modified record — so this edition remains a major backfill target.'},
  2017:{annual:'38th Annual',note:'Postponed one week by weather. The rescheduled weekend opened with Friday socializing and a cornhole tournament, followed by two national-points shows.',weather:'Weather postponement'},
  2018:{annual:'39th Annual',note:'113 racers came from four states. Campers, haulers and tents packed the pits for the traditional Friday party and two complete national-points programs.'},
  2019:{annual:'40th Annual',note:'Eight classes gathered for the 40th running. Rain interrupted Saturday and pushed the unfinished Modified feature into Sunday.',weather:'Saturday rain / Sunday make-up'},
  2020:{annual:'41st Annual',note:'139 racers and nine classes filled the grounds after Friday drizzle soaked the track and campers. The museum database currently carries Saturday depth; Sunday remains a backfill target.',weather:'Wet Friday; racing continued'},
  2021:{annual:'42nd Annual',note:'A record 162 cars filled the pits. Northern Renegade winged and wingless sprints joined the program, while national-points contenders chased late-season gains.'},
  2022:{annual:'43rd Running',note:'More than 130 teams waited through a Saturday washout. Sunday produced 19 heats and eight features, including Northern Renegade Wingless Sprints.',weather:'Friday activities and Saturday racing washed out'},
  2023:{annual:'Advertised as 45th Annual',note:'Drivers and campers began arriving Thursday and Friday, but rain made Saturday impossible and overnight rain washed out Sunday as well. No Stampede features were completed.',weather:'Complete rainout'},
  2024:{annual:'45th Annual',note:'The completed 45th running drew 120+ cars from Canada, Minnesota, Wisconsin and both Dakotas. Street Stocks returned to the Stampede after an absence of many years.'},
  2025:{annual:'46th Annual',note:'113 cars were on hand. Saturday was completed, but Sunday weather cut the planned two-day finale in half. The Hall of Fame class was also recognized during the weekend.',weather:'Sunday cancelled'},
  2026:{annual:'Reported as 48th Annual',note:'The modern Stampede moved into October. Eight divisions raced both days; the museum preserves all 16 A-Feature fields and 177 finishing positions.'},
}

const SOURCES: SourceRow[] = [
  {label:'1983 — Midwest Racing News, Oct. 20, p. 2 • Museum OCR'},
  {label:'1988 — WISSOTA Yearbook track directory • Museum OCR'},
  {label:'1993 — WISSOTA Yearbook season schedule • Museum OCR'},
  {label:'2011 — Bemidji Pioneer / Red Lake Nation News',url:'https://www.redlakenationnews.com/story/2011/08/16/sports/racing-season-winds-down/081620110957545917401.html'},
  {label:'2013 — Bemidji Pioneer / Red Lake Nation News',url:'https://www.redlakenationnews.com/story/2013/10/01/sports/season-ends-at-bemidji-speedway-with-paul-bunyan-stampede/16110.html'},
  {label:'2015 — 36th Annual / Red Lake Nation News archive',url:'https://www.redlakenationnews.com/issue/09_30_2015/26'},
  {label:'2016 — 37th Annual / Bemidji Pioneer',url:'https://www.bemidjipioneer.com/sports/37th-annual-paul-bunyan-stampede-cut-short-by-rain-photo-gallery'},
  {label:'2017 — 38th Annual / Tri County Canary',url:'https://tricocanary.com/sites/default/files/Canary_125.pdf'},
  {label:'2018 — 39th Annual / Tri County Canary',url:'https://tricocanary.com/sites/default/files/Canary_177.pdf'},
  {label:'2019 — 40th Annual / Tri County Canary',url:'https://tricocanary.com/sites/default/files/Canary_228.pdf'},
  {label:'2020 — 41st Annual / Tri County Canary',url:'https://tricocanary.com/sites/default/files/Canary_281.pdf'},
  {label:'2021 — 42nd Annual / Tri County Canary',url:'https://tricocanary.com/sites/default/files/Canary_332.pdf'},
  {label:'2022 — 43rd Running / Farmers Independent',url:'https://farmersindependent.com/wp-content/uploads/2022/09/2022-09-28-Farmers-Independent.pdf'},
  {label:'2023 — Rainout / Tri County Canary',url:'https://tricocanary.com/sites/default/files/Canary_434.pdf'},
  {label:'2024 — 45th Annual / Tri County Canary',url:'https://www.tricocanary.com/sites/default/files/Canary_486.pdf'},
  {label:'2025 — 46th Annual / ATD Racing News',url:'https://www.atdracingnews.com/content/9-23-page-18'},
  {label:'2026 — WISSOTA TV Night 1',url:'https://wissota.tv/videos/52229'},
]

const RECOVERED_2013 = [
  ['Mini Stock','Jenny Watrud'],['Pure Stock','Margo Butcher'],['WISSOTA Mod Four','Derek Vesledahl'],['WISSOTA Super Stock','Andy Davey'],['WISSOTA Midwest Modified','Bret Schmidt'],
]
const RECOVERED_2016_SAT = [
  ['Pure Stock','Mike Blevins'],['Mini Stock','Mike Hart'],['WISSOTA Mod Four','Dean Larson'],['WISSOTA Super Stock','Tim Johnson'],['WISSOTA Midwest Modified','Skeeter Estey'],['Outlaw Mini Mod','Mike Lawson'],['WISSOTA Modified','Rick Jacobson'],
]
const RECOVERED_2016_SUN = [
  ['Pure Stock','Mike Blevins'],['WISSOTA Super Stock','Curt Meyers'],['WISSOTA Modified','Tim Jackson'],
]

function fmtDate(value:string){
  const [y,m,d]=value.split('-')
  return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
}
function Stat({label,value}:{label:string,value:string}){
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}
function RecoveredWinners({rows}:{rows:string[][]}){
  return <div className={styles.panelBody}>
    <div className={styles.compactHeader}><span></span><span></span><span>Division</span><span></span><span>Winner</span></div>
    {rows.map(([division,winner])=><div key={division+'-'+winner} className={styles.compactRow}><span></span><span></span><strong>{division}</strong><span></span><strong>{winner}</strong></div>)}
  </div>
}

export default async function PaulBunyanStampedePage(){
  const {data:eventData,error:eventError}=await supabase.from('Events').select('id,race_date,class_id').eq('track_id',308).in('race_date',STAMPEDE_DATES).eq('is_published',true).order('race_date',{ascending:true}).order('class_id',{ascending:true})
  const events=(eventData||[]) as EventRow[]
  const eventIds=events.map(e=>e.id)
  const classIds=[...new Set(events.map(e=>e.class_id))]

  const [{data:resultData},{data:classData},{data:heroRows}]=await Promise.all([
    eventIds.length?supabase.from('Results').select('race_id,driver_id,finishing_position').in('race_id',eventIds).order('finishing_position',{ascending:true}):Promise.resolve({data:[]}),
    classIds.length?supabase.from('Classes').select('id,name').in('id',classIds):Promise.resolve({data:[]}),
    supabase.from('track_hero_photo_variants_view').select('slug,image_url').eq('slug','bemidji-speedway-mn').eq('photo_rank',1),
  ])

  const results=(resultData||[]) as ResultRow[]
  const classes=(classData||[]) as ClassRow[]
  const driverIds=[...new Set(results.map(r=>r.driver_id).filter((v):v is number=>v!==null))]
  const {data:driverData}=driverIds.length?await supabase.from('Drivers').select('driver_id,driver_name,slug').in('driver_id',driverIds):{data:[]}
  const drivers=(driverData||[]) as DriverRow[]
  const classById=new Map(classes.map(c=>[c.id,c.name]))
  const driverById=new Map(drivers.filter(d=>d.driver_id!==null).map(d=>[d.driver_id as number,d]))
  const resultsByRace=new Map<number,ResultRow[]>()
  for(const row of results){const list=resultsByRace.get(row.race_id)||[];list.push(row);resultsByRace.set(row.race_id,list)}

  const years=[...new Set(events.map(e=>Number(e.race_date.slice(0,4))))].sort((a,b)=>b-a)
  if(!years.includes(2023)){const i=years.findIndex(y=>y<2023);years.splice(i<0?years.length:i,0,2023)}
  const hero=(heroRows||[])[0]?.image_url||''
  const preservedWinnerNames=new Set<string>()
  for(const e of events){const w=(resultsByRace.get(e.id)||[]).find(r=>r.finishing_position===1);const d=w?.driver_id?driverById.get(w.driver_id):null;if(d?.driver_name)preservedWinnerNames.add(d.driver_name)}

  return <main className={styles.page}>
    <section className={styles.hero}>
      {hero?<img src={hero} alt="Paul Bunyan Stampede at Bemidji Speedway" className={styles.heroImage}/>:null}
      <div className={styles.heroShade}/><div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Paul Bunyan Stampede</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div><h1 className={styles.title}>Paul Bunyan Stampede</h1>
        <p className={styles.tagline}>Bemidji Speedway • Bemidji, Minnesota • Fall season-ending classic</p>
        <p className={styles.intro}>The Paul Bunyan Stampede is Bemidji Speedway's traditional fall finale: a Northwoods weekend of campers, traveling racers, late-season points pressure, cold weather, rain stories and multi-division dirt-track racing. Museum research now reaches back to a complete published 1983 race report and a named 1988 WISSOTA calendar entry, while the annual-number sequence still points toward a probable 1980 beginning.</p>
        <div className={styles.heroActions}><Link href="/tracks/bemidji-speedway-mn" className={styles.button}>Open Bemidji Speedway Archive</Link><Link href="#origins" className={styles.buttonGhost}>Origins</Link><Link href="#archive" className={styles.buttonGhost}>Year-by-Year Archive</Link><Link href="#sources" className={styles.buttonGhost}>Research Sources</Link></div>
        <div className={styles.stats}><Stat label="Probable First Running" value="1980*"/><Stat label="DB Feature Records" value={events.length.toLocaleString('en-US')}/><Stat label="Preserved Result Rows" value={results.length.toLocaleString('en-US')}/><Stat label="Known Winners in DB" value={preservedWinnerNames.size.toLocaleString('en-US')}/></div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section} id="origins">
        <div className={styles.kicker}>Origins & Numbering</div><div className={styles.sectionHead}><h2>The 1980 Case</h2><div className={styles.sectionNote}>Strongly indicated by the annual sequence; archival proof now confirms the event was established by 1983.</div></div>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}><div className={styles.sourceLabel}>The Clean Numbering Run</div><strong>2015 through 2022 forms an unusually clean historical sequence.</strong><p>The event was reported as the 36th Annual in 2015, 37th in 2016, 38th in 2017, 39th in 2018, 40th in 2019, 41st in 2020, 42nd in 2021 and 43rd in 2022. Counted backward without a break, that sequence lands on 1980 for the first Stampede.</p></div>
          <div className={styles.sourceCard}><div className={styles.sourceLabel}>Why the Asterisk Remains</div><strong>Later published annual numbers are internally inconsistent.</strong><p>The completely rained-out 2023 weekend was advertised as the 45th Annual; the completed 2024 event was also called the 45th; 2025 was the 46th; and 2026 coverage calls the latest running the 48th. The museum keeps each published label visible instead of silently rewriting the record.</p></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Archival Breakthroughs</div><div className={styles.sectionHead}><h2>The Early Stampede Comes Into Focus</h2><div className={styles.sectionNote}>Museum OCR and WISSOTA yearbooks now give firm anchors inside the previously thin 1980s-90s era.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1983</div><div className={styles.eraValue}>Full MRN race report</div><div className={styles.eraNote}>Midwest Racing News reported the Oct. 9 Paul Bunyan Stampede by name. Tim McMann won a 35-lap Late Model feature and LaVern Wilson won Street Stocks. Both published feature fields are now in the Museum database.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1988</div><div className={styles.eraValue}>Named WISSOTA calendar proof</div><div className={styles.eraNote}>The 1988 WISSOTA Yearbook lists the “Paul Bunyan Stock Car Stampede” at Bemidji Raceway for Sept. 24-25, alongside the track's other major specials.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>1993</div><div className={styles.eraValue}>Schedule continuity clue</div><div className={styles.eraNote}>The 1993 WISSOTA season schedule lists a Bemidji two-day special Sept. 25-26 for Modifieds and Super Stocks. It aligns with the Stampede window, but the yearbook page does not name it, so the museum treats it as a research lead rather than proven identification.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>What Makes It the Stampede</div><div className={styles.sectionHead}><h2>More Than Two Race Programs</h2><div className={styles.sectionNote}>The event changed classes across the decades, but its season-ending Northwoods identity remained recognizable.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>1983</div><div className={styles.eraValue}>Late Models + Streets</div><div className={styles.eraNote}>The recovered early program was much simpler than today's eight-class weekend: a 35-lap Late Model headliner plus Street Stocks.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>Friday</div><div className={styles.eraValue}>The pre-race gathering</div><div className={styles.eraNote}>Cornhole or bean-bag tournaments, music, socializing and campers arriving before the first green flag became part of the modern weekend.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>Fall</div><div className={styles.eraValue}>Cold-weather identity</div><div className={styles.eraNote}>Race reports repeatedly mention cool air, rain, wet campers and late-September or October conditions. Weather is part of the event's personality.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>WISSOTA</div><div className={styles.eraValue}>National-points pressure</div><div className={styles.eraNote}>For many years the weekend came while national points were still available, pulling regional contenders to Bemidji for one or two late-season scoring opportunities.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>Regional</div><div className={styles.eraValue}>Traveling fields</div><div className={styles.eraNote}>Minnesota, Wisconsin, North Dakota, South Dakota and Canada recur in the reports, making the finale larger than a weekly Bemidji program.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>Finale</div><div className={styles.eraValue}>The last big weekend</div><div className={styles.eraNote}>The Stampede traditionally closes Bemidji Speedway's season, giving the weekend the feel of a homecoming and last chance to race before winter.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Recovered Newspaper Results</div><div className={styles.sectionHead}><h2>2013 & 2016 Fields</h2><div className={styles.sectionNote}>These newspaper fields extend the winner lineage between the early archive and the deeper modern database.</div></div>
        <div className={styles.eventStack}>
          <article className={styles.eventCard}><div className={styles.eventHeader}><div><div className={styles.eventYear}>2013</div><div className={styles.eventDate}>Sunday, Sept. 29 • Saturday washed out</div></div><div className={styles.winnerBlock}><span className={styles.winnerLabel}>Field</span><strong className={styles.winnerName}>Nearly 90 cars • 5 classes</strong></div></div><RecoveredWinners rows={RECOVERED_2013}/><div className={styles.panelBody}><p className={styles.note}>The contemporary report preserves complete feature finishing orders for all five divisions. Midwest Modifieds were the largest class, with four heats and a consolation setting a 24-car feature.</p></div></article>
          <article className={styles.eventCard}><div className={styles.eventHeader}><div><div className={styles.eventYear}>2016 • 37th Annual</div><div className={styles.eventDate}>Sept. 24-25 • 126 cars Saturday / 109 Sunday</div></div><div className={styles.winnerBlock}><span className={styles.winnerLabel}>Weather</span><strong className={styles.winnerName}>Sunday cut short by rain</strong></div></div><div className={styles.panel}><div className={styles.panelHeader}><h3 className={styles.panelTitle}>Saturday Winners</h3><div className={styles.panelMeta}>Seven completed feature divisions</div></div><RecoveredWinners rows={RECOVERED_2016_SAT}/></div><div className={styles.panel}><div className={styles.panelHeader}><h3 className={styles.panelTitle}>Sunday Winners Before the Rain</h3><div className={styles.panelMeta}>Four other Sunday features were rained out</div></div><RecoveredWinners rows={RECOVERED_2016_SUN}/></div></article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Weather Ledger</div><div className={styles.sectionHead}><h2>Rain Is Part of the Story</h2><div className={styles.sectionNote}>The event has repeatedly survived, compressed or surrendered to northern Minnesota fall weather.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>2013</div><div className={styles.eraValue}>Saturday washed out</div><div className={styles.eraNote}>The scheduled two-day Stampede became a one-day Sunday show.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2016</div><div className={styles.eraValue}>Sunday shortened</div><div className={styles.eraNote}>Three Sunday features were completed before steady rain stopped the program; four features were listed as rained out.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2017</div><div className={styles.eraValue}>Postponed a week</div><div className={styles.eraNote}>The 38th Annual moved to the Sept. 29-Oct. 1 weekend.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2019</div><div className={styles.eraValue}>Saturday spillover</div><div className={styles.eraNote}>The unfinished Saturday Modified feature became part of Sunday's program.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2022</div><div className={styles.eraValue}>One-day rescue</div><div className={styles.eraNote}>Friday activities and Saturday racing were lost; Sunday still delivered 19 heats and eight features.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2023</div><div className={styles.eraValue}>Complete washout</div><div className={styles.eraNote}>Rain began as early arrivals came in. Neither Saturday nor Sunday produced a race.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2025</div><div className={styles.eraValue}>Sunday cancelled</div><div className={styles.eraNote}>Saturday's full show survived, but the second day was lost.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Names in the History</div><div className={styles.twoCol}>
          <div className={styles.sourceCard}><div className={styles.sourceLabel}>Tim McMann • 1983</div><strong>The earliest complete Stampede feature winner currently in the database.</strong><p>Midwest Racing News described McMann taking an early lead and pacing most of the 35-lap Late Model feature before beating Tom Waseleski Sr., Tal Lucken, Kevin Jopp and Bob Gherardi in the top five.</p></div>
          <div className={styles.sourceCard}><div className={styles.sourceLabel}>Bret Schmidt</div><strong>At least six Paul Bunyan Stampede feature wins.</strong><p>A 2023 career profile credited the longtime Bemidji racer with more than 120 feature victories overall, including six Stampede wins. He won the 2013 Midwest Modified feature recovered in the newspaper archive.</p></div>
        </div>
        <div className={styles.twoCol} style={{marginTop:'18px'}}>
          <div className={styles.sourceCard}><div className={styles.sourceLabel}>LaVern Wilson • 1983</div><strong>The recovered early Street Stock winner.</strong><p>Wilson, listed from Deer River, beat Bemidji racer Dave Beaulieu, Gary Miettinen, Cliff Skinaway, Larry Mills and Carl Peterson in the six-car published Street Stock feature order.</p></div>
          <div className={styles.sourceCard}><div className={styles.sourceLabel}>Shane Sabraski</div><strong>A defining modern-era Stampede performer.</strong><p>The museum database and contemporary reports show repeated Modified and Super Stock wins. In 2019 he scored three clean sweeps across the two classes; in 2021 he again swept both days in both Super Stocks and Modifieds.</p></div>
        </div>
      </section>

      <section className={styles.section} id="archive">
        <div className={styles.kicker}>Museum Database</div><div className={styles.sectionHead}><h2>Verified Stampede-Date Results • 1983-2026</h2><div className={styles.sectionNote}>Coverage is not continuous yet: 1983 is full published depth, 2011 has one surviving result, many 2017-25 imports are top-four depth, and 2026 is full-field. 2023 remains visible as a rainout.</div></div>
        {eventError?<div className={styles.empty}>Unable to load the live Paul Bunyan Stampede archive.</div>:<div className={styles.eventStack}>
          {years.map(year=>{
            const yearEvents=events.filter(e=>Number(e.race_date.slice(0,4))===year)
            const dates=[...new Set(yearEvents.map(e=>e.race_date))].sort()
            const note=YEAR_NOTES[year]
            return <article key={year} className={styles.eventCard}>
              <div className={styles.eventHeader}><div><div className={styles.eventYear}>{year} • {note?.annual||'Paul Bunyan Stampede'}</div><div className={styles.eventDate}>{note?.weather||`${yearEvents.length} preserved feature records`}</div></div><div className={styles.winnerBlock}><span className={styles.winnerLabel}>Museum Depth</span><strong className={styles.winnerName}>{year===2023?'No racing':`${yearEvents.length} features`}</strong></div></div>
              {note?<div className={styles.panelBody}><p className={styles.yearIntro}>{note.note}</p></div>:null}
              {year===2023?<div className={styles.panelBody}><div className={styles.empty}>The 2023 Stampede is intentionally preserved as a rainout. No feature results should be attached to this edition.</div></div>:null}
              {dates.map((date,dateIndex)=>{const dateEvents=yearEvents.filter(e=>e.race_date===date);return <div key={date} className={styles.panel}>
                <div className={styles.panelHeader}><h3 className={styles.panelTitle}>{dates.length>1?`Night ${dateIndex+1} • `:''}{fmtDate(date)}</h3><div className={styles.panelMeta}>{dateEvents.length} preserved feature divisions</div></div>
                <div className={styles.panelBody}><div className={styles.compactHeader}><span></span><span></span><span>Division</span><span>Depth</span><span>Winner</span></div>
                  {dateEvents.map(event=>{const rows=[...(resultsByRace.get(event.id)||[])].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999));const winner=rows.find(r=>r.finishing_position===1);const wd=winner?.driver_id?driverById.get(winner.driver_id):null;return <div key={event.id} className={styles.compactRow}><span></span><span></span><strong>{classById.get(event.class_id)||'Feature'}</strong><span>{rows.length} rows</span><strong>{wd?.slug?<Link href={'/drivers/'+wd.slug} style={{color:'inherit'}}>{wd.driver_name}</Link>:(wd?.driver_name||'—')}</strong></div>})}
                </div>
              </div>})}
            </article>
          })}
        </div>}
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>2026 Full Fields</div><div className={styles.sectionHead}><h2>October 3-4, 2026</h2><div className={styles.sectionNote}>Unlike many earlier imports, both 2026 nights are preserved to the full A-Feature finishing order.</div></div>
        <div className={styles.eventStack}>{['2026-10-03','2026-10-04'].map((day,dayIndex)=>{const dayEvents=events.filter(e=>e.race_date===day);return <article key={day} className={styles.eventCard}>
          <div className={styles.eventHeader}><div><div className={styles.eventYear}>Night {dayIndex+1}</div><div className={styles.eventDate}>{fmtDate(day)}</div></div><div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Events</span><strong className={styles.winnerName}>{dayEvents.length}</strong></div></div>
          <div className={styles.panelBody}>{dayEvents.map(event=>{const rows=[...(resultsByRace.get(event.id)||[])].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999));const winner=rows.find(r=>r.finishing_position===1);const wd=winner?.driver_id?driverById.get(winner.driver_id):null;return <div key={event.id} className={styles.panel}>
            <div className={styles.panelHeader}><h3 className={styles.panelTitle}>{classById.get(event.class_id)||'Feature'}</h3><div className={styles.panelMeta}>A Feature • {rows.length} starters • Winner: {wd?.driver_name||'—'}</div></div>
            <div className={styles.panelBody}><div className={styles.compactHeader}><span>Finish</span><span></span><span>Driver</span><span></span><span></span></div>{rows.map(row=>{const d=row.driver_id?driverById.get(row.driver_id):null;return <div key={`${event.id}-${row.finishing_position}-${row.driver_id}`} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span></span><strong>{d?.slug?<Link href={'/drivers/'+d.slug} style={{color:'inherit'}}>{d.driver_name}</Link>:(d?.driver_name||'Unknown')}</strong><span></span><span></span></div>})}</div>
          </div>})}</div>
        </article>})}</div>
      </section>

      <section className={styles.section} id="sources">
        <div className={styles.kicker}>Research Trail</div><div className={styles.sectionHead}><h2>Primary & Contemporary Sources</h2><div className={styles.sectionNote}>The reconstruction now combines Museum OCR, WISSOTA yearbooks and Dennis Peterson's long-running Bemidji Speedway reporting.</div></div>
        <div className={styles.statusGrid}>{SOURCES.map(source=>source.url?<a key={source.label} href={source.url} target="_blank" rel="noreferrer" className={styles.statusCard} style={{textDecoration:'none'}}><div className={styles.statusTitle}>Open Source</div><div className={styles.statusValue}>{source.label}</div></a>:<div key={source.label} className={styles.statusCard}><div className={styles.statusTitle}>Museum Archive Source</div><div className={styles.statusValue}>{source.label}</div></div>)}</div>
      </section>

      <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>Open Research Targets</div><strong>The biggest remaining hole is no longer “the entire early era” — it is the year-by-year bridge between the archival anchors.</strong><p>Priorities are now 1980-82 to prove the inaugural running, 1984-87 and 1989-2010 for winner chronologies, the complete 2011-12 fields, the 2014-15 races, missing portions of 2017 and 2020, sprint-car fields, and full-depth pre-2026 results where the museum currently holds only partial imports.</p></div></section>

      <div className={styles.footerLinks}><Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link><Link href="/tracks/bemidji-speedway-mn" className={styles.footerLink}>Bemidji Speedway<span>Open track archive →</span></Link><Link href="/research" className={styles.footerLink}>Research Center<span>Continue museum research →</span></Link></div>
    </div>
  </main>
}
