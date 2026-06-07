// app/drivers/page.tsx

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { getPhotoUrl } from '@/lib/photos'

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

  const getCDNPath = (photoObj: any) => {
    const track = photoObj.track_slug || 'unknown-track'
    const yr = photoObj.year || 'unknown-year'
    return `master/${track}/${yr}/${photoObj.file_name}`
  }

  return (
    <main style={page}>
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
                <>
                  Showing drivers with last names starting with <strong>{letter}</strong>
                </>
              ) : query ? (
                <>
                  Showing results for <strong>{query}</strong>
                </>
              ) : (
                <>Showing driver directory</>
              )}
            </div>
          </div>

          <div style={heroGallery}>
            {galleryPhoto ? (
              <>
                <img
                  src={getPhotoUrl(getCDNPath(galleryPhoto))}
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
                            src={getPhotoUrl(getCDNPath(driverPhoto))}
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
                          <div style={driverSignatureFlag} />
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
  if (
    !value ||
    value === 'unknown' ||
    value === 'unknown-driver' ||
    value === 'unknown-track' ||
    value === 'unknown-credit'
  ) {
    return 'Unknown'
  }

  return value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getCreditLabel(type: string | null) {
  switch (type) {
    case 'post':
      return 'Post'
    case 'program':
      return 'Program'
    case 'flyer':
      return 'Flyer'
    case 'photo':
      return 'Photo'
    default:
      return 'Credit'
  }
}

// ==========================================
// MUSEUM DESIGN LAYOUT STYLE SPECIFICATIONS
// ==========================================

// ==========================================
// MUSEUM DESIGN LAYOUT STYLE SPECIFICATIONS
// ==========================================

const page: CSSProperties = {
  background: '#ebdcb9',
  backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 0)',
  backgroundSize: '24px 24px',
  minHeight: '100vh',
  color: '#3d2b16',
  paddingBottom: '80px',
  fontFamily: 'serif',
}

const heroSection: CSSProperties = {
  background: '#3d2b16',
  color: '#ebdcb9',
  padding: '60px 20px',
  borderBottom: '6px double #ebdcb9',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
}

const heroSplit: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '40px',
  alignItems: 'center',
}

const heroLeft: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const eyebrow: CSSProperties = {
  fontFamily: 'sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '3px',
  fontSize: '13px',
  color: '#b29364',
  marginBottom: '10px',
  fontWeight: 700,
}

const pageTitle: CSSProperties = {
  fontSize: '56px',
  margin: '0 0 16px',
  fontFamily: 'serif',
  fontWeight: 900,
  letterSpacing: '-1px',
}

const pageIntro: CSSProperties = {
  fontSize: '19px',
  lineHeight: '1.6',
  margin: '0 0 30px',
  color: '#dfcfab',
  maxWidth: '540px',
}

const searchForm: CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '30px',
  maxWidth: '500px',
}

const searchInput: CSSProperties = {
  flex: 1,
  padding: '14px 18px',
  fontSize: '16px',
  background: '#fcf6e8',
  border: '2px solid #b29364',
  color: '#3d2b16',
  fontFamily: 'serif',
  borderRadius: '0px',
}

const searchButton: CSSProperties = {
  background: '#b29364',
  color: '#3d2b16',
  border: 'none',
  padding: '0 28px',
  fontSize: '16px',
  fontWeight: 700,
  fontFamily: 'sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  cursor: 'pointer',
}

const alphabetBar: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  alignItems: 'center',
  background: 'rgba(0,0,0,0.2)',
  padding: '12px',
  border: '1px solid #5a4225',
}

const letterLink: CSSProperties = {
  color: '#dfcfab',
  textDecoration: 'none',
  padding: '4px 8px',
  fontSize: '15px',
  fontFamily: 'sans-serif',
  fontWeight: 600,
}

const resultsLine: CSSProperties = {
  marginTop: '14px',
  fontSize: '14px',
  fontFamily: 'sans-serif',
  color: '#b29364',
}

const heroGallery: CSSProperties = {
  position: 'relative',
  background: '#2b1e0f',
  border: '4px double #b29364',
  padding: '12px',
  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '300px',
}

const heroGalleryPhoto: CSSProperties = {
  width: '100%',
  maxHeight: '320px',
  objectFit: 'contain',
  filter: 'sepia(0.15) contrast(1.05)',
}

const heroGalleryCaption: CSSProperties = {
  marginTop: '10px',
  fontSize: '12px',
  fontFamily: 'sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#b29364',
}

const heroGalleryPlaceholder: CSSProperties = {
  color: '#5a4225',
  fontFamily: 'serif',
  fontStyle: 'italic',
  fontSize: '24px',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '50px 20px',
}

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: '30px',
}

const cardLink: CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
}

const card: CSSProperties = {
  background: '#dcc7a1',
  border: '2px solid #b29364',
  padding: '10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

const cardInner: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '14px',
  minHeight: '100%',
}

const cardPhoto: CSSProperties = {
  width: '100%',
  height: '240px',
  objectFit: 'cover',
  border: '1px solid #b29364',
  marginBottom: '6px',
}

const cardPhotoCaption: CSSProperties = {
  fontSize: '11px',
  fontFamily: 'sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#7a5a35',
  marginBottom: '12px',
  textAlign: 'right',
}

const driverSignaturePlaceholder: CSSProperties = {
  height: '240px',
  background: '#e4d3b2',
  border: '1px solid #c2a97d',
  marginBottom: '18px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
}

const driverSignatureFlag: CSSProperties = {
  position: 'absolute',
  width: '140%',
  height: '40px',
  background: 'rgba(178,147,100,0.15)',
  transform: 'rotate(-12deg)',
}

const driverSignatureName: CSSProperties = {
  fontFamily: 'serif',
  fontStyle: 'italic',
  fontSize: '28px',
  color: '#8a714e',
  zIndex: 1,
  padding: '0 20px',
  textAlign: 'center',
}

const driverName: CSSProperties = {
  fontSize: '30px',
  margin: '0 0 8px',
  fontFamily: 'serif',
  fontWeight: 900,
  color: '#3d2b16',
}

const metaLine: CSSProperties = {
  fontSize: '17px',
  margin: '0 0 14px',
  color: '#5a3a1b',
}

const statTable: CSSProperties = {
  background: '#e4d3b2',
  border: '1px solid #c2a97d',
  marginBottom: '16px',
}

const statRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderBottom: '1px solid #ccb48a',
  fontSize: '14px',
  fontFamily: 'sans-serif',
}

const cardButton: CSSProperties = {
  background: '#3d2b16',
  color: '#ebdcb9',
  textAlign: 'center',
  padding: '12px',
  fontWeight: 700,
  fontFamily: 'sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontSize: '13px',
}

const errorBox: CSSProperties = {
  padding: '20px',
  background: '#f2dede',
  color: '#a94442',
  border: '1px solid #ebccd1',
  fontFamily: 'sans-serif',
}

const emptyBox: CSSProperties = {
  padding: '40px',
  background: '#ebdcb9',
  border: '2px dashed #b29364',
  textAlign: 'center',
  color: '#7a5a35',
  fontSize: '18px',
}