import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TrackLogo from '../TrackLogo'
import profileStyles from '../track-profile.module.css'
import styles from '../archive-list.module.css'

export const revalidate = 300

type Track = {
  track_name: string
  slug: string
  city?: string | null
  state?: string | null
  first_year?: number | null
  last_year?: number | null
  surface_type?: string | null
  configuration?: string | null
  image_url?: string | null
}

type LeaderRow = {
  track_slug?: string | null
  track_name?: string | null
  driver_name?: string | null
  driver_slug?: string | null
  title_count?: number | string | null
}

type TitleRow = {
  driver_slug?: string | null
  year?: number | string | null
  track_name?: string | null
  track_slug?: string | null
  class_name?: string | null
}

function formatNumber(value?: number | string | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatSlugName(value?: string | null) {
  if (!value) return 'Unknown Driver'
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function buildHref(
  slug: string,
  page: number,
  filters: { q: string; division: string; year: string; order: string },
) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.division) params.set('division', filters.division)
  if (filters.year) params.set('year', filters.year)
  if (filters.order && filters.order !== 'newest') params.set('order', filters.order)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return `/tracks/${slug}/champions${query ? `?${query}` : ''}#championship-archive`
}

export default async function TrackChampionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ q?: string; division?: string; year?: string; order?: string; page?: string }>
}) {
  const { slug } = await params
  const queryParams = (await searchParams) ?? {}
  const searchText = (queryParams.q ?? '').trim()
  const selectedDivision = (queryParams.division ?? '').trim()
  const selectedYear = (queryParams.year ?? '').trim()
  const order = queryParams.order === 'oldest' ? 'oldest' : 'newest'

  const [{ data: track }, { data: leaders }, { data: titles }] = await Promise.all([
    supabase
      .from('track_profile_view_v3')
      .select('track_name,slug,city,state,first_year,last_year,surface_type,configuration,image_url')
      .eq('slug', slug)
      .maybeSingle<Track>(),
    supabase
      .from('track_top_champions_view')
      .select('track_slug,track_name,driver_name,driver_slug,title_count')
      .eq('track_slug', slug)
      .order('title_count', { ascending: false })
      .limit(1000),
    supabase
      .from('driver_championships_view')
      .select('driver_slug,year,track_name,track_slug,class_name')
      .eq('track_slug', slug)
      .order('year', { ascending: false })
      .order('class_name', { ascending: true })
      .limit(5000),
  ])

  if (!track) notFound()

  const leaderRows = ((leaders ?? []) as LeaderRow[]).map((row) => ({
    ...row,
    title_count: Number(row.title_count || 0),
  }))
  const titleRows = (titles ?? []) as TitleRow[]
  const leader = leaderRows[0] || null
  const locationText = [track.city, track.state].filter(Boolean).join(', ') || 'Location not yet documented'
  const operatingSpan = track.first_year && track.last_year
    ? track.first_year === track.last_year ? String(track.first_year) : `${track.first_year}–${track.last_year}`
    : track.first_year ? `${track.first_year}–Present` : null

  const nameBySlug = new Map<string, string>()
  for (const row of leaderRows) {
    if (row.driver_slug && row.driver_name) nameBySlug.set(row.driver_slug, row.driver_name)
  }

  const yearOptions = Array.from(new Set(titleRows.map((row) => Number(row.year || 0)).filter(Boolean))).sort((a, b) => b - a)
  const divisionOptions = Array.from(new Set(titleRows.map((row) => row.class_name).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))
  const newestYear = yearOptions[0] || track.last_year || null
  const oldestYear = yearOptions[yearOptions.length - 1] || track.first_year || null
  const archiveSpan = oldestYear && newestYear
    ? oldestYear === newestYear ? String(oldestYear) : `${oldestYear}–${newestYear}`
    : 'Growing archive'

  const normalizedSearch = searchText.toLowerCase()
  let filteredRows = titleRows.filter((row) => {
    const driverName = nameBySlug.get(row.driver_slug || '') || formatSlugName(row.driver_slug)
    const matchesSearch = !normalizedSearch || `${driverName} ${row.driver_slug || ''} ${row.class_name || ''}`.toLowerCase().includes(normalizedSearch)
    const matchesDivision = !selectedDivision || row.class_name === selectedDivision
    const matchesYear = !selectedYear || String(row.year || '') === selectedYear
    return matchesSearch && matchesDivision && matchesYear
  })

  filteredRows = filteredRows.sort((a, b) => {
    const ay = Number(a.year || 0)
    const by = Number(b.year || 0)
    if (ay !== by) return order === 'oldest' ? ay - by : by - ay
    return String(a.class_name || '').localeCompare(String(b.class_name || ''))
  })

  const pageSize = 100
  const requestedPage = Math.max(1, Number.parseInt(queryParams.page || '1', 10) || 1)
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(requestedPage, pageCount)
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const filters = { q: searchText, division: selectedDivision, year: selectedYear, order }
  const hasFilters = Boolean(searchText || selectedDivision || selectedYear || order !== 'newest')
  const heroUrl = track.image_url || ''

  const stats = [
    { icon: '◉', value: formatNumber(titleRows.length), label: 'Championship Titles Indexed' },
    { icon: '🏆', value: formatNumber(leaderRows.length), label: 'Championship Drivers' },
    { icon: '★', value: leader ? formatNumber(leader.title_count) : '—', label: leader?.driver_name ? `${leader.driver_name} · Leading Total` : 'Leading Total' },
    { icon: '▦', value: archiveSpan, label: 'Championship Archive' },
  ]

  return (
    <main className={profileStyles.page}>
      <section className={profileStyles.hero}>
        {heroUrl ? (
          <img src={heroUrl} alt={`Racing at ${track.track_name}`} className={profileStyles.heroImage} />
        ) : (
          <div className={profileStyles.heroFallback} aria-hidden="true" />
        )}

        <div className={profileStyles.heroInner}>
          <nav className={profileStyles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>›</span>
            <Link href="/tracks">Tracks</Link><span>›</span>
            <Link href={`/tracks/${slug}`}>{track.track_name}</Link><span>›</span>
            <span>Champions</span>
          </nav>

          <div className={profileStyles.heroGrid}>
            <div className={profileStyles.logoFrame}>
              <TrackLogo slug={slug} trackName={track.track_name} />
            </div>
            <div>
              <p className={profileStyles.eyebrow}>Championship History</p>
              <h1 className={profileStyles.title}>{track.track_name}</h1>
              <p className={profileStyles.location}>{locationText}</p>
            </div>
            <p className={profileStyles.heroIntro}>
              Explore championship leaders and the year-by-year title archive connected to {track.track_name}, with divisions and driver records preserved for research.
            </p>
            <div className={profileStyles.heroFacts}>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>●</span>{locationText}</span>
              <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>🏆</span>{formatNumber(titleRows.length)} titles indexed</span>
              {track.configuration ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>⬭</span>{track.configuration}</span> : null}
              {track.surface_type ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>⚑</span>{track.surface_type}</span> : null}
              {operatingSpan ? <span className={profileStyles.heroFact}><span className={profileStyles.heroFactIcon}>◷</span>{operatingSpan}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <nav className={profileStyles.tabs} aria-label="Track sections">
        <div className={profileStyles.tabInner}>
          <Link href={`/tracks/${slug}`} className={profileStyles.tab}>Overview</Link>
          <Link href={`/tracks/${slug}/results`} className={profileStyles.tab}>Results</Link>
          <Link href={`/tracks/${slug}/champions`} className={`${profileStyles.tab} ${profileStyles.activeTab}`}>Champions</Link>
          <Link href={`/tracks/${slug}/feature-winners`} className={profileStyles.tab}>Feature Winners</Link>
          <Link href={`/tracks/${slug}/photos`} className={profileStyles.tab}>Photos</Link>
          <Link href="/media/newspapers" className={profileStyles.tab}>OCR / Newspaper Clippings</Link>
          <Link href={`/tracks/${slug}#track-info`} className={profileStyles.tab}>Track Info</Link>
        </div>
      </nav>

      <div className={styles.content}>
        <section className={profileStyles.statsGrid} aria-label="Championship statistics">
          {stats.map((stat) => (
            <div className={profileStyles.statCard} key={stat.label}>
              <div className={profileStyles.statTop}>
                <span className={profileStyles.statIcon} aria-hidden="true">{stat.icon}</span>
                <strong className={profileStyles.statValue}>{stat.value}</strong>
              </div>
              <div className={profileStyles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </section>

        {leaderRows.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.kicker}>All-time leaders</div>
                <h2>Leading Track Champions</h2>
              </div>
              <div className={styles.sectionNote}>Drivers with the most recorded titles</div>
            </div>
            <div className={styles.leaderStrip}>
              {leaderRows.slice(0, 8).map((champion, index) => (
                <Link
                  key={`${champion.driver_slug || champion.driver_name}-${index}`}
                  href={champion.driver_slug ? `/drivers/${champion.driver_slug}` : '#championship-archive'}
                  className={`${styles.leaderCard} ${index === 0 ? styles.leaderFirst : ''}`}
                >
                  <div className={styles.leaderRank}>#{index + 1}</div>
                  <div className={styles.leaderName}>{champion.driver_name || 'Unknown Driver'}</div>
                  <div className={styles.leaderValue}>{formatNumber(champion.title_count)}</div>
                  <div className={styles.leaderLabel}>titles</div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section} id="championship-archive">
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>Complete championship archive</div>
              <h2>Year-by-Year Champions</h2>
            </div>
            <div className={styles.sectionNote}>{formatNumber(filteredRows.length)} title record{filteredRows.length === 1 ? '' : 's'} shown</div>
          </div>

          <form action={`/tracks/${slug}/champions`} method="get" className={styles.filters}>
            <label>
              <span>Season</span>
              <select name="year" defaultValue={selectedYear}>
                <option value="">All seasons</option>
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label>
              <span>Division</span>
              <select name="division" defaultValue={selectedDivision}>
                <option value="">All divisions</option>
                {divisionOptions.map((division) => <option key={division} value={division}>{division}</option>)}
              </select>
            </label>
            <label>
              <span>Order</span>
              <select name="order" defaultValue={order}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <label className={styles.searchField}>
              <span>Search archive</span>
              <input name="q" defaultValue={searchText} placeholder="Driver or division..." />
            </label>
            <button type="submit" className={styles.applyButton}>Apply Filters</button>
            {hasFilters ? <Link href={`/tracks/${slug}/champions#championship-archive`} className={styles.clearLink}>Clear filters</Link> : <span className={styles.filterNote}>Browse the full championship history</span>}
          </form>

          {pageRows.length === 0 ? (
            <div className={styles.empty}>
              <strong>No championship records matched those filters.</strong>
              <span>Try another year, division, or driver.</span>
              <Link href={`/tracks/${slug}/champions#championship-archive`}>Show the full archive</Link>
            </div>
          ) : (
            <div className={styles.tablePanel}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th className={styles.yearCol}>Year</th><th>Champion</th><th>Division</th></tr>
                  </thead>
                  <tbody>
                    {pageRows.map((title, index) => {
                      const driverName = nameBySlug.get(title.driver_slug || '') || formatSlugName(title.driver_slug)
                      return (
                        <tr key={`${title.year}-${title.class_name}-${title.driver_slug}-${index}`}>
                          <td className={styles.yearCol}>{title.year || '—'}</td>
                          <td>
                            {title.driver_slug ? (
                              <Link href={`/drivers/${title.driver_slug}`} className={styles.driverLink}>{driverName}</Link>
                            ) : driverName}
                          </td>
                          <td>{title.class_name || 'Unknown Division'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pageCount > 1 ? (
            <div className={styles.pagination}>
              {currentPage > 1 ? <Link href={buildHref(slug, currentPage - 1, filters)}>← Previous</Link> : <span />}
              <strong>Page {currentPage} of {pageCount}</strong>
              {currentPage < pageCount ? <Link href={buildHref(slug, currentPage + 1, filters)}>Next →</Link> : <span />}
            </div>
          ) : null}
        </section>

        <section className={styles.footerGrid}>
          <Link href={`/tracks/${slug}`} className={styles.footerCard}><strong>Track Overview</strong><span>Return to the full {track.track_name} archive →</span></Link>
          <Link href={`/tracks/${slug}/feature-winners`} className={styles.footerCard}><strong>Feature Winners</strong><span>View the complete winner leaderboard →</span></Link>
          <Link href={`/tracks/${slug}/results`} className={styles.footerCard}><strong>Race Results</strong><span>Browse season-by-season feature results →</span></Link>
        </section>
      </div>
    </main>
  )
}
