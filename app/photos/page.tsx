import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { getPhotoUrl } from '@/lib/photos'

export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  driver?: string
  photographer?: string
  track?: string
  year?: string
  credit?: string
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  let query = supabase
    .from('photos')
    .select('*')
    .order('year', { ascending: false, nullsFirst: false })
    .order('file_name', { ascending: true })
    .limit(500)

  if (params.driver) query = query.eq('driver_slug', params.driver)
  if (params.photographer) query = query.eq('photographer_slug', params.photographer)
  if (params.track) query = query.eq('track_slug', params.track)
  if (params.year) query = query.eq('year', params.year)
  if (params.credit) query = query.eq('credit_type', params.credit)

  if (params.q) {
    query = query.or(
      `file_name.ilike.%${params.q}%,driver_slug.ilike.%${params.q}%,photographer_slug.ilike.%${params.q}%,track_slug.ilike.%${params.q}%`
    )
  }

  const { data: photos } = await query

  const { data: filterRows } = await supabase
    .from('photos')
    .select('driver_slug, photographer_slug, track_slug, year, credit_type')
    .limit(5000)

  const drivers = uniqueClean(filterRows?.map((p) => p.driver_slug))
  const photographers = uniqueClean(filterRows?.map((p) => p.photographer_slug))
  const tracks = uniqueClean(filterRows?.map((p) => p.track_slug))
  const years = uniqueClean(filterRows?.map((p) => p.year)).sort((a, b) => Number(b) - Number(a))
  const credits = uniqueClean(filterRows?.map((p) => p.credit_type))

  const hasFilters =
    params.q || params.driver || params.photographer || params.track || params.year || params.credit

  return (
    <main style={pageWrap}>
      <section style={heroBox}>
        <div style={breadcrumb}>
          <Link href="/" style={crumbLink}>Home</Link> / Photos
        </div>

        <div style={eyebrow}>Photo Archive</div>
        <h1 style={title}>Photos</h1>

        <p style={intro}>
          Browse the growing photo archive from tracks, drivers, photographers, and racing history across the Upper Midwest.
        </p>
      </section>

      <section style={filterPanel}>
        <form action="/photos" style={filterGrid}>
          <input
            name="q"
            defaultValue={params.q || ''}
            placeholder="Search photos..."
            style={inputStyle}
          />

          <select name="driver" defaultValue={params.driver || ''} style={inputStyle}>
            <option value="">All Drivers</option>
            {drivers.map((driver) => (
              <option key={driver} value={driver}>
                {formatSlugName(driver)}
              </option>
            ))}
          </select>

          <select name="photographer" defaultValue={params.photographer || ''} style={inputStyle}>
            <option value="">All Photographers</option>
            {photographers.map((photographer) => (
              <option key={photographer} value={photographer}>
                {formatSlugName(photographer)}
              </option>
            ))}
          </select>

          <select name="track" defaultValue={params.track || ''} style={inputStyle}>
            <option value="">All Tracks</option>
            {tracks.map((track) => (
              <option key={track} value={track}>
                {formatSlugName(track)}
              </option>
            ))}
          </select>

          <select name="year" defaultValue={params.year || ''} style={inputStyle}>
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select name="credit" defaultValue={params.credit || ''} style={inputStyle}>
            <option value="">All Types</option>
            {credits.map((credit) => (
              <option key={credit} value={credit}>
                {formatSlugName(credit)}
              </option>
            ))}
          </select>

          <button type="submit" style={buttonStyle}>
            Apply Filters
          </button>

          {hasFilters && (
            <Link href="/photos" style={clearButton}>
              Clear
            </Link>
          )}
        </form>
      </section>

      <div style={resultLine}>
        Showing {photos?.length || 0} photos
      </div>

     <section style={photoGrid}>
  {(photos || []).map((photo) => (
    <article key={photo.id || photo.file_name} style={photoCard}>
      <Link href={`/photo/${encodeURIComponent(photo.file_name)}`}>
        <img
  src={getPhotoUrl(
    `photos/master/${photo.track_slug}/${photo.year || 'unknown-year'}/${photo.file_name}`
  )}
  alt={formatSlugName(photo.driver_slug)}
  style={photoImage}
/>
      </Link>

      <div style={photoBody}>
        <h3 style={photoTitle}>
          <Link href={`/photos?driver=${photo.driver_slug}`} style={linkStyle}>
            {formatSlugName(photo.driver_slug)}
          </Link>
        </h3>

        <div style={photoMeta}>
          {photo.year || 'Year Unknown'}
        </div>

        <div style={photoMeta}>
          <Link
            href={`/photos?photographer=${photo.photographer_slug}`}
            style={linkStyle}
          >
            {formatCreditType(photo.credit_type, photo.photographer_slug)}
          </Link>
        </div>

        <div style={photoTrack}>
          <Link href={`/photos?track=${photo.track_slug}`} style={linkStyle}>
            {formatSlugName(photo.track_slug)}
          </Link>
        </div>
      </div>
    </article>
  ))}
</section>
    </main>
  )
}

