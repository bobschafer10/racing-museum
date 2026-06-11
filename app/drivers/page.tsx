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
    if (letter) supabaseQuery = supabaseQuery.eq('last_initial', letter)

    const { data: driversData, error: fetchError } = await supabaseQuery
    if (fetchError) throw fetchError
    drivers = driversData || []
  } catch (e: any) {
    console.error('Driver fetch error:', JSON.stringify(e, null, 2))
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

// UPPER MIDWEST AUTO RACING MUSEUM VISUAL SYSTEM

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  minHeight: '100vh',
  paddingBottom: '60px',
  color: '#2f2417',
}

const heroSection: CSSProperties = {
  background:
    'linear-gradient(to bottom, rgba(231,217,191,0.96), rgba(234,223,199,0.98))',
  borderBottom: '2px solid #b29364',
  padding: '42px 20px 34px',
}

const heroSplit: CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '1.15fr 0.85fr',
  gap: '36px',
  alignItems: 'center',
}

const heroLeft: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const eyebrow: CSSProperties = {
  color: '#7a5827',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontSize: '15px',
  marginBottom: '10px',
}

const pageTitle: CSSProperties = {
  fontSize: '64px',
  margin: '0 0 14px',
  color: '#3d2b16',
  lineHeight: 1,
  fontFamily: 'Georgia, serif',
}

const pageIntro: CSSProperties = {
  fontSize: '21px',
  lineHeight: 1.8,
  color: '#4b351d',
  maxWidth: '760px',
  margin: '0 0 28px',
}

const searchForm: CSSProperties = {
  display: 'flex',
  gap: '10px',
  marginBottom: '24px',
  maxWidth: '520px',
}

const searchInput: CSSProperties = {
  flex: 1,
  padding: '14px 16px',
  fontSize: '16px',
  border: '1px solid #b29364',
  background: '#f4ead7',
  color: '#2f2417',
  outline: 'none',
  fontFamily: 'Georgia, serif',
}

const searchButton: CSSProperties = {
  padding: '14px 24px',
  background: '#6e4d21',
  color: '#fff8ea',
  border: '1px solid #4d3413',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Georgia, serif',
}

const alphabetBar: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginBottom: '18px',
}

const letterLink: CSSProperties = {
  textDecoration: 'none',
  color: '#7a5827',
  padding: '4px 6px',
  fontSize: '15px',
}

const resultsLine: CSSProperties = {
  color: '#5a3a1b',
  fontSize: '15px',
}

const heroGallery: CSSProperties = {
  border: '2px solid #b29364',
  background: '#f4ead7',
  padding: '10px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
}

const heroGalleryPhoto: CSSProperties = {
  width: '100%',
  height: '420px',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid #a78654',
}

const heroGalleryCaption: CSSProperties = {
  marginTop: '8px',
  textAlign: 'center',
  fontSize: '14px',
  color: '#5a3a1b',
}

const heroGalleryPlaceholder: CSSProperties = {
  height: '420px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#d8c39d',
  color: '#5a3a1b',
  fontSize: '24px',
  border: '1px solid #a78654',
}

const contentWrap: CSSProperties = {
  maxWidth: '1280px',
  margin: '34px auto 0',
  padding: '0 20px',
}

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '24px',
}

const cardLink: CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
}

const card: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  transition: 'all 0.2s ease',
  height: '100%',
}

const cardInner: CSSProperties = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
}

const cardImageWrapper: CSSProperties = {
  marginBottom: '12px',
}

const cardPhoto: CSSProperties = {
  width: '100%',
  aspectRatio: '4 / 3',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid #b29364',
  background: '#efe7d6',
}

const cardPhotoCaption: CSSProperties = {
  marginTop: '6px',
  fontSize: '12px',
  color: '#6b4a22',
  lineHeight: 1.5,
}

const driverSignaturePlaceholder: CSSProperties = {
  aspectRatio: '4 / 3',
  background: '#ddc8a2',
  border: '1px dashed #a78654',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '12px',
}

const driverSignatureName: CSSProperties = {
  fontSize: '28px',
  color: '#7a5827',
  fontFamily: 'Georgia, serif',
  textAlign: 'center',
  padding: '12px',
}

const driverName: CSSProperties = {
  fontSize: '32px',
  margin: '0 0 8px',
  color: '#3d2b16',
  fontFamily: 'Georgia, serif',
  lineHeight: 1.1,
}

const metaLine: CSSProperties = {
  fontSize: '15px',
  color: '#5a3a1b',
  margin: '0 0 16px',
}

const statTable: CSSProperties = {
  background: '#eadfc7',
  border: '1px solid #ccb48a',
  marginTop: 'auto',
}

const statRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 12px',
  borderBottom: '1px solid #ccb48a',
  fontSize: '14px',
  color: '#4b351d',
}

const statBadge: CSSProperties = {
  color: '#3d2b16',
  fontWeight: 700,
}

const cardButton: CSSProperties = {
  marginTop: '14px',
  background: '#6e4d21',
  color: '#fff8ea',
  padding: '12px',
  textAlign: 'center',
  border: '1px solid #4d3413',
  fontWeight: 700,
}

const errorBox: CSSProperties = {
  padding: '30px',
  background: '#f1e5ce',
  border: '1px solid #b29364',
  color: '#7a1f1f',
  textAlign: 'center',
  fontWeight: 700,
}

const emptyBox: CSSProperties = {
  padding: '50px',
  background: '#f1e5ce',
  border: '1px solid #b29364',
  textAlign: 'center',
  color: '#5a3a1b',
}