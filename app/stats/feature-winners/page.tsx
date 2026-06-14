import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

function isRecentWinner(value: string | null) {
  if (!value) return false

  const lastWin = new Date(value)
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 24)

  return lastWin >= cutoff
}

type SearchParams = {
  scope?: string
  year?: string
  q?: string
  minWins?: string
  rows?: string
  track?: string
  surface?: string
  class?: string
}

type WinnerRow = {
  driver_id: number
  driver_name: string
  driver_slug: string
  driver_hometown: string | null
  driver_state: string | null
  feature_wins: number
  years_with_wins: number
  tracks_won_at: number
  classes_won_in: number
  first_win_date: string | null
  last_win_date: string | null
}

type StatsSummary = {
  total_results: number | null
  total_drivers: number | null
  total_tracks: number | null
  first_year: number | null
  last_year: number | null
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  const d = new Date(year, month - 1, day)

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '—'
  return value.toLocaleString('en-US')
}

export default async function FeatureWinnersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const scope = params.scope || 'wisconsin'
  const year = params.year || 'all'
  const q = params.q || ''
  const minWins = Number(params.minWins || 1)
  const rows = params.rows || '100'
  const track = params.track || 'all'
  const surface = params.surface || 'all'
  const classFilter = params.class || 'all'
  const rowLimit = rows === 'all' ? 5000 : Number(rows)

  const { data: summaryData } = await supabase
    .from('stats_lab_summary_view')
    .select('*')
    .single()

  const summary = summaryData as StatsSummary | null

  const { data: yearsData, error: yearsError } = await supabase
    .from('stats_feature_winners_year_options_view')
    .select('year')
    .order('year', { ascending: false })
    .limit(200)

  const years = Array.isArray(yearsData)
    ? yearsData.map((r) => r.year).filter(Boolean)
    : []

  const { data: trackData, error: trackError } = await supabase
    .from('stats_feature_winners_track_options_view')
    .select('track_id, track_name, track_state')
    .order('track_name', { ascending: true })
    .limit(1000)

  const trackRows = ((trackData || []) as any[]).filter((row) => {
    if (scope === 'wisconsin') return row.track_state === 'WI'
if (scope === 'non_wisconsin') return row.track_state !== 'WI'
return true
  })

  const trackOptions = Array.isArray(trackRows)
    ? trackRows
        .filter((r) => r.track_id && r.track_name)
        .map((r) => ({
          id: String(r.track_id),
          name: r.track_name,
        }))
    : []

  const { data: classData, error: classError } = await supabase
    .from('stats_feature_winners_class_options_view')
    .select('class_id, class_name')
    .order('class_name', { ascending: true })
    .limit(1000)

  const classOptions = Array.isArray(classData)
    ? classData
        .filter((r) => r.class_id && r.class_name)
        .map((r) => ({
          id: String(r.class_id),
          name: r.class_name,
        }))
    : []

  const { data: winnerData, error } = await supabase.rpc('stats_feature_winners_report', {
    p_scope: scope,
    p_year: year === 'all' ? null : Number(year),
    p_track_id: track === 'all' ? null : Number(track),
    p_surface: surface === 'all' ? null : surface,
    p_class_id: classFilter === 'all' ? null : Number(classFilter),
    p_q: q.trim() || null,
    p_min_wins: minWins,
    p_limit: rowLimit,
  })

  const winners = (winnerData || []) as WinnerRow[]

const { data: lastUpdateData } = await supabase
  .from('stats_feature_winners_rollup')
  .select('last_win_date')
  .order('last_win_date', { ascending: false })
  .limit(1)
  .maybeSingle()

const lastResultsUpdate = lastUpdateData?.last_win_date
  ? formatDate(lastUpdateData.last_win_date)
  : 'Update date unavailable'

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.checkerWatermark} />

        <div style={styles.heroLeft}>
          <div>
            <div style={styles.kicker}>Stats Lab</div>
            <h1 style={styles.title}>Feature Win Archive</h1>
            <p style={styles.subtitle}>
              Explore feature victories across more than a century of Wisconsin and Upper
              Midwest auto racing history. Filter by year, region, class, surface, track,
              and driver to uncover the sport&apos;s most successful competitors.
            </p>
<div style={styles.heroNote}>
  <strong>Built for discovery.</strong> Compare all-time leaders, isolate a single
  season, study one track, or narrow the archive by surface and class. Each result links
  back into the driver record for deeper museum research.
