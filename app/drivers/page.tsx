import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export default async function DriversPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; letter?: string }>
}) {
  const params = (await searchParams) ?? {}
  const query = (params.q ?? '').trim()
  const letter = (params.letter ?? '').toUpperCase()

  let supabaseQuery = supabase
    .from('driver_directory_alpha_view')
    .select('*')
    .not('driver_name', 'ilike', '%rainout%')
    .not('driver_name', 'ilike', '%unknown%')
    .not('driver_name', 'ilike', '%no name%')
    .order('driver_name', { ascending: true })
    .limit(100000)

  if (query) supabaseQuery = supabaseQuery.ilike('driver_name', `%${query}%`)
  if (letter) supabaseQuery = supabaseQuery.eq('last_initial', letter)

  const { data: drivers, error } = await supabaseQuery

  const getLast = (name: string) => {
    if (!name) return ''
    const clean = name.replace(/^\.\.\.\s*/, '').trim()
    const parts = clean.split(' ')
    return parts[parts.length - 1].toLowerCase()
  }

  const sortedDrivers = [...(drivers || [])].sort((a, b) => {
    const lastCompare = getLast(a.driver_name).localeCompare(getLast(b.driver_name))
    if (lastCompare !== 0) return lastCompare
    return a.driver_name.localeCompare(b.driver_name)
  })

  const filteredDrivers = letter
    ? sortedDrivers.filter((d) => getLast(d.driver_name).startsWith(letter.toLowerCase()))
    : sortedDrivers

  const driverSlugs = filteredDrivers?.map((d) => d.driver_slug).filter(Boolean) ?? []

  let driverPhotos: any[] = []
  for (let i = 0; i < driverSlugs.length; i += 300) {
    const chunk = driverSlugs.slice(i, i + 300)
    const { data } = await supabase
      .from('photos')
      .select('driver_slug,file_name,year,photographer_slug,credit_type,track_slug,sequence')
      .in('driver_slug', chunk)
      .neq('credit_type', 'unknown')
      .order('year', { ascending: false, nullsFirst: false })
      .order('sequence', { ascending: true })
      .order('file_name', { ascending: true })
    if (data) driverPhotos = [...driverPhotos, ...data]
  }

  const driverPhotoMap = new Map<string, any>()
  for (const photo of driverPhotos || []) {
    if (!photo.driver_slug || driverPhotoMap.has(photo.driver_slug)) continue
    driverPhotoMap.set(photo.driver_slug, photo)
  }

  const buildUrl = (p: any) => 
    `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${p.track_slug || 'unknown-track'}/${p.year || 'unknown-year'}/${p.file_name}`

  return (
    <main style={pageStyle}>
      <section style={contentWrap}>
        <div style={grid}>
          {filteredDrivers.map((driver) => {
            const p = driverPhotoMap.get(driver.driver_slug)
            return (
              <Link key={driver.driver_slug} href={`/drivers/${driver.driver_slug}`} style={cardLink}>
                <article style={card}>
                  <div style={cardInner}>
                    {p ? (
                      <img 
  src={`https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${p.track_slug || 'unknown-track'}/${p.year || 'unknown-year'}/${p.file_name}`} 
  alt={driver.driver_name} 
  style={cardPhoto} 
/>
                    ) : (
                      <div style={driverSignaturePlaceholder}><div style={driverSignatureName}>{driver.driver_name}</div></div>
                    )}
                    <h2 style={driverName}>{driver.driver_name}</h2>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}

// STYLES REQUIRED FOR BUILD
const pageStyle: CSSProperties = { padding: '2rem' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }
const cardLink: CSSProperties = { textDecoration: 'none' }
const card: CSSProperties = { border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }
const cardInner: CSSProperties = { padding: '1rem' }
const cardPhoto: CSSProperties = { width: '100%', height: '200px', objectFit: 'cover' }
const driverName: CSSProperties = { fontSize: '1rem', marginTop: '0.5rem' }
const driverSignaturePlaceholder: CSSProperties = { width: '100%', height: '200px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const driverSignatureName: CSSProperties = { textAlign: 'center', padding: '1rem' }