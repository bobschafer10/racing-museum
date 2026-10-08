import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../special-event.module.css'

export const revalidate = 300

type EventRow = {
  id: number
  race_date: string
  class_id: number
}

type ResultRow = {
  race_id: number
  driver_id: number | null
  finishing_position: number | null
}

type DriverRow = {
  driver_id: number | null
  driver_name: string
  slug: string | null
}

type ClassRow = {
  id: number
  name: string
}

function fmtDate(value: string) {
  const [y,m,d] = value.split('-')
  return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function Stat({label,value}:{label:string,value:string}) {
  return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>
}

const sources = [
  {label:'2013 Bemidji Pioneer report', url:'https://www.redlakenationnews.com/story/2013/10/01/sports/season-ends-at-bemidji-speedway-with-paul-bunyan-stampede/16110.html'},
  {label:'2019 — 40th Annual report', url:'https://tricocanary.com/sites/default/files/Canary_228.pdf'},
  {label:'2021 — 42nd Annual report', url:'https://tricocanary.com/sites/default/files/Canary_332.pdf'},
  {label:'2024 — 45th Annual report', url:'https://www.tricocanary.com/sites/default/files/Canary_486.pdf'},
  {label:'2025 WISSOTA / ATD report', url:'https://www.atdracingnews.com/content/9-23-page-18'},
  {label:'2026 WISSOTA TV Night 1', url:'https://wissota.tv/videos/52229'},
]

export default async function PaulBunyanStampedePage() {
  const { data: eventData, error: eventError } = await supabase
    .from('Events')
    .select('id,race_date,class_id')
    .eq('track_id',308)
    .in('race_date',['2026-10-03','2026-10-04'])
    .eq('is_published',true)
    .order('race_date',{ascending:true})
    .order('class_id',{ascending:true})

  const events=(eventData||[]) as EventRow[]
  const eventIds=events.map(e=>e.id)
  const classIds=[...new Set(events.map(e=>e.class_id))]

  const [{data:resultData},{data:classData},{data:heroRows}] = await Promise.all([
    eventIds.length ? supabase
      .from('Results')
      .select('race_id,driver_id,finishing_position')
      .in('race_id',eventIds)
      .order('finishing_position',{ascending:true}) : Promise.resolve({data:[]}),
    classIds.length ? supabase
      .from('Classes')
      .select('id,name')
      .in('id',classIds) : Promise.resolve({data:[]}),
    supabase
      .from('track_hero_photo_variants_view')
      .select('slug,image_url')
      .eq('slug','bemidji-speedway-mn')
      .eq('photo_rank',1),
  ])

  const results=(resultData||[]) as ResultRow[]
  const classes=(classData||[]) as ClassRow[]
  const driverIds=[...new Set(results.map(r=>r.driver_id).filter((v):v is number=>v!==null))]
  const {data:driverData}=driverIds.length ? await supabase
    .from('Drivers')
    .select('driver_id,driver_name,slug')
    .in('driver_id',driverIds) : {data:[]}
  const drivers=(driverData||[]) as DriverRow[]

  const classById=new Map(classes.map(c=>[c.id,c.name]))
  const driverById=new Map(drivers.filter(d=>d.driver_id!==null).map(d=>[d.driver_id as number,d]))
  const resultsByRace=new Map<number,ResultRow[]>()
  for (const row of results) {
    const list=resultsByRace.get(row.race_id)||[]
    list.push(row)
    resultsByRace.set(row.race_id,list)
  }

  const days=['2026-10-03','2026-10-04']
  const hero=(heroRows||[])[0]?.image_url||''
  const winnerCount=events.filter(e=>(resultsByRace.get(e.id)||[]).some(r=>r.finishing_position===1)).length

  return <main className={styles.page}>
    <section className={styles.hero}>
      {hero ? <img src={hero} alt="Paul Bunyan Stampede at Bemidji Speedway" className={styles.heroImage}/> : null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><span>Paul Bunyan Stampede</span></div>
        <div className={styles.eyebrow}>Upper Midwest Special Event Archive</div>
        <h1 className={styles.title}>Paul Bunyan Stampede</h1>
        <p className={styles.tagline}>Bemidji Speedway • Bemidji, Minnesota • Northwoods season-ending tradition</p>
        <p className={styles.intro}>For roughly half a century, the Paul Bunyan Stampede has been Bemidji Speedway's fall finale — a late-season gathering that pulls racers from Minnesota, Wisconsin, the Dakotas and Canada to northern Minnesota. The modern Stampede is a two-day, multi-division program, and the museum's 2026 archive preserves the complete A-Feature finishing orders from both October 3 and October 4 across eight divisions.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/bemidji-speedway-mn" className={styles.button}>Open Bemidji Speedway Archive</Link>
          <Link href="#history" className={styles.buttonGhost}>Stampede History</Link>
          <Link href="#archive" className={styles.buttonGhost}>2026 Results</Link>
          <Link href="#sources" className={styles.buttonGhost}>Research Sources</Link>
        </div>
        <div className={styles.stats}>
          <Stat label="2026 Running" value="48th*"/>
          <Stat label="2026 Feature Events" value={String(events.length)}/>
          <Stat label="2026 Result Rows" value={results.length.toLocaleString('en-US')}/>
          <Stat label="2026 Divisions" value={String(new Set(events.map(e=>e.class_id)).size)}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.section} id="history">
        <div className={styles.kicker}>The Tradition</div>
        <div className={styles.sectionHead}><h2>Bemidji's Fall Stampede</h2><div className={styles.sectionNote}>A season-ending special built around cool weather, big fields, campers, traveling racers and two days of feature racing.</div></div>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Northwoods Tradition</div>
            <strong>Contemporary race reports repeatedly describe the Stampede as one of the longest-running stock-car traditions in the Northland.</strong>
            <p>By 2013 the event was already being described as a 38-year tradition drawing racers and fans from across the Midwest. Later coverage shows the weekend growing into a large multi-class gathering and the final major event on Bemidji Speedway's annual calendar.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>More Than Race Day</div>
            <strong>The modern Stampede became a full weekend rather than simply a pair of race programs.</strong>
            <p>Recent editions have included a Friday pre-race party, bean-bag or cornhole tournaments, campers filling the grounds and Saturday-Sunday racing. Weather is part of the lore: cold, rain and shortened weekends appear repeatedly in the historical record.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Archive Milestones</div>
        <div className={styles.sectionHead}><h2>What the Record Shows</h2><div className={styles.sectionNote}>These are documented snapshots, not a claim that every intervening edition has already been fully reconstructed.</div></div>
        <div className={styles.eraGrid}>
          <div className={styles.eraCard}><div className={styles.eraYear}>2013</div><div className={styles.eraValue}>38-year tradition</div><div className={styles.eraNote}>Rain reduced the scheduled two-day weekend to Sunday only. Almost 90 cars competed in five classes.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2019</div><div className={styles.eraValue}>40th Annual</div><div className={styles.eraNote}>Eight classes converged on Bemidji. Saturday weather interrupted the program and the Modified feature was completed Sunday.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2021</div><div className={styles.eraValue}>162 cars</div><div className={styles.eraNote}>The 42nd Annual filled the pits to capacity, with eight classes including Northern Renegade winged and wingless sprint cars.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2022</div><div className={styles.eraValue}>43rd Running</div><div className={styles.eraNote}>More than 130 teams waited out Saturday rain before a Sunday program of 19 heats and eight features.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2024</div><div className={styles.eraValue}>45th Annual</div><div className={styles.eraNote}>More than 120 cars arrived from Canada, Minnesota, Wisconsin and both Dakotas for two full days of racing.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2025</div><div className={styles.eraValue}>46th Annual</div><div className={styles.eraNote}>113 cars were on hand, but rain again cut the planned two-day finale in half after Saturday's program was completed.</div></div>
          <div className={styles.eraCard}><div className={styles.eraYear}>2026</div><div className={styles.eraValue}>48th Annual*</div><div className={styles.eraNote}>Eight divisions raced across October 3-4. The museum preserves 16 feature fields and 177 finishing positions.</div></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>A Traveling-Racer Finale</div>
            <strong>The Stampede has consistently reached beyond Bemidji's weekly field.</strong>
            <p>Reports document competitors coming from throughout Minnesota and the Dakotas, Wisconsin and Canada. With WISSOTA national points still in play during many editions, the event has often attracted regional championship contenders as well as Bemidji regulars.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Changing Division Mix</div>
            <strong>The classes have evolved with northern dirt-track racing.</strong>
            <p>Mini Stocks, Pure Stocks, Street Stocks, Mod Fours, Midwest Modifieds, Super Stocks and Modifieds have been recurring pieces of the program. Hornets and Northern Renegade sprint cars also appear in later editions. The 2026 program featured eight divisions on both nights.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.kicker}>Research Note</div>
        <div className={styles.sourceCard}>
          <strong>The annual numbering needs additional historical reconciliation.</strong>
          <p>Published sources do not line up perfectly: 2019 was promoted as the 40th Annual, 2021 as the 42nd, 2022 as the 43rd, 2024 as the 45th, 2025 as the 46th, while 2026 coverage calls the latest edition the 48th. The museum therefore preserves the published annual numbers but does not yet assign an exact inaugural year. Recovering early programs and newspaper coverage from the late 1970s and early 1980s is the next research target.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>2026 Archive</div>
            <strong>Both Paul Bunyan Stampede nights are preserved as full feature fields.</strong>
            <p>Each division is tied back to its normal Bemidji Speedway event record, so the results also appear in the track archive and in individual driver histories.</p>
          </div>
          <div className={styles.sourceCard}>
            <div className={styles.sourceLabel}>Coverage</div>
            <strong>{winnerCount} feature winners across {events.length} feature events.</strong>
            <p>Street Stocks, Mini Stocks, Pure Stocks, Midwest Modifieds, Hornets, Super Stocks, Mod Fours and Modifieds are represented on both nights.</p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="archive">
        <div className={styles.kicker}>2026 Paul Bunyan Stampede</div>
        <div className={styles.sectionHead}><h2>Two-Night Feature Archive</h2><div className={styles.sectionNote}>Complete A-Feature finishing orders from the October 3 and October 4 programs.</div></div>

        {eventError ? <div className={styles.empty}>Unable to load the Paul Bunyan Stampede archive.</div> :
        <div className={styles.eventStack}>
          {days.map((day,dayIndex)=>{
            const dayEvents=events.filter(e=>e.race_date===day)
            return <article key={day} className={styles.eventCard}>
              <div className={styles.eventHeader}>
                <div><div className={styles.eventYear}>Night {dayIndex+1}</div><div className={styles.eventDate}>{fmtDate(day)}</div></div>
                <div className={styles.winnerBlock}><span className={styles.winnerLabel}>Feature Events</span><strong className={styles.winnerName}>{dayEvents.length}</strong></div>
              </div>
              <div className={styles.panelBody}>
                {dayEvents.map(event=>{
                  const rows=[...(resultsByRace.get(event.id)||[])].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
                  const winner=rows.find(r=>r.finishing_position===1)
                  const winnerDriver=winner?.driver_id ? driverById.get(winner.driver_id) : null
                  return <div key={event.id} className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <h3 className={styles.panelTitle}>{classById.get(event.class_id)||'Feature'}</h3>
                      <div className={styles.panelMeta}>A Feature • {rows.length} starters • Winner: {winnerDriver?.driver_name||'—'}</div>
                    </div>
                    <div className={styles.panelBody}>
                      <div className={styles.compactHeader}><span>Finish</span><span>#</span><span>Driver</span><span></span><span></span></div>
                      {rows.map(row=>{
                        const driver=row.driver_id ? driverById.get(row.driver_id) : null
                        return <div key={`${event.id}-${row.finishing_position}-${row.driver_id}`} className={styles.compactRow}>
                          <strong>{row.finishing_position ?? '—'}</strong><span></span>
                          <strong>{driver?.slug ? <Link href={'/drivers/'+driver.slug} style={{color:'inherit'}}>{driver.driver_name}</Link> : (driver?.driver_name||'Unknown')}</strong><span></span><span></span>
                        </div>
                      })}
                    </div>
                  </div>
                })}
              </div>
            </article>
          })}
        </div>}
      </section>

      <section className={styles.section} id="sources">
        <div className={styles.kicker}>Research Sources</div>
        <div className={styles.sectionHead}><h2>Building the Stampede Archive</h2><div className={styles.sectionNote}>The page will grow backward as earlier programs, race reports and complete fields are recovered.</div></div>
        <div className={styles.eraGrid}>
          {sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer" className={styles.yearCard}><div className={styles.yearNumber}>↗</div><div className={styles.yearStatus}>{source.label}</div></a>)}
        </div>
      </section>

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/bemidji-speedway-mn" className={styles.footerLink}>Bemidji Speedway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue museum research →</span></Link>
      </div>
    </div>
  </main>
}
