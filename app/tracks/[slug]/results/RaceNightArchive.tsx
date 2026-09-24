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

export type NewspaperClipping = {
  id: number
  event_id: number
  publication_code: string
  publication_name: string
  issue_date: string
  page_label: string
  storage_path: string
  headline: string | null
  crop_x: number
  crop_y: number
  crop_w: number
  crop_h: number
  display_order: number
}

export type EventRace = {
  id: number
  event_id: number
  class_id: number | null
  class_name: string | null
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
  newspaperClippings,
  children,
}: {
  dateLabel: string
  featureCount: number
  eventRaces: EventRace[]
  newspaperClippings: NewspaperClipping[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [clippingOpen, setClippingOpen] = useState(false)
  const [activeClipping, setActiveClipping] = useState<NewspaperClipping | null>(null)
  const hasArchive = eventRaces.length > 0
  const uniqueClippings = Array.from(new Map(newspaperClippings.map((item) => [`${item.publication_code}-${item.issue_date}-${item.page_label}`, item])).values())
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const fullPageUrl = activeClipping ? `${baseUrl}/storage/v1/object/public/media/${activeClipping.storage_path}` : ''

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
            {uniqueClippings.length ? (
              <button
                type="button"
                className={styles.newspaperButton}
                onClick={() => { setActiveClipping(uniqueClippings[0]); setClippingOpen(true) }}
              >
                Newspaper Coverage <span>{uniqueClippings.length}</span>
              </button>
            ) : null}
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

      {uniqueClippings.length ? (
        <div className={styles.newspaperStrip}>
          <span>Original coverage</span>
          {uniqueClippings.map((clipping) => (
            <button key={clipping.id} type="button" onClick={() => { setActiveClipping(clipping); setClippingOpen(true) }}>
              {clipping.publication_code === 'midwest-racing-news' ? 'MRN' : 'CFRN'} · {new Date(clipping.issue_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </button>
          ))}
        </div>
      ) : null}

      {clippingOpen && activeClipping ? (
        <div className={styles.clippingOverlay} role="dialog" aria-modal="true" aria-label="Newspaper coverage">
          <div className={styles.clippingModal}>
            <div className={styles.clippingHeader}>
              <div><span>{activeClipping.publication_name} · {activeClipping.issue_date} · p. {activeClipping.page_label.replace('.jpg','')}</span><strong>{activeClipping.headline || 'Race coverage'}</strong></div>
              <button type="button" onClick={() => setClippingOpen(false)}>Close</button>
            </div>
            <a className={styles.clippingLink} href={fullPageUrl} target="_blank" rel="noreferrer" title="Open the complete newspaper page">
              <div className={styles.clippingViewport} style={{ aspectRatio: `${activeClipping.crop_w} / ${activeClipping.crop_h}` }}>
                <img
                  src={fullPageUrl}
                  alt={activeClipping.headline || 'Original newspaper clipping'}
                  style={{
                    width: `${100 / activeClipping.crop_w}%`,
                    maxWidth: 'none',
                    transform: `translate(-${activeClipping.crop_x * 100}%, -${activeClipping.crop_y * 100}%)`,
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            </a>
            <div className={styles.clippingActions}>
              <span>Click the clipping to open the complete original newspaper page.</span>
              <a href={fullPageUrl} target="_blank" rel="noreferrer">Open Full Page ↗</a>
            </div>
          </div>
        </div>
      ) : null}

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
                .sort((a, b) => {
                  const classCompare = String(a.class_name || '').localeCompare(String(b.class_name || ''))
                  if (classCompare !== 0) return classCompare
                  return Number(a.race_number || 0) - Number(b.race_number || 0)
                })
                .map((race) => (
                  <div key={race.id} className={styles.prelimRace}>
                    <div className={styles.prelimTitle}>
                      {race.class_name ? `${race.class_name} — ` : ''}{race.race_name || raceTypeLabel(race.race_type)}
                    </div>
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
