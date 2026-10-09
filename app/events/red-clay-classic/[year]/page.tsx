import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from '../../special-event.module.css'

export const revalidate=43200
const SERIES_IDS=[207,208,209,210,211,212]
const MIN_YEAR=1976,MAX_YEAR=2026
const divisionNames:Record<number,string>={
  207:'Late Model Division',208:'Modified Division',209:'Super Stock Division',
  210:'Late Model Sportsman Division',211:'Street Stock Division',212:'Midwest Modified Division'
}
const cancelledYears:Record<number,{title:string;note:string}>={
  1977:{title:'Rained Out',note:'Rain prevented the 1977 Red Clay Classic from being run.'},
  1997:{title:'Rained Out',note:'Rain prevented the Red Clay Classic feature races from being completed in 1997.'},
  2009:{title:'Rained Out',note:'Rain prevented the 2009 Red Clay Classic from being run.'},
  2020:{title:'Event Cancelled',note:'The 2020 Red Clay Classic was cancelled because of COVID-19 restrictions and the weather forecast.'}
}
const editionNotes:Record<number,string>={
  2026:'Originally scheduled for October 3, the championship program was postponed by rain and completed on October 4, 2026.'
}

type SeasonRow={id:number;series_id:number|null;year:number}
type ResultRow={id:number;finishing_position:number|null;starting_position:string|null;car_number:string|null;driver_name:string;status:string|null;result_section:string|null}
type RaceRow={id:number;series_id:number|null;season_id:number|null;race_date:string|null;track_name:string|null;track_slug:string|null;winner_name:string|null;source_url:string|null;SeriesEventResults:ResultRow[]}

function formatDate(value:string|null){if(!value)return'Date not listed';const [y,m,d]=value.split('-');return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}

