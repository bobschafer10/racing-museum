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
        <p className={styles.tagline}>Bemidji Speedway • Bemidji, Minnesota • October 3–4, 2026</p>
        <p className={styles.intro}>The 2026 Paul Bunyan Stampede closed the Bemidji Speedway season with two nights of multi-division dirt-track racing. The museum archive preserves the complete A-Feature finishing orders from both October 3 and October 4 across eight divisions.</p>
        <div className={styles.heroActions}>
          <Link href="/tracks/bemidji-speedway-mn" className={styles.button}>Open Bemidji Speedway Archive</Link>
          <Link href="#archive" className={styles.buttonGhost}>2026 Results</Link>
        </div>
        <div className={styles.stats}>
          <Stat label="Race Nights" value="2"/>
          <Stat label="Feature Events" value={String(events.length)}/>
          <Stat label="Result Rows" value={results.length.toLocaleString('en-US')}/>
          <Stat label="Divisions" value={String(new Set(events.map(e=>e.class_id)).size)}/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
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

      <div className={styles.footerLinks}>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
        <Link href="/tracks/bemidji-speedway-mn" className={styles.footerLink}>Bemidji Speedway<span>Open track archive →</span></Link>
        <Link href="/research" className={styles.footerLink}>Research Center<span>Continue museum research →</span></Link>
      </div>
    </div>
  </main>
}
