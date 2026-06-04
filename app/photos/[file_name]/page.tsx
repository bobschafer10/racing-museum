import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ file_name: string }>
}) {
  const { file_name } = await params
  const decodedFileName = decodeURIComponent(file_name)

  const { data: photo } = await supabase
    .from('photos')
    .select('*')
    .eq('file_name', decodedFileName)
    .single()

  if (!photo) {
    return (
      <main style={pageWrap}>
        <Link href="/photos" style={backLink}>← Back to Photos</Link>
        <h1>Photo Not Found</h1>
      </main>
    )
  }

  return (
    <main style={pageWrap}>
      <Link href="/photos" style={backLink}>← Back to Photos</Link>

      <section style={detailPanel}>
        <div style={imageWrap}>
          <img
            src={`/photos/${photo.file_name}`}
            alt={formatSlugName(photo.driver_slug)}
            style={largeImage}
          />
        </div>

        <aside style={infoPanel}>
          <div style={eyebrow}>Photo Archive</div>

          <h1 style={title}>
            {formatSlugName(photo.driver_slug)}
          </h1>

          <div style={metaBlock}>
            <div style={label}>Year</div>
            <div>{photo.year || 'Year Unknown'}</div>
          </div>

          <div style={metaBlock}>
            <div style={label}>Driver</div>
            <Link href={`/photos?driver=${photo.driver_slug}`} style={metaLink}>
              {formatSlugName(photo.driver_slug)}
            </Link>
          </div>

          <div style={metaBlock}>
            <div style={label}>Track</div>
            <Link href={`/photos?track=${photo.track_slug}`} style={metaLink}>
              {formatSlugName(photo.track_slug)}
            </Link>
          </div>

          <div style={metaBlock}>
            <div style={label}>Photographer / Credit</div>
            <Link
              href={`/photos?photographer=${photo.photographer_slug}`}
              style={metaLink}
            >
              {formatCreditLine(photo.credit_type, photo.photographer_slug)}
            </Link>
          </div>

          <div style={metaBlock}>
            <div style={label}>File</div>
            <div style={fileName}>{photo.file_name}</div>
          </div>

          <div style={buttonRow}>
            <Link href="/photos" style={button}>
              Browse Photos
            </Link>

            {photo.driver_slug && (
              <Link href={`/photos?driver=${photo.driver_slug}`} style={buttonAlt}>
                More of This Driver
              </Link>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

function formatSlugName(value: string | null) {
  if (
    !value ||
    value === 'unknown' ||
    value === 'unknown-driver' ||
    value === 'unknown-track' ||
    value === 'unknown-credit' ||
    value === 'unknown-photographer'
  ) {
    return 'Unknown'
  }

  return value
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatCreditLine(type: string | null, photographer: string | null) {
  const name = formatSlugName(photographer)

  if (!type || type === 'photo') return `${name} Photo`
  if (type === 'post') return `${name} Post`

  return `${name} ${formatSlugName(type)}`
}

const pageWrap: CSSProperties = {
  maxWidth: '1320px',
  margin: '0 auto',
  padding: '34px 18px 60px',
  color: '#2f2417',
}

const backLink: CSSProperties = {
  display: 'inline-block',
  marginBottom: '18px',
  color: '#5b3a1b',
  textDecoration: 'none',
  fontWeight: 700,
}

const detailPanel: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.35fr) 420px',
  gap: '24px',
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '16px',
}

const imageWrap: CSSProperties = {
  background: '#efe7d6',
  border: '1px solid #c2a97d',
  padding: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const largeImage: CSSProperties = {
  width: '100%',
  maxHeight: '760px',
  objectFit: 'contain',
  display: 'block',
  border: '1px solid #b29364',
  background: '#d8c39d',
}

const infoPanel: CSSProperties = {
  background: '#efe7d6',
  border: '1px solid #c2a97d',
  padding: '24px',
}

const eyebrow: CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  fontSize: '12px',
  color: '#7a6348',
  marginBottom: '10px',
}

const title: CSSProperties = {
  fontSize: '42px',
  lineHeight: 1.05,
  margin: '0 0 24px',
}

const metaBlock: CSSProperties = {
  borderTop: '1px solid #c2a97d',
  padding: '14px 0',
  fontSize: '17px',
  lineHeight: 1.4,
}

const label: CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#7a6348',
  marginBottom: '5px',
}

const metaLink: CSSProperties = {
  color: '#2f2417',
  textDecoration: 'none',
  borderBottom: '1px dotted #7a5827',
  fontWeight: 700,
}

const fileName: CSSProperties = {
  fontSize: '13px',
  wordBreak: 'break-word',
  color: '#5b3a1b',
}

const buttonRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginTop: '18px',
}

const button: CSSProperties = {
  background: '#7a5827',
  color: '#fff8ea',
  border: '1px solid #5d3f17',
  padding: '10px 14px',
  textDecoration: 'none',
}

const buttonAlt: CSSProperties = {
  background: '#efe7d6',
  color: '#5b3a1b',
  border: '1px solid #b29364',
  padding: '10px 14px',
  textDecoration: 'none',
}