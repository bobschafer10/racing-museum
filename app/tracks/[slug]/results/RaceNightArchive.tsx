import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './results.module.css'

type RaceResult = {
  finishing_position: number | null
  car_number: string | null
  qualifying_time: number | null
  driver_name_source: string | null
  Drivers: { driver_name: string; slug: string } | null
}

type EventRace = {
  id: number
  event_id: number
  race_type: string
  race_number: number | null
  race_name: string | null
  source_publication: string | null
  source_issue_date: string | null
  source_page: string | null
  race_results: RaceResult[]
}

function raceTypeLabel(type: string) {
  return ({
    qualifying: 'Qualifying',
    heat: 'Heat Races',
    bonus_heat: 'Bonus Races',
    trophy_dash: 'Trophy Dash',
    semi_feature: 'Semi-Features',
    consolation: 'Consolations',
    feature: 'Features',
    demolition: 'Demolition',
    match_race: 'Match Race',
    other: 'Other',
  } as Record<string, string>)[type] || type.replaceAll('_', ' ')
}

export default async function RaceNightArchive({
  eventIds,
  raceDates,
}: {
  eventIds: number[]
  raceDates: Record<number, string>
}) {
  if (!eventIds.length) return null

  const { data } = await supabase
    .from('event_races')
    .select('id,event_id,race_type,race_number,race_name,source_publication,source_issue_date,source_page,race_results(finishing_position,car_number,qualifying_time,driver_name_source,Drivers(driver_name,slug))')
    .in('event_id', eventIds)
    .order('race_number', { ascending: true })

  const races = (data || []) as unknown as EventRace[]
  if (!races.length) return null

  const byEvent = races.reduce<Record<number, EventRace[]>>((acc, race) => {
    ;(acc[race.event_id] ||= []).push(race)
    return acc
  }, {})

  const events = Object.entries(byEvent).sort(([a], [b]) =>
    (raceDates[Number(a)] || '').localeCompare(raceDates[Number(b)] || '')
  )

  return (
    <section className={styles.raceNightArchive}>
      <div className={styles.raceNightIntro}>
        <div>
          <div className={styles.kicker}>New museum archive</div>
          <h2>Full Race Night</h2>
        </div>
        <p>
          Where surviving newspaper records allow, the museum now preserves qualifying,
          heat races, semi-features and other preliminary events in addition to the feature.
        </p>
      </div>

      <div className={styles.raceNightList}>
        {events.map(([eventId, eventRaces]) => {
          const date = raceDates[Number(eventId)]
          const groups = eventRaces.reduce<Record<string, EventRace[]>>((acc, race) => {
            ;(acc[race.race_type] ||= []).push(race)
            return acc
          }, {})
          return (
            <details key={eventId} className={styles.raceNightCard}>
              <summary>
                <div>
                  <span>Race Night</span>
                  <strong>{date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date unknown'}</strong>
                </div>
                <b>{eventRaces.length} recorded preliminary event{eventRaces.length === 1 ? '' : 's'}</b>
              </summary>

              <div className={styles.raceNightBody}>
                {Object.entries(groups).map(([type, group]) => (
                  <div key={type} className={styles.raceTypeGroup}>
                    <h3>{raceTypeLabel(type)}</h3>
                    {group.map((race) => (
                      <div key={race.id} className={styles.prelimRace}>
                        <div className={styles.prelimTitle}>{race.race_name || raceTypeLabel(race.race_type)}</div>
                        <div className={styles.prelimRows}>
                          {[...(race.race_results || [])]
                            .sort((a, b) => Number(a.finishing_position || 999) - Number(b.finishing_position || 999))
                            .map((result, index) => {
                              const driver = Array.isArray(result.Drivers) ? result.Drivers[0] : result.Drivers
                              const name = driver?.driver_name || result.driver_name_source || 'Unknown driver'
                              return (
                                <div key={index} className={styles.prelimResult}>
                                  <span className={styles.prelimPos}>{result.finishing_position ?? '—'}</span>
                                  <span className={styles.prelimCar}>{result.car_number ? '#' + result.car_number : ''}</span>
                                  {driver?.slug ? <Link href={'/drivers/' + driver.slug}>{name}</Link> : <span>{name}</span>}
                                  {result.qualifying_time != null ? <em>{Number(result.qualifying_time).toFixed(2)}</em> : null}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div className={styles.raceNightSource}>
                  Source: {eventRaces[0]?.source_publication || 'Museum archive'}
                  {eventRaces[0]?.source_issue_date ? ' · issue ' + eventRaces[0].source_issue_date : ''}
                  {eventRaces[0]?.source_page ? ' · p. ' + eventRaces[0].source_page.replace('.jpg', '') : ''}
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}
