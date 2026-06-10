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

  let drivers: any[] = []
  let error = false

  try {
    let supabaseQuery = supabase
      .from('driver_directory_alpha_view')
      .select('*')
      .not('driver_name', 'ilike', '%rainout%')
      .not('driver_name', 'ilike', '%unknown%')
      .not('driver_name', 'ilike', '%no name%')
      .order('driver_name', { ascending: true })
      .limit(1000)

    if (query) supabaseQuery = supabaseQuery.ilike('driver_name', `%${query}%`)
   // Letter filtering happens after last-name sorting below.
// Do not filter in Supabase because last_initial may not exist on the view.

    const { data: driversData, error: fetchError } = await supabaseQuery
    if (fetchError) throw fetchError
    drivers = driversData || []
  } catch (e) {
    console.error('Driver fetch error:', e)
    error = true
  }

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

  try {
    if (driverSlugs.length > 0 && !error) {
      const maxSlugs = driverSlugs.slice(0, 300) 
      const { data, error: photoError } = await supabase
        .from('photos')
        .select('driver_slug,file_name,year,photographer_slug,credit_type,track_slug,sequence')
        .in('driver_slug', maxSlugs)
        .neq('credit_type', 'unknown')
        .order('year', { ascending: false, nullsFirst: false })

      if (!photoError && data) {
        driverPhotos = data
      }
    }
  } catch (photoEx) {
    console.error('Photo mapping failed:', photoEx)
  }

  const driverPhotoMap = new Map<string, any>()
  for (const photo of driverPhotos || []) {
    if (!photo.driver_slug) continue
    if (!driverPhotoMap.has(photo.driver_slug)) {
      driverPhotoMap.set(photo.driver_slug, photo)
    }
  }

  const galleryPhoto =
    driverPhotos && driverPhotos.length > 0
      ? driverPhotos[Math.floor(Math.random() * driverPhotos.length)]
      : null

  const buildUrl = (photoObj: any) => {
    if (!photoObj || !photoObj.file_name) return ''
    const track = photoObj.track_slug || 'unknown-track'
    const yr = photoObj.year || 'unknown-year'
    return `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master/${track}/${yr}/${photoObj.file_name}`
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
                placeholder="Search drivers..."
                style={searchInput}
              />
              <button type="submit" style={searchButton}>
                Search
              </button>
            </form>

            <div style={alphabetBar}>
              <Link href="/drivers" style={letterLink}>All</Link>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
                <Link
                  key={l}
                  href={`/drivers?letter=${l}`}
                  style={{
                    ...letterLink,
                    color: letter === l ? '#cf2e2e' : '#aaa',
                    fontWeight: letter === l ? 'bold' : 'normal',
                    borderBottom: letter === l ? '2px solid #cf2e2e' : 'none',
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
                <>Showing results for <strong>{query}</strong></>
              ) : (
                <>Showing driver directory</>
              )}
            </div>
          </div>

          <div style={heroGallery}>
            {galleryPhoto && galleryPhoto.file_name ? (
              <>
                <img src={buildUrl(galleryPhoto)} alt="Vintage racing archive" style={heroGalleryPhoto} />
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
        ) : filteredDrivers.length === 0 ? (
          <div style={emptyBox}>No drivers found.</div>
        ) : (
          <div style={grid}>
            {filteredDrivers.map((driver) => {
              const p = driverPhotoMap.get(driver.driver_slug)
              return (
                <Link key={driver.driver_slug} href={`/drivers/${driver.driver_slug}`} style={cardLink}>
                  <article style={card}>
                    <div style={cardInner}>
                      {p && p.file_name ? (
                        <div style={cardImageWrapper}>
                          <img src={buildUrl(p)} alt={driver.driver_name} style={cardPhoto} />
                          <div style={cardPhotoCaption}>
                            {p.year || 'Year Unknown'} • {formatSlugName(p.photographer_slug)} {getCreditLabel(p.credit_type)}
                          </div>
                        </div>
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
                          <strong style={statBadge}>{driver.recorded_wins ?? 0}</strong>
                        </div>
                        <div style={statRow}>
                          <span>Wisconsin Feature Wins</span>
                          <strong style={statBadge}>{driver.wisconsin_feature_wins ?? 0}</strong>
                        </div>
                        <div style={statRow}>
                          <span>Recorded Top-3 Finishes</span>
                          <strong style={statBadge}>{driver.recorded_top_3_finishes ?? 0}</strong>
                        </div>
                        <div style={{ ...statRow, borderBottom: 'none' }}>
                          <span>Recorded Results</span>
                          <strong style={statBadge}>{driver.recorded_results ?? 0}</strong>
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
  if (!value || ['unknown', 'unknown-driver', 'unknown-track', 'unknown-credit'].includes(value)) return 'Unknown'
  return value.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function getCreditLabel(type: string | null) {
  return type && ['post', 'program', 'flyer', 'photo'].includes(type) ? type.charAt(0).toUpperCase() + type.slice(1) : 'Credit'
}

// PREMIUM BRAND PLATFORM VISUAL SYSTEM - DEEP MATTE EDITIONS
const pageStyle: CSSProperties = { backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '5rem' }
const heroSection: CSSProperties = { backgroundColor: '#111111', color: '#ffffff', padding: '4.5rem 2rem', borderBottom: '4px solid #cf2e2e' }
const heroSplit: CSSProperties = { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }
const heroLeft: CSSProperties = { display: 'flex', flexDirection: 'column' }
const eyebrow: CSSProperties = { color: '#cf2e2e', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1.5px', marginBottom: '0.75rem', fontSize: '0.85rem' }
const pageTitle: CSSProperties = { fontSize: '3.25rem', margin: '0 0 1rem 0', fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: '-0.5px' }
const pageIntro: CSSProperties = { fontSize: '1.15rem', color: '#aaaaaa', margin: '0 0 2.25rem 0', lineHeight: '1.6' }
const searchForm: CSSProperties = { display: 'flex', gap: '0.5rem', marginBottom: '2rem', maxWidth: '450px' }
const searchInput: CSSProperties = { flex: 1, padding: '0.85rem 1.25rem', fontSize: '1rem', border: '1px solid #333', backgroundColor: '#222', color: '#fff', borderRadius: '6px', outline: 'none' }
const searchButton: CSSProperties = { padding: '0.85rem 1.75rem', backgroundColor: '#cf2e2e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }
const alphabetBar: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.75rem', maxWidth: '500px' }
const letterLink: CSSProperties = { textDecoration: 'none', padding: '0.35rem 0.5rem', fontSize: '0.95rem', transition: 'color 0.2s' }
const resultsLine: CSSProperties = { color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }
const heroGallery: CSSProperties = { position: 'relative', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', backgroundColor: '#222', height: '380px', width: '100%' }
const heroGalleryPhoto: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' }
const heroGalleryCaption: CSSProperties = { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.25rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: '#fff', fontSize: '0.85rem', letterSpacing: '0.5px' }
const heroGalleryPlaceholder: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#444', fontStyle: 'italic', width: '100%' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '3.5rem auto 0 auto', padding: '0 2rem' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2.5rem' }
const cardLink: CSSProperties = { textDecoration: 'none', color: 'inherit' }
const card: CSSProperties = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e9ecef', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }
const cardInner: CSSProperties = { padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }
const cardImageWrapper: CSSProperties = { margin: '-1.5rem -1.5rem 1.25rem -1.5rem', position: 'relative' }
const cardPhoto: CSSProperties = { width: '100%', height: '220px', objectFit: 'cover' }
const cardPhotoCaption: CSSProperties = { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem 1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', color: '#eee', fontSize: '0.75rem', fontStyle: 'italic' }
const driverSignaturePlaceholder: CSSProperties = { height: '220px', backgroundColor: '#f1f3f5', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed #dee2e6', margin: '-1.5rem -1.5rem 1.25rem -1.5rem' }
const driverSignatureName: CSSProperties = { fontFamily: 'Georgia, serif', fontSize: '1.4rem', color: '#495057', opacity: 0.5, textAlign: 'center', padding: '0 1.5rem', fontWeight: 'bold' }
const driverName: CSSProperties = { fontSize: '1.45rem', margin: '0.25rem 0 0.35rem 0', color: '#111111', fontFamily: 'Georgia, serif', fontWeight: 'bold' }
const metaLine: CSSProperties = { fontSize: '0.9rem', color: '#6c757d', margin: '0 0 1.5rem 0', letterSpacing: '0.2px' }
const statTable: CSSProperties = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', marginTop: 'auto', border: '1px solid #f1f3f5' }
const statRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f3f5', color: '#343a40' }
const statBadge: CSSProperties = { backgroundColor: '#e9ecef', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#111', fontSize: '0.8rem', fontFamily: 'monospace' }
const cardButton: CSSProperties = { textAlign: 'center', padding: '0.75rem', backgroundColor: '#111', color: '#fff', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem', transition: 'background-color 0.2s' }
const errorBox: CSSProperties = { padding: '2.5rem', backgroundColor: '#fff5f5', color: '#c92a2a', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ffe3e3' }
const emptyBox: CSSProperties = { padding: '5rem', textAlign: 'center', color: '#6c757d', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #dee2e6' }