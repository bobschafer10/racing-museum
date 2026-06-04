import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

type Driver = {
  driver_name: string
  driver_slug?: string
  hometown: string | null
  state: string | null
}

type Photo = {
  photo_id: string | number
  file_name: string
  year: number | null
  photographer_slug: string | null
  credit_type: string | null
  sequence: number | null
}

type FullResultRow = {
  race_id: number
  race_date: string
  track_name: string
  track_slug: string
  track_state: string | null
  class_name: string | null
  finishing_position: number
  first_place_driver: string | null
  second_place_driver: string | null
  third_place_driver: string | null
  first_place_driver_slug: string | null
  second_place_driver_slug: string | null
  third_place_driver_slug: string | null
}
export default async function DriverResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    year?: string
    finish?: string
    state?: string
  }>
}) {
  const { slug } = await params
  const { year, finish, state } = await searchParams

  const { data: driver } = await supabase
    .from('driver_directory_view')
    .select('driver_name, driver_slug, hometown, state')
    .eq('driver_slug', slug)
    .single<Driver>()

  if (!driver) {
    notFound()
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('driver_slug', slug)
    .order('year', { ascending: true, nullsFirst: false })
    .order('sequence', { ascending: true })
    .returns<Photo[]>()

  let resultsQuery = supabase
  .from('driver_full_results_view')
  .select(`
    race_id,
    race_date,
    track_name,
    track_slug,
    class_name,
    finishing_position,
    first_place_driver,
    second_place_driver,
    third_place_driver,
    first_place_driver_slug,
    second_place_driver_slug,
    third_place_driver_slug
  `)
  .eq('driver_slug', slug)

if (year) {
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  resultsQuery = resultsQuery
    .gte('race_date', yearStart)
    .lte('race_date', yearEnd)
}

const { data: results } = await resultsQuery
  .order('race_date', { ascending: true })
  .returns<FullResultRow[]>()
    
const { data: allYearRows } = await supabase
  .from('driver_results_by_year_view')
  .select('result_year')
  .eq('driver_slug', slug)
  .order('result_year', { ascending: true })

const safeYearRows = allYearRows ?? []

const safePhotos = photos ?? []

let safeResults = results ?? []

if (finish === '1') {
  safeResults = safeResults.filter(
    (r) => Number(r.finishing_position) === 1
  )
}

if (state === 'WI') {
  safeResults = safeResults.filter((r) => r.track_slug.endsWith('-wi'))
}

const resultsTitle =
  finish === '1' && state === 'WI'
    ? 'Wisconsin Feature Wins by Date'
    : finish === '1'
      ? 'Recorded Feature Wins by Date'
      : year
        ? `Feature Results from ${year}`
        : 'Complete Feature Results by Date'

const heroPhotoItem =
  safePhotos.find((p) => p.year !== null) ?? safePhotos[0] ?? null

const groupedResults = safeResults.reduce((acc, result) => {
  const year = new Date(result.race_date).getFullYear()

  if (!acc[year]) acc[year] = []
  acc[year].push(result)

  return acc
}, {} as Record<number, typeof safeResults>)

Object.keys(groupedResults).forEach((year) => {
  groupedResults[Number(year)].sort((a, b) => {
    return new Date(a.race_date).getTime() - new Date(b.race_date).getTime()
  })
})

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>
              Home
            </Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/drivers" style={breadcrumbLink}>
              Drivers
            </Link>
            <span style={breadcrumbSep}>/</span>
            <Link href={`/drivers/${slug}`} style={breadcrumbLink}>
              {driver.driver_name}
            </Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>Full Results</span>
          </div>

          <div style={heroGrid}>
            <div style={photoPanel}>
              {!heroPhotoItem ? (
                <div style={photoPlaceholder}>Photo Coming Soon</div>
              ) : (
                <div>
                  <img
                    src={`/photos/${heroPhotoItem.file_name}`}
                    alt={driver.driver_name}
                    style={heroPhoto}
                  />
                  <div style={heroCaption}>
                    {buildPhotoCaption(heroPhotoItem)}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={eyebrow}>Driver Results Archive</div>
              <h1 style={driverName}>{driver.driver_name}</h1>

              <p style={locationLine}>
                {driver.hometown || 'Unknown hometown'}
                {driver.state ? `, ${driver.state}` : ''}
              </p>

              <p style={introText}>
                Complete feature results by date, with track, class, finishing
                position, and top feature finishers where available.
              </p>

              <div style={buttonRow}>
                <Link href={`/drivers/${slug}`} style={backButton}>
                  Back to Driver Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={resultsPanel}>
          <div style={panelHeader}>{resultsTitle}</div>
          <div style={panelBody}>
<div style={yearFilterWrap}>
  <span style={yearFilterLabel}>Filter by Year:</span>

  <Link
    href={`/drivers/${slug}/results`}
    style={year === undefined ? activeYearFilterLink : yearFilterLink}
  >
    All
  </Link>

  {safeYearRows.map((row) => (
    <Link
      key={row.result_year}
      href={`/drivers/${slug}/results?year=${row.result_year}`}
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
  {finish === '1' && state === 'WI'
    ? 'Showing Wisconsin feature wins'
    : finish === '1'
      ? 'Showing recorded feature wins'
      : year
        ? `Showing results for ${year}`
        : 'Showing all years'}
</div>

            {safeResults.length === 0 ? (
  <p style={panelText}>No full results available yet.</p>
) : (
  <div>
    {Object.entries(groupedResults).map(([yearKey, results]) => (
  <details key={yearKey} open={year === String(yearKey) || year === undefined}>
    <summary style={yearHeader}>{yearKey}</summary>

    {results.map((r, i) => (
      <div key={`${r.race_id}-${i}`} style={resultCard}>
        <div style={resultHeader}>
          <span>{formatRaceDate(r.race_date)}</span>
          <span style={positionStyle}>P{r.finishing_position}</span>
        </div>

        <div style={resultMeta}>
          <img
            src={`/logos/tracks/${r.track_slug}.jpg`}
            alt={r.track_name}
            style={trackLogo}
          />
          <Link href={`/tracks/${r.track_slug}`} style={trackLink}>
            {r.track_name}
          </Link>
          <span style={classStyle}>
            {r.class_name || 'Unknown'}
          </span>
        </div>

        <div style={podiumRow}>
          {renderFinisher(
            1,
            r.first_place_driver,
            r.first_place_driver_slug,
            r.finishing_position
          )}
          {renderFinisher(
            2,
            r.second_place_driver,
            r.second_place_driver_slug,
            r.finishing_position
          )}
          {renderFinisher(
            3,
            r.third_place_driver,
            r.third_place_driver_slug,
            r.finishing_position
          )}
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
  slug: string | null,
  featuredPosition: number
) {
  if (!name) return null

  const isFeatured = position === featuredPosition

  return (
    <span>
      {position}.{' '}
      {slug ? (
        <Link
          href={`/drivers/${slug}`}
          style={{
            fontWeight: isFeatured ? 700 : 400,
            textDecoration: 'none',
            color: '#5a3a1b',
          }}
        >
          {name}
        </Link>
      ) : (
        <span style={{ fontWeight: isFeatured ? 700 : 400 }}>
          {name}
        </span>
      )}
    </span>
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

function buildPhotoCaption(photo: Photo) {
  return [
    photo.year || 'Year Unknown',
    `${formatName(photo.photographer_slug || 'Unknown')} ${formatCreditType(
      photo.credit_type
    )}`,
  ].join(' • ')
}

function formatName(name: string | null) {
  if (!name) return 'Unknown'

  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatCreditType(type: string | null) {
  if (!type || type.toLowerCase() === 'unknown') return 'Photo'
  return type.charAt(0).toUpperCase() + type.slice(1)
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

const heroGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '260px 1fr',
  gap: '28px',
  alignItems: 'start',
}

const photoPanel: CSSProperties = {
  background: '#dcc7a1',
  border: '2px solid #b29364',
  padding: '10px',
}

const photoPlaceholder: CSSProperties = {
  background: 'linear-gradient(to bottom, #d8c39d, #c7ab7c)',
  border: '1px solid #b29364',
  height: '280px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#5a3a1b',
  fontSize: '20px',
  textAlign: 'center',
  padding: '12px',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const driverName: CSSProperties = {
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
  gap: '8px',
  alignItems: 'center',
  marginBottom: '12px',
}

const yearFilterLabel: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#5a3a1b',
  marginRight: '4px',
}

const yearFilterLink: CSSProperties = {
  display: 'inline-block',
  padding: '4px 8px',
  border: '1px solid #b29364',
  background: '#efe4cd',
  color: '#5a3a1b',
  textDecoration: 'none',
  fontSize: '14px',
}

const activeYearFilterLink: CSSProperties = {
  display: 'inline-block',
  padding: '4px 8px',
  border: '1px solid #7a5827',
  background: '#d9c29a',
  color: '#3d2b16',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 700,
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

const yearHeader: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginTop: '16px',
  marginBottom: '6px',
  borderBottom: '1px solid #b29364',
  paddingBottom: '4px',
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

const trackLogo: CSSProperties = {
  width: '20px',
  height: '20px',
  objectFit: 'contain',
}

const trackLink: CSSProperties = {
  textDecoration: 'none',
  color: '#5a3a1b',
  fontWeight: 500,
}

const classStyle: CSSProperties = {
  marginLeft: '8px',
  opacity: 0.8,
}

const podiumRow: CSSProperties = {
  display: 'flex',
  gap: '16px',
  fontSize: '14px',
  flexWrap: 'wrap',
}

const heroPhoto: CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  border: '1px solid #b29364',
  background: '#efe7d6',
}

const heroCaption: CSSProperties = {
  marginTop: '8px',
  fontSize: '14px',
  color: '#5a3a1b',
  textAlign: 'center',
  lineHeight: 1.4,
}