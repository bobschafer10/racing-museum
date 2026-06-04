import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export default async function PhotographersPage() {
  const { data, error } = await supabase
  .from('photographer_directory_view')
  .select('photographer_slug, photographer_name, total_items, photo_count, post_count')
  .order('total_items', { ascending: false })

const { data: samplePhotos } = await supabase
  .from('photos')
  .select('photographer_slug, file_name, credit_type, year')
  .neq('credit_type', 'unknown')
  .not('photographer_slug', 'is', null)
  .order('sequence', { ascending: true })
  .order('year', { ascending: false, nullsFirst: false })
  .limit(5000)

const samplePhotoMap = new Map<string, any>()

for (const photo of samplePhotos || []) {
  if (!photo.photographer_slug || samplePhotoMap.has(photo.photographer_slug)) continue
  samplePhotoMap.set(photo.photographer_slug, photo)
}

  if (error) {
    return <div style={{ padding: '40px' }}>Error loading photographers</div>
  }

  // Group + count
 const photographers = (data || [])
  .filter((p) => {
    const slug = p.photographer_slug

    return (
      slug &&
      !slug.includes('#') &&
      !/^\d/.test(slug) &&
      slug.length >= 3 &&
      ![
        'unknown',
        'unknown-credit',
        'unknown-photographer',
        'photo',
      ].includes(slug)
    )
  })
  .map((p) => ({
  slug: p.photographer_slug,
  name: p.photographer_name || formatSlugName(p.photographer_slug),
  total: Number(p.total_items ?? 0),
  photos: Number(p.photo_count ?? 0),
  posts: Number(p.post_count ?? 0),
  samplePhoto: samplePhotoMap.get(p.photographer_slug),
}))

const topContributors = photographers.slice(0, 20)

const fullDirectory = [...photographers].sort((a, b) =>
  a.name.localeCompare(b.name)
)


  return (
    <main style={pageStyle}>
      <div style={{ ...container, position: 'relative' }}>
        <div style={titleRow}>
  <h1 style={title}>Photographers & Sources</h1>

  <img
  src="/images/camera-accent.jpg"
  alt="Camera"
  style={cameraImage}
/>
</div>

        <p style={subtitle}>
          Historic racing images captured by photographers and contributors across the Upper Midwest.
        </p>

        <h2 style={sectionTitle}>Top Contributors</h2>

<div style={grid}>
  {topContributors.map((p) => (
    <div key={p.slug} style={card}>
      <div style={cardInner}>
        <div style={contributorRow}>
  {p.samplePhoto ? (
    <img
      src={`/photos/${p.samplePhoto.file_name}`}
      alt={p.name}
      style={contributorThumb}
    />
  ) : (
    <div style={contributorThumbFallback}>No Image</div>
  )}

  <div>
    <div style={scriptName}>{p.name}</div>
    <h3 style={name}>{p.name}</h3>

    <div style={meta}>
      {p.total.toLocaleString()} archive items
    </div>

    <div style={metaSmall}>
      Photos: {p.photos.toLocaleString()} | Posts: {p.posts.toLocaleString()}
    </div>

    <Link href={`/photos?photographer=${p.slug}`} style={button}>
      View Collection
    </Link>
  </div>
</div>
      </div>
    </div>
  ))}
</div>

<h2 style={sectionTitle}>Full Photographers & Sources Directory</h2>

<div style={grid}>
  {fullDirectory.map((p) => (
    <div key={p.slug} style={card}>
      <div style={cardInner}>
        <div style={contributorRow}>
  {p.samplePhoto ? (
    <img
      src={`/photos/${p.samplePhoto.file_name}`}
      alt={p.name}
      style={contributorThumb}
    />
  ) : (
    <div style={contributorThumbFallback}>No Image</div>
  )}

  <div>
    <div style={scriptName}>{p.name}</div>
    <h3 style={name}>{p.name}</h3>

    <div style={meta}>
      {p.total.toLocaleString()} archive items
    </div>

    <div style={metaSmall}>
      Photos: {p.photos.toLocaleString()} | Posts: {p.posts.toLocaleString()}
    </div>

    <Link href={`/photos?photographer=${p.slug}`} style={button}>
      View Collection
    </Link>
  </div>
</div>
      </div>
    </div>
  ))}
</div>

      </div>
    </main>
  )
}

function formatSlugName(value: string) {
  return value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  minHeight: '100vh',
  color: '#2f2417',
  fontFamily: 'Georgia, serif',
}

const container: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '40px 20px',
}

const title: CSSProperties = {
  fontSize: '42px',
  marginBottom: '10px',
}

const subtitle: CSSProperties = {
  fontSize: '18px',
  marginBottom: '30px',
}

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px',
}

const card: CSSProperties = {
  background: '#dcc7a1',
  border: '2px solid #b29364',
  padding: '10px',
}

const cardInner: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
}

const name: CSSProperties = {
  fontSize: '24px',
  marginBottom: '8px',
}

const meta: CSSProperties = {
  fontSize: '16px',
  marginBottom: '6px',
}

const sectionTitle: CSSProperties = {
  fontSize: '30px',
  margin: '34px 0 16px',
  color: '#3d2b16',
}

const metaSmall: CSSProperties = {
  fontSize: '14px',
  marginBottom: '12px',
}

const contributorRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '110px 1fr',
  gap: '14px',
  alignItems: 'center',
}

const titleRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const cameraIcon: CSSProperties = {
  width: '60px',
  height: '60px',
  opacity: 0.8,
  filter: 'sepia(60%) contrast(90%)',
  transform: 'rotate(-5deg)',
}
const contributorThumb: CSSProperties = {
  width: '110px',
  height: '90px',
  objectFit: 'cover',
  border: '1px solid #b29364',
  background: '#d8c39d',
}

const contributorThumbFallback: CSSProperties = {
  width: '110px',
  height: '90px',
  border: '1px solid #b29364',
  background: '#d8c39d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  color: '#5b472f',
}

const cameraImage: CSSProperties = {
  position: 'absolute',
  top: '40px',
  right: '70px',
  width: '240px',
  transform: 'rotate(3deg)',
  border: '3px solid #a8895a',
  padding: '6px',
  background: '#e6d3b1',
  boxShadow: '0px 8px 12px rgba(0,0,0,0.18)',
  filter: 'sepia(70%) contrast(95%)',
}

const scriptName: CSSProperties = {
  fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
  fontSize: '24px',
  color: '#6a4a1f',
  transform: 'rotate(-2deg)',
  marginBottom: '2px',
  opacity: 0.85,
}

const button: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '8px 12px',
  textDecoration: 'none',
  border: '1px solid #5d3f17',
}