import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SeriesLogo from './[slug]/SeriesLogo'
import styles from './series-landing.module.css'

export const revalidate = 300

type SeriesRow = {
  id: number
  slug: string
  series_name: string
  region?: string | null
  years_active?: string | null
  first_year?: number | null
  last_year?: number | null
  logo_url?: string | null
  image_url?: string | null
  status?: string | null
  coverage?: string | null
  is_published?: boolean | null
  season_count?: number | string | null
  event_count?: number | string | null
  champion_driver_count?: number | string | null
  winner_count?: number | string | null
  first_event_date?: string | null
  latest_event_date?: string | null
}

type TotalsRow = {
  series_count?: number | string | null
  season_count?: number | string | null
  event_count?: number | string | null
  winner_count?: number | string | null
  champion_driver_count?: number | string | null
  first_year?: number | null
  last_year?: number | null
}

type PhotoRow = {
  file_name?: string | null
  track_slug?: string | null
  year?: string | number | null
}

const completedSeries = new Set([
  'american-ethanol-supertruck-series',
  'artgo-challenge-series',
  'asa-national-tour',
  'badger-modified-tour',
  'badger-stock-car-tour',
  'big-eight-late-model-series',
  'central-wisconsin-steel-frame-challenge',
  'cowbell-street-stock-tour',
  'fastlane-motorsports-northland-super-stock-series',
  'mars-late-model-series',
  'tundra-sportsman-series',
  'tundra-super-late-model-series',
  'wisconsin-challenge-series',
  'wisconsin-short-track-series',
  'wisconsin-wingless-sprint-car-series',
])

const specialEventSeriesSlugs = new Set([
  'clash-at-the-creek',
  'usa-nationals',
  'wissota-100-late-model-division',
  'wissota-100-modified-division',
  'wissota-100-super-stock-division',
  'wissota-100-street-stock-division',
  'wissota-100-midwest-modified-division',
  'wissota-100-mod-four-division',
  'wissota-100-pure-stock-division',
  'wissota-100-hornet-division',
  'legendary-100-late-model-division',
  'legendary-100-modified-division',
  'legendary-100-midwest-modified-division',
  'legendary-100-pro-stock-division',
  'legendary-100-street-stock-division',
  'legendary-100-pure-stock-division',
  'legendary-100-hornet-division',
  'legendary-100-limited-late-model-division',
])

const featuredSlugs = [
  'asa-national-tour',
  'artgo-challenge-series',
  'asa-midwest-tour',
  'big-eight-late-model-series',
  'tundra-super-late-model-series',
  'wisconsin-wingless-sprint-car-series',
]

const highlightDefinitions = [
  { slug: 'asa-national-tour', label: 'Deepest Results Archive', stat: 'events' as const },
  { slug: 'artgo-challenge-series', label: 'Historic Touring Series', stat: 'seasons' as const },
  { slug: 'asa-midwest-tour', label: 'Recently Active Archive', stat: 'latest' as const },
  { slug: 'tundra-super-late-model-series', label: 'Modern Championship Tour', stat: 'winners' as const },
]

const eras = [
  { key: 'pre1980', title: 'Origins', note: 'Through 1979', start: 1900, end: 1979 },
  { key: '1980s90s', title: '1980s–1990s', note: '1980–1999', start: 1980, end: 1999 },
  { key: '2000s', title: '2000s', note: '2000–2009', start: 2000, end: 2009 },
  { key: '2010s', title: '2010s', note: '2010–2019', start: 2010, end: 2019 },
  { key: 'current', title: 'Current Era', note: '2020–Present', start: 2020, end: 9999 },
]

function n(value: number | string | null | undefined) {
  return Number(value || 0)
}

function formatNumber(value: number | string | null | undefined) {
  return n(value).toLocaleString('en-US')
}

function seriesStart(row: SeriesRow) {
  if (row.first_year) return Number(row.first_year)
  const match = String(row.years_active || '').match(/\d{4}/)
  return match ? Number(match[0]) : 9999
}

function seriesEnd(row: SeriesRow) {
  if (row.last_year) return Number(row.last_year)
  const years = String(row.years_active || '').match(/\d{4}/g)
  if (String(row.years_active || '').toLowerCase().includes('present')) return 9999
  return years?.length ? Number(years[years.length - 1]) : seriesStart(row)
}

function yearsLabel(row: SeriesRow) {
  if (row.years_active) return row.years_active
  const first = row.first_year
  const last = row.last_year
  if (first && last) return first === last ? String(first) : `${first}–${last}`
  if (first) return `${first}–Present`
  return 'Years being researched'
}

function isActive(row: SeriesRow) {
  return seriesEnd(row) >= 2024 || String(row.years_active || '').toLowerCase().includes('present')
}

