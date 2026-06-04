import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

type Track = {
  track_name: string
  slug: string
  city?: string | null
  state?: string | null
  years_active?: string | null
}

type FullTrackResultRow = {
  race_id: number
  race_date: string
  track_slug: string
  track_name: string
  class_name: string | null
  first_place_driver: string | null
  second_place_driver: string | null
  third_place_driver: string | null
  first_place_driver_slug: string | null
  second_place_driver_slug: string | null
  third_place_driver_slug: string | null
}

export default async function TrackResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ year?: string }>
}) {
  const { slug } = await params
  const { year } = await searchParams

  const { data: track, error: trackError } = await supabase
  .from('track_profile_view')
  .select('track_name, slug, city, state, years_active')
  .eq('slug', slug)
  .single<Track>()

console.log('TRACK ROUTE SLUG:', slug)
console.log('TRACK QUERY ERROR:', trackError)
console.log('TRACK QUERY DATA:', track)

if (trackError || !track) {
  notFound()
}

const resultsTrackSlug =
  track.state?.toLowerCase() === 'wi' && !slug.endsWith('-wi')
    ? `${slug}-wi`
    : slug

  let resultsQuery = supabase
  .from('track_full_results_view')
  .select(`
  race_id,
  race_date,
  class_name,
  first_place_driver,
  second_place_driver,
  third_place_driver,
  first_place_driver_slug,
  second_place_driver_slug,
  third_place_driver_slug
`)
  .eq('track_slug', resultsTrackSlug)

if (year) {
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  resultsQuery = resultsQuery
    .gte('race_date', yearStart)
    .lte('race_date', yearEnd)
}
const { data: results, error: resultsError } = await resultsQuery
  .order('race_date', { ascending: true })
  .returns<FullTrackResultRow[]>()

console.log('TRACK SLUG:', slug)
console.log('RESULTS ERROR:', resultsError)
console.log('RESULT COUNT:', results?.length)
console.log('FIRST RESULT:', results?.[0])

const { count: resultsCount } = await supabase
  .from('track_full_results_view')
  .select('*', { count: 'exact', head: true })
  .eq('track_slug', resultsTrackSlug)

  const { data: allYearRows } = await supabase
    .from('track_results_by_year_view')
    .select('result_year')
    .eq('track_slug', resultsTrackSlug)
    .order('result_year', { ascending: true })

  const safeResults = results ?? []
  const safeYearRows = allYearRows ?? []

  const groupedResults = safeResults.reduce((acc, result) => {
  const yearKey = new Date(result.race_date).getFullYear()
  const dateKey = result.race_date

  if (!acc[yearKey]) acc[yearKey] = {}
  if (!acc[yearKey][dateKey]) acc[yearKey][dateKey] = []

  acc[yearKey][dateKey].push(result)

  return acc
}, {} as Record<number, Record<string, FullTrackResultRow[]>>)

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>
              Home
            </Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/tracks" style={breadcrumbLink}>
              Tracks
            </Link>
            <span style={breadcrumbSep}>/</span>
            <Link href={`/tracks/${slug}`} style={breadcrumbLink}>
              {track.track_name}
            </Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>Full Results</span>
          </div>

          <div>
            <div style={eyebrow}>Track Results Archive</div>
            <h1 style={trackNameStyle}>{track.track_name}</h1>

            <p style={locationLine}>
              {track.city || 'Unknown city'}
              {track.state ? `, ${track.state}` : ''}
            </p>

            <p style={introText}>
              Complete feature winners by date, with class and top 3 finishers where available.
            </p>

            <div style={buttonRow}>
              <Link href={`/tracks/${slug}`} style={backButton}>
                Back to Track Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={resultsPanel}>
          <div style={panelHeader}>Complete Feature Results by Date</div>
          <div style={panelBody}>
            <div style={yearFilterWrap}>
              <span style={yearFilterLabel}>Filter by Year:</span>

              <Link
                href={`/tracks/${slug}/results`}
                style={year === undefined ? activeYearFilterLink : yearFilterLink}
              >
                All
              </Link>

              {safeYearRows.map((row: any) => (
                <Link
                  key={row.result_year}
                  href={`/tracks/${slug}/results?year=${row.result_year}`}
                  style={
                    year === String(row.result_year)
                      ? activeYearFilterLink
                      : yearFilterLink
                  }
                >
                  {row.result_year}
                </Link>
              ))}
            </div>

            <div style={filterSummary}>
              {year ? `Showing results for ${year}` : 'Showing all years'}
            </div>

            {safeResults.length === 0 ? (
              <p style={panelText}>No full results available yet.</p>
            ) : (
              <div>
                {Object.entries(groupedResults).map(([yearKey, yearData]) => (
  <details
    key={yearKey}
    open={year === String(yearKey) || year === undefined}
  >
    <summary style={yearHeader}>{yearKey}</summary>

    {Object.entries(yearData)
      .sort(
        ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
      )
      .map(([date, races]) => (
        <div key={date} style={resultDayCard}>
          <h3 style={resultDate}>{formatRaceDate(date)}</h3>

          <div style={resultList}>
            <div style={resultGridHeader}>
  <div></div>
  <div>Winner</div>
  <div>2nd</div>
  <div>3rd</div>
  </div>

            {[...races]
              .sort((a, b) =>
                (a.class_name || '').localeCompare(b.class_name || '')
              )
              .map((r, i) => (
                <div key={`${r.race_id}-${i}`} style={resultGridRow}>
                  <div style={{ fontWeight: 700 }}>
                    {r.class_name || 'Unknown'}
                  </div>

                  <div>
                    {renderDriverOnly(r.first_place_driver, r.first_place_driver_slug)}
                  </div>

                  <div>
                    {renderDriverOnly(r.second_place_driver, r.second_place_driver_slug)}
                  </div>

                  <div>
                    {renderDriverOnly(r.third_place_driver, r.third_place_driver_slug)}
                  </div>

                </div>
              ))}
          </div>
        </div>
      ))}
  </details>
))}
                    
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function renderFinisher(
  position: number,
  name: string | null,
  slug: string | null
) {
  if (!name) return null

  return (
    <span>
      {position}.{' '}
      {slug ? (
        <Link
          href={`/drivers/${slug}`}
          style={driverLinkStyle}
        >
          {name}
        </Link>
      ) : (
        <span>{name}</span>
      )}
    </span>
  )
}

function renderDriverOnly(name: string | null, slug: string | null) {
  if (!name) return '-'

  return slug ? (
    <Link href={`/drivers/${slug}`} style={driverLinkStyle}>
      {name}
    </Link>
  ) : (
    <span>{name}</span>
  )
}

function formatRaceDate(dateString: string) {
  const date = new Date(dateString)

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  color: '#2f2417',
  minHeight: '100vh',
  fontFamily: 'Georgia, serif',
  margin: 0,
}

const heroSection: CSSProperties = {
  background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const heroInner: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 30px',
}

const breadcrumbRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  fontSize: '15px',
  marginBottom: '22px',
  color: '#6b4a22',
}

const breadcrumbLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
}

const breadcrumbSep: CSSProperties = {
  color: '#8d7049',
}

const breadcrumbCurrent: CSSProperties = {
  color: '#4b351d',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const trackNameStyle: CSSProperties = {
  fontSize: '52px',
  margin: '0 0 10px',
  color: '#3d2b16',
  lineHeight: 1.05,
}

const locationLine: CSSProperties = {
  fontSize: '22px',
  margin: '0 0 18px',
  color: '#5a3a1b',
}

const introText: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1.7,
  maxWidth: '760px',
  margin: '0 0 20px',
}

const buttonRow: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

const backButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '12px 18px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 40px',
}

