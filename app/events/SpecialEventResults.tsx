import Link from 'next/link'
import type { SpecialEventRaceArchive } from '@/lib/specialEventResults'
import styles from './special-event.module.css'

function formatDate(value: string | null) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${Number(month)}/${Number(day)}/${year}`
}

export function SpecialEventResults({
  races,
  note,
}: {
  races: SpecialEventRaceArchive[]
  note?: string
}) {
  const visible = races.filter((race) => race.results.length > 0)
  const totalRows = visible.reduce((sum, race) => sum + race.results.length, 0)

  if (!visible.length) return null

  return (
    <section className={styles.section} id="results">
      <div className={styles.kicker}>Database-Backed Race Results</div>
      <div className={styles.sectionHead}>
        <h2>Available Finishing Orders</h2>
        <div className={styles.sectionNote}>
          {totalRows.toLocaleString('en-US')} result rows across {visible.length} race records. {note || 'Archival recovery remains in progress.'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {visible.map((race) => {
          const lastPosition = race.results[race.results.length - 1]?.position || 0
          const contiguous = race.results[0]?.position === 1 && race.results.length === lastPosition
          const date = formatDate(race.raceDate)

          return (
            <details
              key={race.raceId}
              style={{
                border: '1px solid #343a3e',
                background: '#101417',
                overflow: 'hidden',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'grid',
                  gridTemplateColumns: '80px minmax(0,1fr) auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '13px 14px',
                }}
              >
                <strong style={{ color: '#d0ad63', fontSize: 15 }}>{race.year}</strong>
                <span>
                  <strong style={{ display: 'block', color: '#fff', fontSize: 13 }}>{race.label || 'Feature'}</strong>
                  <span style={{ color: '#92989b', fontSize: 11 }}>
                    {[date, race.venue].filter(Boolean).join(' • ')}
                  </span>
                </span>
                <span style={{ color: '#c9ccce', fontSize: 11, textAlign: 'right' }}>
                  {race.results.length} {contiguous ? 'positions' : 'rows recovered'} ▾
                </span>
              </summary>

              <div style={{ borderTop: '1px solid #343a3e' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px minmax(0,1fr)',
                    gap: 10,
                    padding: '7px 14px',
                    color: '#92989b',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                    fontWeight: 900,
                  }}
                >
                  <span>Pos.</span><span>Driver</span>
                </div>
                {race.results.map((row) => (
                  <div
                    key={`${race.raceId}-${row.position}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '64px minmax(0,1fr)',
                      gap: 10,
                      padding: '9px 14px',
                      borderTop: '1px solid #22282c',
                      fontSize: 12,
                    }}
                  >
                    <strong style={{ color: '#d0ad63' }}>{row.position}</strong>
                    {row.driverSlug
                      ? <Link href={`/drivers/${row.driverSlug}`} style={{ color: '#fff', fontWeight: 800 }}>{row.driverName}</Link>
                      : <strong style={{ color: '#fff' }}>{row.driverName}</strong>}
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}