function inEra(row: SeriesRow, key: string) {
  const era = eras.find((item) => item.key === key)
  if (!era) return true
  return seriesStart(row) <= era.end && seriesEnd(row) >= era.start
}

function baseTrackSlug(slug: string) {
  return slug.replace(/-(wi|mn|il|mi|in|ia|mo|oh|tn|co|ks|ky|sc|sd|ont)$/i, '')
}

function photoUrl(photo?: PhotoRow | null) {
  if (!photo?.file_name) return ''
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ''
  const track = photo.track_slug || photo.file_name.split('_')[0] || 'unknown-track'
  const year = photo.year || photo.file_name.split('_')[1] || 'unknown-year'
  return `${base}/storage/v1/object/public/media/photos/master/${track}/${year}/${encodeURIComponent(photo.file_name)}`
}

function buildHref(page: number, filters: { q: string; era: string; status: string; sort: string }) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.era) params.set('era', filters.era)
  if (filters.status) params.set('status', filters.status)
  if (filters.sort && filters.sort !== 'name') params.set('sort', filters.sort)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return `/series${query ? `?${query}` : ''}#directory`
}

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; era?: string; status?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const filters = {
    q: String(params.q || '').trim(),
    era: String(params.era || '').trim(),
    status: String(params.status || '').trim(),
    sort: String(params.sort || 'name').trim(),
  }
  const requestedPage = Math.max(1, Number(params.page || 1) || 1)

  const [{ data: rawRows, error }, { data: totalsData }] = await Promise.all([
    supabase
      .from('series_landing_stats_view')
      .select('*')
      .eq('is_published', true)
      .order('series_name', { ascending: true }),
    supabase.from('series_archive_totals_view').select('*').maybeSingle(),
  ])

  const rows = ((rawRows || []) as SeriesRow[]).filter((row) => !specialEventSeriesSlugs.has(row.slug))
  const totals = (totalsData || {}) as TotalsRow
  const rowBySlug = new Map(rows.map((row) => [row.slug, row]))

  const heroSeries = rowBySlug.get('asa-midwest-tour') || [...rows].sort((a, b) => String(b.latest_event_date || '').localeCompare(String(a.latest_event_date || '')))[0] || null
  let heroPhoto = ''
  let heroTrack = ''

  if (heroSeries) {
    const { data: latestEvent } = await supabase
      .from('SeriesEvents')
      .select('track_id, track_name, race_date')
      .eq('series_id', heroSeries.id)
      .order('race_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestEvent?.track_id) {
      const { data: track } = await supabase
        .from('Tracks')
        .select('slug, track_name')
        .eq('id', latestEvent.track_id)
        .maybeSingle()

      if (track?.slug) {
        const slugs = Array.from(new Set([track.slug, baseTrackSlug(track.slug)]))
        const { data: photos } = await supabase
          .from('photos')
          .select('file_name, track_slug, year')
          .in('track_slug', slugs)
          .order('year', { ascending: false, nullsFirst: false })
          .order('sequence', { ascending: true, nullsFirst: false })
          .limit(1)
        heroPhoto = photoUrl((photos || [])[0] as PhotoRow | undefined)
        heroTrack = latestEvent.track_name || track.track_name || ''
      }
    }
  }

  const eraCounts = new Map(eras.map((era) => [era.key, rows.filter((row) => inEra(row, era.key)).length]))
  const highlights = highlightDefinitions
    .map((item) => ({ ...item, row: rowBySlug.get(item.slug) }))
    .filter((item): item is typeof item & { row: SeriesRow } => Boolean(item.row))

  const featured = featuredSlugs.map((slug) => rowBySlug.get(slug)).filter((row): row is SeriesRow => Boolean(row))

  let filtered = rows.filter((row) => {
    if (filters.q) {
      const haystack = `${row.series_name} ${row.region || ''} ${row.years_active || ''}`.toLowerCase()
      if (!haystack.includes(filters.q.toLowerCase())) return false
    }
    if (filters.era && !inEra(row, filters.era)) return false
    if (filters.status === 'complete' && !completedSeries.has(row.slug)) return false
    if (filters.status === 'active' && !isActive(row)) return false
    if (filters.status === 'historic' && isActive(row)) return false
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    if (filters.sort === 'events') return n(b.event_count) - n(a.event_count) || a.series_name.localeCompare(b.series_name)
    if (filters.sort === 'seasons') return n(b.season_count) - n(a.season_count) || a.series_name.localeCompare(b.series_name)
    if (filters.sort === 'newest') return seriesEnd(b) - seriesEnd(a) || a.series_name.localeCompare(b.series_name)
    if (filters.sort === 'oldest') return seriesStart(a) - seriesStart(b) || a.series_name.localeCompare(b.series_name)
    return a.series_name.localeCompare(b.series_name)
  })

  const pageSize = 20
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(requestedPage, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const hasFilters = Boolean(filters.q || filters.era || filters.status || filters.sort !== 'name')

  const firstYear = totals.first_year || Math.min(...rows.map(seriesStart).filter((year) => Number.isFinite(year)))
  const lastYear = totals.last_year || 2026

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroPhoto ? <img src={heroPhoto} alt="" aria-hidden="true" className={styles.heroImage} /> : <div className={styles.heroFallback} />}
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.eyebrow}>Upper Midwest Series Archive</div>
              <h1 className={styles.title}>Series</h1>
              <div className={styles.subtitle}>Explore {formatNumber(totals.series_count || rows.length)} racing organizations</div>
              <p className={styles.intro}>
                Discover touring series, sanctioning bodies, championship organizations, and regional race groups preserved across the museum. Search season history, champions, events, winners, tracks, and related archival material.
              </p>
            </div>
            <div className={styles.heroScript} aria-hidden="true">
              <span>Series</span><strong>Build</strong><strong>Legacies</strong>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <HeroStat icon="◉" value={formatNumber(totals.series_count || rows.length)} label="Series Archived" />
            <HeroStat icon="▦" value={formatNumber(totals.season_count)} label="Seasons Recorded" />
            <HeroStat icon="⚑" value={formatNumber(totals.event_count)} label="Race Events Recorded" />
            <HeroStat icon="★" value={formatNumber(totals.winner_count)} label="Feature Winners" />
            <HeroStat icon="⌁" value={`${firstYear}–${lastYear}`} label="Years of Series History" />
          </div>

          <form className={styles.searchPanel} action="/series" method="get">
            <div className={styles.searchRow}>
              <div className={styles.searchInputWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input className={styles.searchInput} type="search" name="q" defaultValue={filters.q} placeholder="Search series by name, region, or era..." />
              </div>
              <button className={styles.searchButton} type="submit">Search Series</button>
            </div>
            <div className={styles.filterGrid}>
              <label className={styles.filterField}><span>Era</span><select name="era" defaultValue={filters.era}><option value="">All Eras</option>{eras.map((era) => <option key={era.key} value={era.key}>{era.title}</option>)}</select></label>
              <label className={styles.filterField}><span>Archive Status</span><select name="status" defaultValue={filters.status}><option value="">All Series</option><option value="active">Current / Recent</option><option value="historic">Historic</option><option value="complete">Completed Museum Archives</option></select></label>
              <label className={styles.filterField}><span>Sort By</span><select name="sort" defaultValue={filters.sort}><option value="name">Series Name (A–Z)</option><option value="events">Most Recorded Events</option><option value="seasons">Most Seasons</option><option value="newest">Newest Activity</option><option value="oldest">Earliest History</option></select></label>
              <div className={styles.filterActions}>{hasFilters ? <Link href="/series#directory">Clear filters</Link> : 'Search the complete series archive'}</div>
            </div>
          </form>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section}>
          <SectionHeader kicker="Browse the archive" title="Browse by Era" note="Jump directly into a period of series history." />
          <div className={styles.eraGrid}>
            {eras.map((era) => (
              <Link key={era.key} href={buildHref(1, { ...filters, era: era.key })} className={styles.eraCard}>
                <strong>{era.title}</strong><span>{eraCounts.get(era.key) || 0} series</span><small>{era.note}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader kicker="Museum archive highlights" title="Explore Series History" note={heroTrack ? `Current archive imagery from ${heroTrack}.` : 'Key series from across the museum archive.'} />
          <div className={styles.highlightGrid}>
            {highlights.map(({ row, label, stat }) => (
              <Link href={`/series/${row.slug}`} className={styles.highlightCard} key={row.slug}>
                <div className={styles.highlightMedia}><SeriesLogo slug={row.slug} seriesName={row.series_name} /></div>
                <div className={styles.highlightBody}>
                  <div className={styles.cardLabel}>{label}</div>
                  <div className={styles.highlightTitle}>{row.series_name}</div>
                  <div className={styles.highlightMeta}>{row.region || 'Upper Midwest'} • {yearsLabel(row)}</div>
                  <div className={styles.highlightStat}>{highlightStat(row, stat)}</div>
                  <div className={styles.highlightCta}>View Series →</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader kicker="Museum highlights" title="Featured Series" note="A cross-section of major touring and championship archives." />
          <div className={styles.featuredGrid}>
            {featured.map((row) => {
              const complete = completedSeries.has(row.slug)
              return (
                <Link href={`/series/${row.slug}`} className={`${styles.featuredCard} ${complete ? styles.complete : ''}`} key={row.slug}>
                  <div className={styles.featuredLogo}><SeriesLogo slug={row.slug} seriesName={row.series_name} /></div>
                  <div className={styles.featuredBody}>
                    <div className={styles.featuredName}>{row.series_name}</div>
                    <div className={styles.featuredRegion}>{row.region || 'Upper Midwest'} • {yearsLabel(row)}</div>
                    <div className={styles.featuredStats}>
                      <MiniStat value={formatNumber(row.season_count)} label="Seasons" />
                      <MiniStat value={formatNumber(row.event_count)} label="Events" />
                      <MiniStat value={formatNumber(row.winner_count)} label="Winners" />
                    </div>
                    {complete ? <div className={styles.completeBadge}>Museum archive complete</div> : null}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className={styles.section} id="directory">
          <SectionHeader kicker="Research directory" title="Complete Series Directory" note={`${filtered.length.toLocaleString('en-US')} series match the current view`} />
          {error ? <div className={styles.empty}>Unable to load the series directory right now.</div> : pageRows.length === 0 ? <div className={styles.empty}>No series match those filters.</div> : (
            <>
              <div className={styles.directory}>
                <div className={styles.directoryHead}><span>Series</span><span>Region</span><span>Years</span><span>Seasons</span><span>Events</span><span>Winners</span><span>Status</span></div>
                {pageRows.map((row) => {
                  const complete = completedSeries.has(row.slug)
                  return (
                    <Link href={`/series/${row.slug}`} className={`${styles.directoryRow} ${complete ? styles.complete : ''}`} key={row.slug}>
                      <div className={styles.seriesIdentity}>
                        <div className={styles.directoryLogo}><SeriesLogo slug={row.slug} seriesName={row.series_name} /></div>
                        <div><strong>{row.series_name}</strong><span>{complete ? 'Completed museum archive' : 'Series profile'}</span></div>
                      </div>
                      <div className={styles.directoryValue}>{row.region || 'Upper Midwest'}</div>
                      <div className={styles.directoryValue}>{yearsLabel(row)}</div>
                      <div className={styles.directoryNumber}>{formatNumber(row.season_count)}</div>
                      <div className={styles.directoryNumber}>{formatNumber(row.event_count)}</div>
                      <div className={styles.directoryNumber}>{formatNumber(row.winner_count)}</div>
                      <div className={`${styles.directoryStatus} ${complete ? styles.complete : ''}`}>{complete ? 'Complete' : isActive(row) ? 'Current' : 'Historic'}</div>
                    </Link>
                  )
                })}
              </div>
              <div className={styles.pagination}>
                <span>Page {currentPage} of {pageCount}</span>
                <div>{currentPage > 1 ? <Link href={buildHref(currentPage - 1, filters)}>← Previous</Link> : null}{currentPage > 1 && currentPage < pageCount ? '   ·   ' : null}{currentPage < pageCount ? <Link href={buildHref(currentPage + 1, filters)}>Next →</Link> : null}</div>
              </div>
            </>
          )}
        </section>

        <section className={styles.bottomGrid}>
          <Link href="/results" className={styles.bottomCard}><strong>Race Results Archive</strong><p>Explore recorded feature results across tracks, drivers, special events, and series.</p><span>Browse Results →</span></Link>
          <Link href="/drivers" className={styles.bottomCard}><strong>Driver Directory</strong><p>Move from series history into the complete museum driver archive.</p><span>Browse Drivers →</span></Link>
          <Link href="/stats/feature-winners" className={styles.bottomCard}><strong>Research Center</strong><p>Compare winners, championships, archive totals, and museum research records.</p><span>Open Research Center →</span></Link>
        </section>
      </div>
    </main>
  )
}

function HeroStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return <div className={styles.statCard}><div className={styles.statIcon}>{icon}</div><div><div className={styles.statValue}>{value}</div><div className={styles.statLabel}>{label}</div></div></div>
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return <div className={styles.featuredStat}><strong>{value}</strong><span>{label}</span></div>
}

function SectionHeader({ kicker, title, note }: { kicker: string; title: string; note: string }) {
  return <div className={styles.sectionHeader}><div><div className={styles.sectionKicker}>{kicker}</div><h2>{title}</h2></div><div className={styles.sectionNote}>{note}</div></div>
}

function highlightStat(row: SeriesRow, kind: 'events' | 'seasons' | 'latest' | 'winners') {
  if (kind === 'events') return `${formatNumber(row.event_count)} recorded events`
  if (kind === 'seasons') return `${formatNumber(row.season_count)} seasons documented`
  if (kind === 'winners') return `${formatNumber(row.winner_count)} different winners`
  if (row.latest_event_date) {
    const [year, month, day] = row.latest_event_date.split('-').map(Number)
    if (year && month && day) return `Latest archive activity • ${new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return 'Recently active series archive'
}