const resultsPanel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px',
}

const panelHeader: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginBottom: '10px',
}

const panelBody: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
}

const yearFilterWrap: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  alignItems: 'center',
  marginBottom: '14px',
}

const yearFilterLabel: CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: '#5a3a1b',
  marginRight: '6px',
}

const yearFilterLink: CSSProperties = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: '999px',
  border: '1px solid rgba(115, 88, 52, 0.22)',
  background: '#f4ecdc',
  color: '#7a6348',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 600,
}

const activeYearFilterLink: CSSProperties = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: '999px',
  border: '1px solid #7b5c34',
  background: '#7b5c34',
  color: '#fff8ee',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 700,
  boxShadow: '0 4px 12px rgba(60, 40, 20, 0.10)',
}

const filterSummary: CSSProperties = {
  fontSize: '14px',
  color: '#6b4a22',
  marginBottom: '14px',
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: '0 0 14px',
}

const dateHeader: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  marginTop: '14px',
  marginBottom: '6px',
  color: '#3d2b16',
}

const yearHeader: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginTop: '16px',
  marginBottom: '6px',
  borderBottom: '1px solid #b29364',
  paddingBottom: '4px',
  cursor: 'pointer',
}

const resultCard: CSSProperties = {
  borderBottom: '1px solid #ccb48a',
  padding: '12px 0',
}

const resultHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '6px',
}

const positionStyle: CSSProperties = {
  fontWeight: 700,
}

const resultMeta: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
  flexWrap: 'wrap',
}

const classStyle: CSSProperties = {
  opacity: 0.85,
  fontWeight: 500,
}

const classRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  fontSize: '15px',
  marginBottom: '6px',
}

const dashStyle: CSSProperties = {
  opacity: 0.6,
}

const podiumInline: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

const podiumRow: CSSProperties = {
  display: 'flex',
  gap: '16px',
  fontSize: '14px',
  flexWrap: 'wrap',
}

const resultDayCard: CSSProperties = {
  background: '#f5eddc',
  border: '1px solid rgba(115, 88, 52, 0.22)',
  borderRadius: 16,
  padding: 18,
  boxShadow: '0 8px 24px rgba(60, 40, 20, 0.06)',
  marginBottom: 18,
}

const resultDate: CSSProperties = {
  margin: '0 0 14px',
  fontSize: 22,
  color: '#2f2419',
}

const resultList: CSSProperties = {
  display: 'grid',
  gap: 10,
}

const resultGridHeader: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '180px repeat(3, 1fr)',
  gap: '10px',
  fontSize: 12,
  opacity: 0.6,
  marginBottom: 6,
  paddingBottom: 6,
  borderBottom: '1px solid rgba(0,0,0,0.2)',
}

const resultGridRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '180px repeat(3, 1fr)',
  gap: '10px',
  alignItems: 'center',
  padding: '6px 0',
  borderTop: '1px solid rgba(0,0,0,0.1)',
}

const driverLinkStyle: CSSProperties = {
  textDecoration: 'none',
  color: '#5a3a1b',
  fontWeight: 500,
}