function uniqueClean(values: any[] | undefined) {
  return Array.from(
    new Set(
      (values || [])
        .filter(Boolean)
        .map((v) => String(v))
        .filter((v) =>
          ![
            'unknown',
            'unknown-driver',
            'unknown-track',
            'unknown-photographer',
            'unknown-credit',
            'year-unknown',
            'unknown-year',
          ].includes(v)
        )
    )
  ).sort()
}

function formatSlugName(value: string | null) {
  if (!value) return 'Unknown'

  return value
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatCreditType(
  value: string | null,
  photographer: string | null
) {
  const name = formatSlugName(photographer)

  if (!value || value === 'photo') return `${name} Photo`
  if (value === 'post') return `${name} Post`

  return `${name} ${formatSlugName(value)}`
}

const pageWrap: CSSProperties = {
  maxWidth: '1320px',
  margin: '0 auto',
  padding: '36px 18px 60px',
  color: '#2f2417',
}

const heroBox: CSSProperties = {
  background: '#efe7d6',
  border: '1px solid #c9b88e',
  borderRadius: '18px',
  padding: '28px',
  marginBottom: '28px',
  boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
}

const breadcrumb: CSSProperties = {
  fontSize: '14px',
  marginBottom: '18px',
}

const crumbLink: CSSProperties = {
  color: '#5b3a1b',
  textDecoration: 'none',
}

const eyebrow: CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  fontSize: '12px',
  color: '#7a6348',
  marginBottom: '10px',
}

const title: CSSProperties = {
  fontSize: '54px',
  margin: '0 0 18px',
}

const intro: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.6,
  margin: 0,
}

const filterPanel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '16px',
  marginBottom: '24px',
}

const filterGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))',
  gap: '12px',
  alignItems: 'center',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #b29364',
  background: '#fff8ea',
  color: '#2f2417',
  fontSize: '15px',
  fontFamily: 'Georgia, serif',
}

const buttonStyle: CSSProperties = {
  background: '#7a5827',
  color: '#fff8ea',
  border: '1px solid #5d3f17',
  padding: '10px 14px',
  fontSize: '15px',
  fontFamily: 'Georgia, serif',
  cursor: 'pointer',
}

const clearButton: CSSProperties = {
  display: 'inline-block',
  textAlign: 'center',
  background: '#efe7d6',
  color: '#5b3a1b',
  border: '1px solid #b29364',
  padding: '10px 14px',
  textDecoration: 'none',
}

const resultLine: CSSProperties = {
  fontWeight: 700,
  marginBottom: '16px',
}

const photoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '18px',
}

const photoCard: CSSProperties = {
  background: '#efe7d6',
  border: '1px solid #c9b88e',
  borderRadius: '14px',
  padding: '12px',
  overflow: 'hidden',
}

const photoImage: CSSProperties = {
  width: '100%',
  aspectRatio: '4/3',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid #b29364',
  borderRadius: '8px',
  marginBottom: '10px',
}

const linkStyle: CSSProperties = {
  color: '#2f2417',
  textDecoration: 'none',
  borderBottom: '1px dotted #7a5827',
}

const photoBody: CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.45,
}

const photoTitle: CSSProperties = {
  fontSize: '18px',
  margin: '0 0 4px',
}

const photoMeta: CSSProperties = {
  color: '#3d2b16',
}

const photoTrack: CSSProperties = {
  marginTop: '6px',
  color: '#7a5827',
  fontWeight: 700,
}