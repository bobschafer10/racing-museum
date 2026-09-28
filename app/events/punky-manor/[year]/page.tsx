import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../../special-event.module.css'

export const revalidate=300
const SERIES_IDS=[194,195,196,197,198,199,200,201,202,203,204,205,206]
const MIN_YEAR=1980,MAX_YEAR=2026
const divisionNames:Record<number,string>={
  194:'Late Model Division',195:'Modified Division',196:'Super Stock Division',197:'Midwest Modified Division',
  198:'Street Stock Division',199:'Pure Stock Division',200:'Hornet / Four Cylinder Division',
  201:'Limited Late Model Division',202:'Winged Sprint Car Division',203:'Non-Winged Sprint Car Division',
  204:'USRA Late Model Division',205:'Hobby Stock Division',206:'600 Mini Mod Division'
}
const cancelledYears:Record<number,{title:string;note:string}>={
  2020:{title:'COVID Cancellation',note:'The 2020 Punky Manor Challenge of Champions was not contested.'},
  2023:{title:'Event Cancelled',note:'The 2023 Punky Manor Challenge of Champions was cancelled.'},
  2025:{title:'Rained Out',note:'The 2025 Punky Manor Challenge of Champions was rained out.'}
}

type SeasonRow={id:number;series_id:number|null;year:number}
type ResultRow={id:number;finishing_position:number|null;starting_position:string|null;car_number:string|null;driver_name:string;status:string|null;result_section:string|null}
type RaceRow={id:number;series_id:number|null;season_id:number|null;race_date:string|null;track_name:string|null;track_slug:string|null;winner_name:string|null;source_url:string|null;SeriesEventResults:ResultRow[]}

function formatDate(value:string|null){if(!value)return'Date not listed';const [y,m,d]=value.split('-');return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}

export default async function PunkyManorYearPage({params}:{params:Promise<{year:string}>}){
  const {year}=await params
  const seasonYear=Number(year)
  if(!Number.isInteger(seasonYear)||seasonYear<MIN_YEAR||seasonYear>MAX_YEAR)notFound()

  const {data:seasonsRaw}=await supabase.from('SeriesSeasons').select('id,series_id,year').in('series_id',SERIES_IDS).eq('year',seasonYear)
  const seasons=(seasonsRaw??[]) as SeasonRow[]
  const seasonIds=seasons.map(s=>s.id)
  const {data:racesRaw,error}=seasonIds.length
    ? await supabase.from('SeriesEvents').select(`id,series_id,season_id,race_date,track_name,track_slug,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,status,result_section)`).in('season_id',seasonIds).order('series_id',{ascending:true})
    : {data:[],error:null}
  const races=(racesRaw??[]) as RaceRow[]
  const grouped=new Map<number,RaceRow[]>()
  for(const race of races){if(!race.series_id)continue;if(!grouped.has(race.series_id))grouped.set(race.series_id,[]);grouped.get(race.series_id)!.push(race)}
  const cancelled=cancelledYears[seasonYear]
  const previousYear=seasonYear>MIN_YEAR?seasonYear-1:null
  const nextYear=seasonYear<MAX_YEAR?seasonYear+1:null
  const resultRows=races.reduce((sum,r)=>sum+(r.SeriesEventResults?.length??0),0)

  return <main className={styles.page}>
    <section className={styles.hero}>
      <img src="https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/eau-claire-speedway/unknown-year/eau-claire-speedway_unknown-year_punky-manor_connie-bahr_post_44.jpg" alt={`${seasonYear} Punky Manor Challenge of Champions`} className={styles.heroImage}/>
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><Link href="/events/punky-manor">Punky Manor</Link><span>›</span><span>{seasonYear}</span></div>
        <div className={styles.eyebrow}>Punky Manor Edition Archive</div>
        <h1 className={styles.title}>{seasonYear} Punky Manor</h1>
        <p className={styles.tagline}>{cancelled?cancelled.title:races.length?`${grouped.size} Championship Division${grouped.size===1?'':'s'}`:'Archive Record Pending'}</p>
        <div className={styles.stats}>
          <Stat label="Edition" value={String(seasonYear)}/>
          <Stat label="Divisions" value={cancelled?'—':String(grouped.size)}/>
          <Stat label="Result Rows" value={cancelled?'—':String(resultRows)}/>
          <Stat label="Venue" value="Red Cedar"/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <div className={styles.yearNav}>
        <div>{previousYear?<Link className={styles.yearNavLink} href={`/events/punky-manor/${previousYear}`}>← {previousYear}</Link>:null}</div>
        <Link className={styles.yearNavCenter} href="/events/punky-manor">All Years</Link>
        <div className={styles.yearNavLinkRight}>{nextYear?<Link className={styles.yearNavLink} href={`/events/punky-manor/${nextYear}`}>{nextYear} →</Link>:null}</div>
      </div>

      {cancelled?
        <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>{seasonYear} Edition</div><strong>{cancelled.title}</strong><p>{cancelled.note} No winner or finishing order is reconstructed.</p></div></section>
        :error?
        <div className={styles.empty}>Unable to load this Punky Manor year from the Museum database.</div>
        :races.length?
        SERIES_IDS.filter(id=>grouped.has(id)).map(id=><DivisionSection key={id} title={divisionNames[id]} races={grouped.get(id)??[]}/>)
        :<div className={styles.empty}>No Punky Manor championship result is currently documented for this year.</div>}

      <div className={styles.footerLinks}>
        <Link href="/events/punky-manor" className={styles.footerLink}>Punky Manor<span>Return to event archive →</span></Link>
        <Link href="/tracks/red-cedar-speedway-wi" className={styles.footerLink}>Red Cedar Speedway<span>Open track archive →</span></Link>
        <Link href="/events" className={styles.footerLink}>Special Events<span>Browse all events →</span></Link>
      </div>
    </div>
  </main>
}

function DivisionSection({title,races}:{title:string;races:RaceRow[]}){
  return <section className={styles.section}>
    <div className={styles.kicker}>Championship Division</div>
    <div className={styles.sectionHead}><h2>{title}</h2></div>
    {races.map((race,raceIndex)=>{
      const rows=[...(race.SeriesEventResults??[])].sort((a,b)=>(a.finishing_position??9999)-(b.finishing_position??9999))
      const raceLabel=races.length>1?`Feature ${raceIndex+1}`:'Championship Feature'
      return <article key={race.id} className={styles.panel}>
        <div className={styles.panelHeader}><h3 className={styles.panelTitle}>{raceLabel} · {formatDate(race.race_date)}</h3><div className={styles.panelMeta}>{race.track_name||'Red Cedar Speedway'}</div></div>
        <div className={styles.panelBody}>
          <div className={styles.winnerBar}><span>Winner</span><strong>{race.winner_name??rows.find(r=>r.finishing_position===1)?.driver_name??'Not listed'}</strong></div>
          {rows.length?
            <div className={styles.resultsScroller}>
              <div className={styles.compactHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>
              {rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span>{row.car_number??'—'}</span><strong>{row.driver_name}</strong><span>{row.starting_position??'—'}</span><span>{row.status??'—'}</span></div>)}
            </div>
            :<div className={styles.winnerOnly}>Winner-only record preserved for this division.</div>}
          <p className={styles.note}>Only positions preserved by the historical source are shown. Missing finishing positions are not reconstructed.</p>
          {race.source_url?<p className={styles.note}>Source record: {race.source_url}</p>:null}
        </div>
      </article>
    })}
  </section>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