export default async function RedClayClassicYearPage({params}:{params:Promise<{year:string}>}){
  const {year}=await params
  const seasonYear=Number(year)
  if(!Number.isInteger(seasonYear)||seasonYear<MIN_YEAR||seasonYear>MAX_YEAR)notFound()

  const [{data:seasonsRaw},{data:heroRows}]=await Promise.all([
    supabase.from('SeriesSeasons').select('id,series_id,year').in('series_id',SERIES_IDS).eq('year',seasonYear),
    supabase.from('track_hero_photo_variants_view').select('image_url,photo_rank').eq('slug','abc-raceway-wi').order('photo_rank',{ascending:true}).limit(1)
  ])
  const seasons=(seasonsRaw??[]) as SeasonRow[]
  const seasonIds=seasons.map(s=>s.id)
  const {data:racesRaw,error}=seasonIds.length
    ? await supabase.from('SeriesEvents').select(`id,series_id,season_id,race_date,track_name,track_slug,winner_name,source_url,SeriesEventResults(id,finishing_position,starting_position,car_number,driver_name,status,result_section)`).in('season_id',seasonIds).order('series_id',{ascending:true})
    : {data:[],error:null}
  const races=(racesRaw??[]) as RaceRow[]
  const grouped=new Map<number,RaceRow[]>()
  for(const race of races){if(!race.series_id)continue;if(!grouped.has(race.series_id))grouped.set(race.series_id,[]);grouped.get(race.series_id)!.push(race)}
  const cancelled=cancelledYears[seasonYear]
  const upcoming=seasonYear===2026&&races.length===0
  const completed2026=seasonYear===2026&&races.length>0
  const previousYear=seasonYear>MIN_YEAR?seasonYear-1:null
  const nextYear=seasonYear<MAX_YEAR?seasonYear+1:null
  const resultRows=races.reduce((sum,r)=>sum+(r.SeriesEventResults?.length??0),0)
  const heroSrc=(heroRows?.[0] as any)?.image_url||''

  return <main className={styles.page}>
    <section className={styles.hero}>
      {heroSrc?<img src={heroSrc} alt={`${seasonYear} Red Clay Classic`} className={styles.heroImage}/>:null}
      <div className={styles.heroShade}/>
      <div className={styles.heroInner}>
        <div className={styles.breadcrumbs}><Link href="/">Home</Link><span>›</span><Link href="/events">Special Events</Link><span>›</span><Link href="/events/red-clay-classic">Red Clay Classic</Link><span>›</span><span>{seasonYear}</span></div>
        <div className={styles.eyebrow}>Red Clay Classic Edition Archive</div>
        <h1 className={styles.title}>{seasonYear} Red Clay Classic</h1>
        <p className={styles.tagline}>{upcoming?'51st Annual · October 3':completed2026?'51st Annual · Completed October 4':cancelled?cancelled.title:races.length?`${grouped.size} Championship Division${grouped.size===1?'':'s'}`:'Archive Record Pending'}</p>
        <div className={styles.stats}>
          <Stat label="Edition" value={String(seasonYear)}/>
          <Stat label="Divisions" value={upcoming||cancelled?'—':String(grouped.size)}/>
          <Stat label="Result Rows" value={upcoming||cancelled?'—':String(resultRows)}/>
          <Stat label="Venue" value="ABC Raceway"/>
        </div>
      </div>
    </section>

    <div className={styles.content}>
      <div className={styles.yearNav}>
        <div>{previousYear?<Link className={styles.yearNavLink} href={`/events/red-clay-classic/${previousYear}`}>← {previousYear}</Link>:null}</div>
        <Link className={styles.yearNavCenter} href="/events/red-clay-classic">All Years</Link>
        <div className={styles.yearNavLinkRight}>{nextYear?<Link className={styles.yearNavLink} href={`/events/red-clay-classic/${nextYear}`}>{nextYear} →</Link>:null}</div>
      </div>

      {upcoming?
        <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>51st Annual Red Clay Classic</div><strong>October 3, 2026 · ABC Raceway</strong><p>The scheduled championship program includes WISSOTA Late Models, Modifieds, Super Stocks and Midwest Modifieds. Results will be added after the event is completed.</p></div></section>
        :cancelled?
        <section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>{seasonYear} Edition</div><strong>{cancelled.title}</strong><p>{cancelled.note} No finishing order is reconstructed.</p></div></section>
        :error?
        <div className={styles.empty}>Unable to load this Red Clay Classic year from the Museum database.</div>
        :races.length?
        <>
          {editionNotes[seasonYear]?<section className={styles.section}><div className={styles.sourceCard}><div className={styles.sourceLabel}>{seasonYear} Edition Note</div><strong>Completed October 4, 2026 · ABC Raceway</strong><p>{editionNotes[seasonYear]}</p></div></section>:null}
          {SERIES_IDS.filter(id=>grouped.has(id)).map(id=><DivisionSection key={id} title={divisionNames[id]} races={grouped.get(id)??[]}/>)}
        </>
        :<div className={styles.empty}>No Red Clay Classic championship result is currently documented for this year.</div>}

      <div className={styles.footerLinks}>
        <Link href="/events/red-clay-classic" className={styles.footerLink}>Red Clay Classic<span>Return to event archive →</span></Link>
        <Link href="/tracks/abc-raceway-wi" className={styles.footerLink}>ABC Raceway<span>Open track archive →</span></Link>
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
        <div className={styles.panelHeader}><h3 className={styles.panelTitle}>{raceLabel} · {formatDate(race.race_date)}</h3><div className={styles.panelMeta}>{race.track_name||'ABC Raceway'}</div></div>
        <div className={styles.panelBody}>
          <div className={styles.winnerBar}><span>Winner</span><strong>{race.winner_name??rows.find(r=>r.finishing_position===1)?.driver_name??'Not listed'}</strong></div>
          {rows.length?
            <div className={styles.resultsScroller}>
              <div className={styles.compactHeader}><span>Pos.</span><span>Car</span><span>Driver</span><span>Start</span><span>Status</span></div>
              {rows.map(row=><div key={row.id} className={styles.compactRow}><strong>{row.finishing_position??'—'}</strong><span>{row.car_number??'—'}</span><strong>{row.driver_name}</strong><span>{row.starting_position??'—'}</span><span>{row.status??'—'}</span></div>)}
            </div>
            :<div className={styles.winnerOnly}>{race.winner_name==='Rainout'?'Feature not completed — rainout.':'Winner-only record preserved for this division.'}</div>}
          <p className={styles.note}>Only positions preserved by the historical source are shown. Missing finishing positions are not reconstructed.</p>
        </div>
      </article>
    })}
  </section>
}

function Stat({label,value}:{label:string;value:string}){return <div className={styles.stat}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div></div>}
