// app/drivers/page.tsx

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
    const { data, error: photoError } = await supabase
      .from('photos')
      .select('driver_slug,file_name,year,photographer_slug,credit_type,track_slug,sequence')
      .in('driver_slug', chunk)
      .neq('credit_type', 'unknown')
      .order('year', { ascending: false, nullsFirst: false })
      .order('sequence', { ascending: true })
      .order('file_name', { ascending: true })

    if (photoError) console.log('Driver photo query error:', JSON.stringify(photoError, null, 2))
    if (data) driverPhotos = [...driverPhotos, ...data]
  }

  const driverPhotoMap = new Map<string, any>()
  for (const photo of driverPhotos || []) {
    if (!photo.driver_slug) continue
    const existing = driverPhotoMap.get(photo.driver_slug)
    if (!existing) {
      driverPhotoMap.set(photo.driver_slug, photo)
      continue
    }
    const existingKnown = existing.year && existing.year !== 'unknown-year'
    const currentKnown = photo.year && photo.year !== 'unknown-year'
    if (!existingKnown && currentKnown) {
      driverPhotoMap.set(photo.driver_slug, photo)
    }
  }

  const galleryPhoto =
    driverPhotos && driverPhotos.length > 0
      ? driverPhotos[Math.floor(Math.random() * driverPhotos.length)]
      : null

  // PATH CONSTRUCTION FOR THE PUBLIC BUCKET MEDIA DIRECTORY
  const getCDNUrl = (photoObj: any) => {
    const track = photoObj.track_slug || 'unknown-track'
    const yr = photoObj.year || 'unknown-year'
    return `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${track}/${yr}/${photoObj.file_name}`
  }

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroSplit}>
          <div style={heroLeft}>
            <div style={eyebrow}>Museum Collection</div>
            <h1 style={pageTitle}>Drivers</h1>
            <p style={pageIntro}>
              Browse driver profiles, recorded wins, top 3 finishes, and historical race results
              from across the Upper Midwest.
            </p>

            <form action="/drivers" method="get" style={searchForm}>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search drivers"
                style={searchInput}
              />
              <button type="submit" style={searchButton}>
                Search
              </button>
            </form>

            <div style={alphabetBar}>
              <Link href="/drivers" style={letterLink}>
                All
              </Link>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
                <Link
                  key={l}
                  href={`/drivers?letter=${l}`}
                  style={{
                    ...letterLink,
                    fontWeight: letter === l ? 'bold' : 'normal',
                    textDecoration: letter === l ? 'underline' : 'none',
                  }}
                >
                  {l}
                </Link>
              ))}
            </div>

            <div style={resultsLine}>
              {letter ? (
                <>Showing drivers with last names starting with <strong>{letter}</strong></>
              ) : query ? (
                <>Showing results for <strong>{query}</strong></></>
              ) : (
                <>Showing driver directory</>
              )}
            </div>
          </div>

          <div style={heroGallery}>
            {galleryPhoto ? (
              <>
                <img
                  src={getCDNUrl(galleryPhoto)}
                  alt="Vintage racing archive"
                  style={heroGalleryPhoto}
                />
                <div style={heroGalleryCaption}>From the Museum Archive</div>
              </>
            ) : (
              <div style={heroGalleryPlaceholder}>Midwest Racing Archive</div>
            )}
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        {error ? (
          <div style={errorBox}>Unable to load drivers right now.</div>
        ) : !drivers || filteredDrivers.length === 0 ? (
          <div style={emptyBox}>No drivers found.</div>
        ) : (
          <div style={grid}>
            {filteredDrivers.map((driver) => {
              const driverPhoto = driverPhotoMap.get(driver.driver_slug)
              return (
                <Link
                  key={driver.driver_slug}
                  href={`/drivers/${driver.driver_slug}`}
                  style={cardLink}
                >
                  <article style={card}>
                    <div style={cardInner}>
                      {driverPhoto ? (
                        <>
                          <img
                            src={getCDNUrl(driverPhoto)}
                            alt={driver.driver_name}
                            style={cardPhoto}
                          />
                          <div style={cardPhotoCaption}>
                            {driverPhoto.year || 'Year Unknown'} •{' '}
                            {formatSlugName(driverPhoto.photographer_slug)}{' '}
                            {getCreditLabel(driverPhoto.credit_type)}
                          </div>
                        </>
                      ) : (
                        <div style={driverSignaturePlaceholder}>
                          <div style={driverSignatureName}>{driver.driver_name}</div>
                        </div>
                      )}

                      <h2 style={driverName}>{driver.driver_name}</h2>
                      <p style={metaLine}>
                        {driver.hometown || 'Unknown hometown'}
                        {driver.state ? `, ${driver.state}` : ''}
                      </p>

                      <div style={statTable}>
                        <div style={statRow}>
                          <span>Recorded Feature Wins</span>
                          <strong>{driver.recorded_wins ?? 0}</strong>
                        </div>
                        <div style={statRow}>
                          <span>Wisconsin Feature Wins</span>
                          <strong>{driver.wisconsin_feature_wins ?? 0}</strong>
                        </div>
                        <div style={statRow}>
                          <span>Recorded Top-3 Finishes</span>
                          <strong>{driver.recorded_top_3_finishes ?? 0}</strong>
                        </div>
                        <div style={{ ...statRow, borderBottom: 'none' }}>
                          <span>Recorded Results</span>
                          <strong>{driver.recorded_results ?? 0}</strong>
                        </div>
                      </div>
                      <div style={cardButton}>View Profile</div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

function formatSlugName(value: string | null) {
  if (!value || ['unknown', 'unknown-driver', 'unknown-track', 'unknown-credit'].includes(value)) {
    return 'Unknown'
  }
  return value.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function getCreditLabel(type: string | null) {
  switch (type) {
    case 'post': return 'Post'
    case 'program': return 'Program'
    case 'flyer': return 'Flyer'
    case 'photo': return 'Photo'
    default: return 'Credit'
  }
}

// ORIGINAL HIGH-FIDELITY LAYOUT STYLING
const pageStyle: CSSProperties = { backgroundColor: '#fbfbfd', minHeight: '100vh', paddingBottom: '4rem' }
const heroSection: CSSProperties = { backgroundColor: '#1a1a1a', color: '#ffffff', padding: '4rem 2rem', borderBottom: '4px solid #cf2e2e' }
const heroSplit: CSSProperties = { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }
const heroLeft: CSSProperties = { display: 'flex', flexDirection: 'column' }
const eyebrow: CSSProperties = { color: '#cf2e2e', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '0.5rem' }
const pageTitle: CSSProperties = { fontSize: '3rem', margin: '0 0 1rem 0', fontFamily: 'serif' }
const pageIntro: CSSProperties = { fontSize: '1.1rem', color: '#cccccc', margin: '0 0 2rem 0', lineHeight: '1.6' }
const searchForm: CSSProperties = { display: 'flex', gap: '0.5rem', marginBottom: '2rem' }
const searchInput: CSSProperties = { flex: 1, padding: '0.75rem 1rem', fontSize: '1rem', border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#fff', borderRadius: '4px' }
const searchButton: CSSProperties = { padding: '0.75rem 1.5rem', backgroundColor: '#cf2e2e', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }
const alphabetBar: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }
const letterLink: CSSProperties = { color: '#aaa', textDecoration: 'none', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }
const resultsLine: CSSProperties = { color: '#888', fontSize: '0.9rem' }
const heroGallery: CSSProperties = { position: 'relative', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', backgroundColor: '#2a2a2a', height: '350px' }
const heroGalleryPhoto: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' }
const heroGalleryCaption: CSSProperties = { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff', fontSize: '0.85rem' }
const heroGalleryPlaceholder: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontStyle: 'italic' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '3rem auto 0 auto', padding: '0 2rem' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }
const cardLink: CSSProperties = { textDecoration: 'none', color: 'inherit' }
const card: CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e1e4e6', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', height: '100%', display: 'flex', flexDirection: 'column' }
const cardInner: CSSProperties = { padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }
const cardPhoto: CSSProperties = { width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }
const cardPhotoCaption: CSSProperties = { fontSize: '0.75rem', color: '#777', marginTop: '0.5rem', fontStyle: 'italic' }
const driverSignaturePlaceholder: CSSProperties = { height: '200px', backgroundColor: '#f0f2f5', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed #cbd5e1' }
const driverSignatureName: CSSProperties = { fontFamily: 'cursive', fontSize: '1.5rem', color: '#475569', opacity: 0.6, textAlign: 'center', padding: '0 1rem' }
const driverName: CSSProperties = { fontSize: '1.35rem', margin: '1rem 0 0.25rem 0', color: '#1a1a1a', fontFamily: 'serif' }
const metaLine: CSSProperties = { fontSize: '0.85rem', color: '#666', margin: '0 0 1.25rem 0' }
const statTable: CSSProperties = { backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '0.75rem', marginBottom: '1.5rem', marginTop: 'auto' }
const statRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0', borderBottom: '1px solid #edf0f2', color: '#444' }
const cardButton: CSSProperties = { textAlign: 'center', padding: '0.65rem', backgroundColor: '#f1f3f5', color: '#1a1a1a', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }
const errorBox: CSSProperties = { padding: '2rem', backgroundColor: '#fff5f5', color: '#c92a2a', borderRadius: '6px', textAlign: 'center' }
const emptyBox: CSSProperties = { padding: '4rem', textAlign: 'center', color: '#666', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e1e4e6' }