</div>
<div style={styles.archiveUpdateRow}>
  <span>
    Results archive last updated through:{' '}
    <strong>{lastResultsUpdate}</strong>
  </span>

  <span style={styles.activeLegend}>
    <span style={styles.activeLegendBadge}>Active</span>
    Driver has recorded results within the past 24 months
  </span>
</div>

          </div>

          <div style={styles.heroRibbon}>
            <div style={styles.ribbonItem}>
              <div style={styles.ribbonIcon}>◎</div>
              <div>
                <strong style={styles.ribbonTitle}>Default View</strong>
                <span style={styles.ribbonText}>Wisconsin Tracks · All Years</span>
              </div>
            </div>

            <div style={styles.ribbonItem}>
              <div style={styles.ribbonIcon}>▦</div>
              <div>
                <strong style={styles.ribbonTitle}>Database Powered</strong>
                <span style={styles.ribbonText}>Fast Supabase report views</span>
              </div>
            </div>

            <div style={styles.ribbonItem}>
              <div style={styles.ribbonIcon}>▼</div>
              <div>
                <strong style={styles.ribbonTitle}>Filters</strong>
                <span style={styles.ribbonText}>Track · Surface · Class · Year</span>
              </div>
            </div>
          </div>
        </div>

        <aside style={styles.statBox}>
          <div style={styles.statBoxTitle}>Museum by Numbers</div>
          <p style={styles.statBoxText}>
            Every number below is a doorway into the museum&apos;s results archive.
          </p>

          <div style={styles.statDivider} />

          <div style={styles.statGrid}>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>{formatNumber(summary?.total_results)}</div>
              <div style={styles.statLabel}>Results</div>
            </div>

            <div style={styles.statItem}>
              <div style={styles.statNumber}>{formatNumber(summary?.total_drivers)}</div>
              <div style={styles.statLabel}>Drivers</div>
            </div>

            <div style={styles.statItem}>
              <div style={styles.statNumber}>{formatNumber(summary?.total_tracks)}</div>
              <div style={styles.statLabel}>Tracks</div>
            </div>

            <div style={styles.statItem}>
              <div style={styles.statNumber}>
                {summary?.first_year && summary?.last_year
                  ? `${summary.first_year}–${summary.last_year}`
                  : '—'}
              </div>
              <div style={styles.statLabel}>Coverage</div>
            </div>
          </div>
        </aside>
      </section>

      <form style={styles.filters}>
        <label style={styles.label}>
          <span>Scope</span>
          <select name="scope" defaultValue={scope} style={styles.select}>
            <option value="wisconsin">Wisconsin Tracks</option>
