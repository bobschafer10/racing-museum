'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import styles from './results.module.css'

export type RaceResult = {
  finishing_position: number | null
  car_number: string | null
  qualifying_time: number | null
  driver_name_source: string | null
  Drivers: { driver_name: string; slug: string } | { driver_name: string; slug: string }[] | null
}

export type EventRace = {
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

function sourceLabel(race: EventRace) {
  const parts = [race.source_publication || 'Museum archive']
  if (race.source_issue_date) parts.push(`issue ${race.source_issue_date}`)
  if (race.source_page) parts.push(`p. ${race.source_page.replace('.jpg', '')}`)
  return parts.join(' · ')
}

export default function RaceNightArchive({
  dateLabel,
  featureCount,
  eventRaces,
  children,
}: {
  dateLabel: string
  featureCount: number
  eventRaces: EventRace[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const hasArchive = eventRaces.length > 0

  const groups = eventRaces.reduce<Record<string, EventRace[]>>((acc, race) => {
    ;(acc[race.race_type] ||= []).push(race)
    return acc
  }, {})

  const sources = Array.from(new Set(eventRaces.map(sourceLabel)))

  return (
    <section className={styles.dateCard}>
      <div className={styles.dateHeader}>
        <div>
          <div className={styles.dateKicker}>Race date</div>
          <div className={styles.dateTitleRow}>
            <h3>{dateLabel}</h3>
            {hasArchive ? (
              <button
                type="button"
                className={styles.fullRaceNightButton}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
              >
                Full Race Night <span aria-hidden="true">{open ? '▲' : '▼'}</span>
              </button>
            ) : null}
          </div>
        </div>
        <span>{featureCount} feature{featureCount === 1 ? '' : 's'}</span>
      </div>

      {children}

      {hasArchive && open ? (
        <div className={styles.raceNightBody}>
          <div className={styles.raceNightHeading}>
            <div>
              <span>Full Race Night</span>
              <strong>Qualifying, heats and preliminary events</strong>
            </div>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </div>

          {Object.entries(groups).map(([type, group]) => (
            <div key={type} className={styles.raceTypeGroup}>
              <h3>{raceTypeLabel(type)}</h3>
              {group
                .slice()
                .sort((a, b) => Number(a.race_number || 0) - Number(b.race_number || 0))
                .map((race) => (
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
                              {result.qualifying_time != null ? <em>{Number(result.qualifying_time).toFixed(3)}</em> : null}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
            </div>
          ))}

          {sources.length ? (
            <div className={styles.raceNightSource}>Source: {sources.join(' • ')}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
