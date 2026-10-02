import Link from 'next/link'
import {
  addDaysIso,
  centralTodayIso,
  getThisWeekHistory,
} from '@/lib/thisWeekHistory'
import styles from '../home.module.css'

export const revalidate = 300

function safeReferenceDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : centralTodayIso()
}

function dayHeading(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export default async function ThisWeekInHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const referenceDate = safeReferenceDate(params.date)
  const history = await getThisWeekHistory(referenceDate, 42)

  const grouped = new Map<string, typeof history.items>()
  for (const item of history.items) {
    const bucket = grouped.get(item.current_week_date) || []
    bucket.push(item)
    grouped.set(item.current_week_date, bucket)
  }

  const previousWeek = addDaysIso(history.start, -7)
  const nextWeek = addDaysIso(history.start, 7)
  const today = centralTodayIso()

  return (
    <main className={styles.historyPage}>
      <section className={styles.historyPageHero}>
        <div className={styles.historyPageHeroInner}>
          <div className={styles.historyPageEyebrow}>From the Museum Archive</div>
          <h1>This Week in Upper Midwest Auto Racing History</h1>
          <p>{history.weekLabel}</p>
          <div className={styles.historyPageNav}>
            <Link href={`/this-week-in-history?date=${previousWeek}`}>← Previous Week</Link>
            <Link href={`/this-week-in-history?date=${today}`}>This Week</Link>
            <Link href={`/this-week-in-history?date=${nextWeek}`}>Next Week →</Link>
          </div>
        </div>
      </section>

      <div className={styles.historyPageShell}>
        <div className={styles.historyPageIntro}>
          <p>
            A rotating selection of feature winners recorded in the museum archive whose race dates
            fall during this calendar week. The mix is intentionally spread across tracks, years,
            divisions, and decades so a different slice of Upper Midwest racing history comes forward.
          </p>
          <Link href="/">Return to the Museum Home Page →</Link>
        </div>

        {history.items.length ? (
          <div className={styles.historyDayStack}>
            {[...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => (
              <section key={day} className={styles.historyDaySection}>
                <div className={styles.historyDayHeading}>
                  <span>{dayHeading(day)}</span>
                  <small>{items.length} archive selections</small>
                </div>
                <div className={styles.historyPageGrid}>
                  {items.map((item) => (
                    <article
                      key={`${item.race_date}-${item.track_name}-${item.class_name}-${item.driver_name}`}
                      className={styles.historyPageCard}
                    >
                      <div className={styles.historyPageCardDate}>{item.event_year}</div>
                      <h2>{item.driver_name}</h2>
                      <p>{item.story}</p>
                      <div className={styles.historyPageCardMeta}>
                        {item.class_name || 'Race'} • {item.track_name}
                      </div>
                      <div className={styles.historyPageCardLinks}>
                        <Link href={item.href}>View Result →</Link>
                        {item.driver_slug ? <Link href={`/drivers/${item.driver_slug}`}>Driver →</Link> : null}
                        {item.track_slug ? <Link href={`/tracks/${item.track_slug}`}>Track →</Link> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.historyEmpty}>
            No matching archive entries were found for this week yet.
          </div>
        )}
      </div>
    </main>
  )
}