<option value="non_wisconsin">Non-Wisconsin Tracks</option>
<option value="full">Full Coverage Area</option>
          </select>
        </label>

        <label style={styles.label}>
          <span>Year</span>
          <select name="year" defaultValue={year} style={styles.select}>
            <option value="all">All Years</option>
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          <span>Track</span>
          <select name="track" defaultValue={track} style={styles.selectWide}>
            <option value="all">All Tracks</option>
            {trackOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          <span>Surface</span>
          <select name="surface" defaultValue={surface} style={styles.select}>
            <option value="all">All Surfaces</option>
            <option value="Dirt">Dirt</option>
            <option value="Asphalt">Asphalt</option>
            <option value="Mixed">Mixed</option>
          </select>
        </label>

        <label style={styles.label}>
          <span>Class</span>
          <select name="class" defaultValue={classFilter} style={styles.select}>
            <option value="all">All Classes</option>
            {classOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.labelWide}>
          <span>Search Driver</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Dick Trickle, Kevin Adams, Al Schill..."
            style={styles.input}
          />
        </label>

        <label style={styles.labelSmall}>
          <span>Min Wins</span>
          <select name="minWins" defaultValue={String(minWins)} style={styles.selectSmall}>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="5">5+</option>
            <option value="10">10+</option>
            <option value="25">25+</option>
            <option value="50">50+</option>
            <option value="100">100+</option>
          </select>
        </label>

        <label style={styles.labelSmall}>
          <span>Rows</span>
          <select name="rows" defaultValue={rows} style={styles.selectSmall}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="all">All</option>
          </select>
        </label>

        <div style={styles.actionRow} className="stats-action-row">
  <button type="submit" style={styles.button}>
    Run Report
  </button>

  <a href="/stats/feature-winners" style={styles.clearButton}>
    Clear Filters
  </a>
</div>
</form>

      {error && <div style={styles.error}>Supabase error: {error.message}</div>}
      {yearsError && <div style={styles.error}>Years error: {yearsError.message}</div>}
      {trackError && <div style={styles.error}>Track error: {trackError.message}</div>}
      {classError && <div style={styles.error}>Class error: {classError.message}</div>}

      <section style={styles.card}>
<div style={styles.cardWatermark} />
        <div style={styles.cardHeader}>
          <div>
            <div style={styles.cardKicker}>Leaderboard</div>
            <h2 style={styles.cardTitle}>
              {year === 'all' ? 'All-Time Feature Winners' : `${year} Feature Winners`}
            </h2>
            <div style={styles.meta}>
              {scope === 'wisconsin'
  ? 'Wisconsin tracks'
  : scope === 'non_wisconsin'
    ? 'Non-Wisconsin tracks'
    : 'Full coverage area'} ·{' '}
              {track === 'all' ? 'all tracks' : 'selected track'} ·{' '}
              {surface === 'all' ? 'all surfaces' : surface} ·{' '}
              {classFilter === 'all' ? 'all classes' : 'selected class'} · minimum {minWins}{' '}
              win{minWins === 1 ? '' : 's'} · showing {winners.length}
            </div>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Rank</th>
                <th style={styles.thLeft}>Driver</th>
                <th style={styles.th}>Wins</th>
                {year === 'all' && <th style={styles.th}>Years</th>}
                <th style={styles.th}>Tracks</th>
                <th style={styles.th}>Classes</th>
                <th style={styles.th}>First Win</th>
                <th style={styles.th}>Last Win</th>
              </tr>
            </thead>

            <tbody>
              {winners.map((row, index) => (
                <tr
  key={`${row.driver_id}-${index}`}
  style={{
    ...styles.tr,
    ...(index % 2 === 1 ? styles.trAlt : {}),
  }}
>
                  <td style={styles.tdRank}>{index + 1}</td>

                  <td style={styles.tdDriver}>
                    <div style={styles.driverNameRow}>
  <Link href={`/drivers/${row.driver_slug}`} style={styles.driverLink}>
    {row.driver_name}
  </Link>

  {isRecentWinner(row.last_win_date) && (
    <span style={styles.recentBadge}>Active</span>
  )}
</div>
                    <div style={styles.driverSub}>
                      {[row.driver_hometown, row.driver_state].filter(Boolean).join(', ') ||
                        'Hometown unknown'}
                    </div>
                  </td>

                  <td style={styles.tdCenter}>
                    <Link
                      href={`/drivers/${row.driver_slug}/results?finish=1${
                        year !== 'all' ? `&year=${year}` : ''
                      }`}
                      style={styles.winLink}
                    >
                      {row.feature_wins}
                    </Link>
                  </td>

                  {year === 'all' && <td style={styles.tdCenter}>{row.years_with_wins}</td>}

                  <td style={styles.tdCenter}>{row.tracks_won_at}</td>
                  <td style={styles.tdCenter}>{row.classes_won_in}</td>
                  <td style={styles.tdCenter}>{formatDate(row.first_win_date)}</td>
                  <td style={styles.tdCenter}>{formatDate(row.last_win_date)}</td>
                </tr>
              ))}

              {winners.length === 0 && (
                <tr>
                  <td colSpan={year === 'all' ? 8 : 7} style={styles.empty}>
                    No matching feature winners found for this combination. Try changing the
                    surface, track, class, or year filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    padding: '34px',
    maxWidth: '1360px',
    margin: '0 auto',
    background: '#f4ead7',
    minHeight: '100vh',
    color: '#2b2118',
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: '1fr 390px',
    gap: '26px',
    alignItems: 'stretch',
    border: '2px solid #3a2a1a',
    background:
      'radial-gradient(circle at 14% 18%, rgba(255,255,255,.46), transparent 28%), linear-gradient(135deg, #f3e9c9, #d9bf83)',
    padding: '34px',
    marginBottom: '24px',
    boxShadow: '7px 7px 0 rgba(54,38,22,.23)',
  },
  checkerWatermark: {
    position: 'absolute',
    right: '-65px',
    top: '-65px',
    width: '390px',
    height: '230px',
    opacity: 0.1,
    transform: 'rotate(-11deg)',
    backgroundImage:
      'linear-gradient(45deg, #2b2118 25%, transparent 25%), linear-gradient(-45deg, #2b2118 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2b2118 75%), linear-gradient(-45deg, transparent 75%, #2b2118 75%)',
    backgroundSize: '34px 34px',
    backgroundPosition: '0 0, 0 17px, 17px -17px, -17px 0',
    pointerEvents: 'none',
  },
  heroLeft: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '350px',
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: '0.22em',
    fontSize: '13px',
    fontWeight: 900,
    marginBottom: '22px',
  },
  title: {
    fontSize: '68px',
    margin: '0 0 28px',
    fontFamily: 'Georgia, serif',
    lineHeight: 0.95,
  },
  subtitle: {
    maxWidth: '780px',
    fontSize: '18px',
    lineHeight: 1.55,
    margin: 0,
  },
  heroRibbon: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '0',
    borderTop: '1px solid rgba(80,57,30,.35)',
    paddingTop: '22px',
    marginTop: '32px',
    maxWidth: '870px',
  },
  ribbonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '0 20px',
    minHeight: '58px',
    borderRight: '1px solid rgba(80,57,30,.35)',
  },
  ribbonIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 900,
    color: '#2b2118',
    flex: '0 0 auto',
  },
