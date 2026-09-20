import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './latest.module.css'

export const revalidate = 300

type ActivityRow = {
  activity_key?: string | null
  activity_type?: string | null
  activity_at?: string | null
  activity_day?: string | null
  title?: string | null
  detail?: string | null
  href?: string | null
  badge?: string | null
}

function formatActivityDate(value?: string | null) {
  if (!value) return 'Latest'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return 'Latest'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export default async function LatestArchivePage() {
  const { data } = await supabase
    .from('archive_recent_activity_mv')
    .select('activity_key,activity_type,activity_at,activity_day,title,detail,href,badge')
    .order('activity_at', { ascending: false, nullsFirst: false })
    .limit(100)

  const items = (data || []) as ActivityRow[]

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>Museum Archive Activity</div>
        <h1>Recently Added to the Archive</h1>
        <p>
          The latest additions across race results, point standings, series, drivers, tracks, and photographs.
          Bulk research imports are grouped so major archive expansions stay readable.
        </p>
        <Link href="/" className={styles.back}>← Museum Home</Link>
      </section>

      <section className={styles.list} aria-label="Recent museum archive additions">
        {items.length ? items.map((item, index) => (
          <Link
            href={item.href || '/'}
            key={item.activity_key || `activity-${index}`}
            className={styles.row}
          >
            <time className={styles.date}>{formatActivityDate(item.activity_day)}</time>
            <span className={styles.copy}>
              <strong>{item.title || 'Archive update'}</strong>
              {item.detail ? <span>{item.detail}</span> : null}
            </span>
            <span className={styles.badge}>{item.badge || 'NEW'}</span>
          </Link>
        )) : (
          <div className={styles.empty}>New racing history is being added throughout the museum.</div>
        )}
      </section>
    </main>
  )
}