heroNote: {
  maxWidth: '760px',
  marginTop: '28px',
  padding: '18px 20px',
  borderLeft: '5px solid #6f512b',
  background: 'rgba(255, 248, 232, .48)',
  fontSize: '16px',
  lineHeight: 1.55,
  boxShadow: 'inset 0 0 0 1px rgba(111,81,43,.18)',
},
  ribbonTitle: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 900,
    marginBottom: '4px',
  },
  ribbonText: {
    display: 'block',
    fontSize: '13px',
    lineHeight: 1.35,
  },
  statBox: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255, 250, 235, .88)',
    border: '2px solid #3a2a1a',
    padding: '24px',
    boxShadow: 'inset 0 0 0 4px rgba(122,92,50,.12)',
    textAlign: 'center',
  },
  statBoxTitle: {
    fontFamily: 'Georgia, serif',
    fontWeight: 900,
    fontSize: '28px',
    marginBottom: '8px',
  },
  statBoxText: {
    margin: '0 auto 14px',
    fontSize: '14px',
    lineHeight: 1.45,
    maxWidth: '290px',
  },
  statDivider: {
    height: '1px',
    background: '#9b7b48',
    opacity: 0.65,
    margin: '16px 0 18px',
  },
driverNameRow: {
  display: 'flex',
  alignItems: 'center',
  gap: '18px',
},

recentBadge: {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 8px',
  border: '1px solid rgba(122, 92, 50, 0.45)',
  background: 'rgba(234, 215, 170, 0.45)',
  color: '#6a4a28',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  borderRadius: '999px',
  lineHeight: 1,
  transform: 'translateY(1px)',
},
heroUpdateNote: {
  marginTop: '10px',
  fontSize: '14px',
  fontWeight: 800,
  color: '#5f4528',
},
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
  },
  statItem: {
    background: '#f2e3bf',
    border: '1px solid #8a6938',
    padding: '18px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '108px',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 900,
    lineHeight: 1,
    color: '#2b2118',
    fontFamily: 'Georgia, serif',
  },
  statLabel: {
    marginTop: '10px',
    fontSize: '11px',
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    fontWeight: 900,
    color: '#6f512b',
  },
filters: {
  display: 'grid',
  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
  gap: '22px 18px',
  border: '1px solid #7a5c32',
  background: '#fff8e8',
  padding: '18px',
  marginBottom: '20px',
  alignItems: 'end',
},
  label: {
    display: 'grid',
    gap: '7px',
    fontWeight: 900,
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    gridColumn: 'span 2',
  },
 labelWide: {
  display: 'grid',
  gap: '7px',
  fontWeight: 900,
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  gridColumn: 'span 5',
},
  labelSmall: {
    display: 'grid',
    gap: '7px',
    fontWeight: 900,
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    gridColumn: 'span 2',
  },
archiveUpdateRow: {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '18px',
  marginTop: '14px',
  color: '#6a4a28',
  fontSize: '15px',
  fontWeight: 600,
},
activeLegend: {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: '#7b6540',
  fontSize: '13px',
  fontWeight: 500,
},
activeLegendBadge: {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 8px',
  border: '1px solid rgba(122, 92, 50, 0.45)',
  background: 'rgba(234, 215, 170, 0.45)',
  color: '#6a4a28',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  borderRadius: '999px',
  lineHeight: 1,
},
  select: {
    width: '100%',
    minWidth: 0,
    padding: '11px',
    border: '1px solid #6f512b',
    background: '#fffdf6',
    fontSize: '14px',
  },
trAlt: {
  background: 'rgba(234, 215, 170, 0.28)',
},
  selectWide: {
    width: '100%',
    minWidth: 0,
    padding: '11px',
    border: '1px solid #6f512b',
    background: '#fffdf6',
    fontSize: '14px',
  },
  selectSmall: {
    width: '100%',
    minWidth: 0,
    padding: '11px',
    border: '1px solid #6f512b',
    background: '#fffdf6',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    minWidth: 0,
    padding: '11px',
    border: '1px solid #6f512b',
    background: '#fffdf6',
    fontSize: '14px',
  },
cardWatermark: {
  position: 'absolute',
  right: '-70px',
  top: '25px',
  width: '360px',
  height: '220px',
  opacity: 0.055,
  transform: 'rotate(-10deg)',
  backgroundImage:
    'linear-gradient(45deg, #2b2118 25%, transparent 25%), linear-gradient(-45deg, #2b2118 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2b2118 75%), linear-gradient(-45deg, transparent 75%, #2b2118 75%)',
  backgroundSize: '32px 32px',
  backgroundPosition: '0 0, 0 16px, 16px -16px, -16px 0',
  pointerEvents: 'none',
},
  card: {
  position: 'relative',
  overflow: 'hidden',
  background: '#fffaf0',
  border: '2px solid #3a2a1a',
},
  cardHeader: {
    padding: '20px',
    borderBottom: '2px solid #3a2a1a',
    background: '#ead7aa',
  },
  cardKicker: {
    fontSize: '12px',
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    fontWeight: 900,
  },
  cardTitle: {
    margin: '4px 0 0',
    fontFamily: 'Georgia, serif',
    fontSize: '34px',
  },
  meta: {
    marginTop: '6px',
    fontSize: '14px',
    fontWeight: 800,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '15px',
  },
  th: {
    padding: '14px 16px',
    borderBottom: '1px solid #7a5c32',
    textAlign: 'center',
    background: '#f2e3bf',
    fontSize: '13px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  thLeft: {
    padding: '14px 16px',
    borderBottom: '1px solid #7a5c32',
    textAlign: 'left',
    background: '#f2e3bf',
    fontSize: '13px',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #d4bf91',
  },
  tdRank: {
    padding: '17px 16px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    fontWeight: 800,
    color: '#6f512b',
  },
  tdCenter: {
    padding: '17px 16px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  tdDriver: {
    padding: '17px 16px',
    minWidth: '260px',
  },
  driverLink: {
    color: '#5f2d12',
    fontWeight: 900,
    fontSize: '16px',
    textDecoration: 'none',
  },
  driverSub: {
    fontSize: '13px',
    opacity: 0.75,
    marginTop: '4px',
  },
  winLink: {
    fontWeight: 900,
    color: '#7a260f',
    textDecoration: 'underline',
  },
  error: {
    padding: '12px',
    marginBottom: '16px',
    background: '#ffe1d8',
    border: '1px solid #9c3b25',
  },
  empty: {
    padding: '32px',
    textAlign: 'center',
    fontWeight: 800,
  },

button: {
  padding: '12px 20px',
  border: '1px solid #2f2113',
  background: '#3a2a1a',
  color: '#fff8e8',
  fontWeight: 900,
  fontSize: '14px',
  cursor: 'pointer',
  minHeight: '42px',
},

clearButton: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 20px',
  border: '1px solid #7a5c32',
  background: '#efe4ca',
  color: '#3a2a1a',
  fontWeight: 900,
  fontSize: '14px',
  textDecoration: 'none',
  minHeight: '42px',
},

actionRow: {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
  width: '100%',
  gridColumn: 'span 4',
  alignSelf: 'end',
},
}