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
    return `media/${track}/${yr}/${photoObj.file_name}`
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

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  minHeight: '100vh',
  color: '#2f2417',
  fontFamily: 'Georgia, serif',
}

const heroSection: CSSProperties = {
  background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const pageTitle: CSSProperties = {
  fontSize: '52px',
  margin: '0 0 10px',
  color: '#3d2b16',
}

const pageIntro: CSSProperties = {
  fontSize: '20px',
  lineHeight: 1.6,
  maxWidth: '820px',
  margin: '0 0 20px',
}

const searchForm: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '12px',
}

const searchInput: CSSProperties = {
  minWidth: '320px',
  padding: '12px 14px',
  border: '2px solid #b29364',
  background: '#f6eddc',
  fontSize: '16px',
  color: '#2f2417',
}

const searchButton: CSSProperties = {
  padding: '12px 18px',
  background: '#7a5827',
  color: '#fff8ea',
  border: '2px solid #5d3f17',
  cursor: 'pointer',
  fontSize: '16px',
}

const resultsLine: CSSProperties = {
  fontSize: '16px',
  color: '#6a4a1f',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '26px 20px 40px',
}

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))',
  gap: '20px',
}

const cardLink: CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
}

const cardPhoto: CSSProperties = {
  width: '100%',
  height: '190px',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid #b29364',
  marginBottom: '10px',
  background: '#d8c39d',
}

const cardPhotoCaption: CSSProperties = {
  fontSize: '13px',
  marginBottom: '12px',
  color: '#5b472f',
}

const driverSignaturePlaceholder: CSSProperties = {
  width: '100%',
  height: '190px',
  position: 'relative',
  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  border: '1px solid #b29364',
  marginBottom: '10px',
  background: 'linear-gradient(to bottom, #d8c39d, #c7ab7c)',
}

const heroSplit: CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '34px 20px 28px',
  display: 'grid',
  gridTemplateColumns: '1.2fr 0.8fr',
  gap: '36px',
  alignItems: 'start',
}

const heroLeft: CSSProperties = {
  minWidth: 0,
}

const heroGallery: CSSProperties = {
  background: '#dcc7a1',
  border: '2px solid #b29364',
  padding: '10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

const heroGalleryPhoto: CSSProperties = {
  width: '100%',
  height: '300px',
  objectFit: 'cover',
  display: 'block',
  border: '1px solid #b29364',
  background: '#d8c39d',
}

const heroGalleryCaption: CSSProperties = {
  padding: '12px',
  textAlign: 'center',
  fontSize: '18px',
  color: '#5a3a1b',
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  borderTop: 'none',
}

const heroGalleryPlaceholder: CSSProperties = {
  height: '300px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#cdb38a',
  color: '#5a3a1b',
  fontSize: '28px',
  fontFamily: 'Georgia, serif',
}

const driverSignatureFlag: CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.05,
  backgroundImage: `
    linear-gradient(45deg, #2f2417 25%, transparent 25%),
    linear-gradient(-45deg, #2f2417 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2f2417 75%),
    linear-gradient(-45deg, transparent 75%, #2f2417 75%)
  `,
  backgroundSize: '40px 40px',
  backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
}

const driverSignatureName: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  fontSize: '34px',
  lineHeight: 1.1,
  color: '#5b3a1b',
  textAlign: 'center',
  padding: '0 16px',
  fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
  textShadow: '1px 1px 0 rgba(0,0,0,0.15)',
  transform: 'rotate(-2deg)',
  maxWidth: '90%',
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

const driverName: CSSProperties = {
  fontSize: '30px',
  margin: '0 0 8px',
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
  fontSize: '16px',
}

const cardButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '10px 14px',
  border: '1px solid #5d3f17',
}

const errorBox: CSSProperties = {
  padding: '18px',
  background: '#f2d8d3',
  border: '1px solid #b36a5e',
}

const alphabetBar: CSSProperties = {
  marginTop: '10px',
  marginBottom: '10px',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  fontSize: '16px',
}

const letterLink: CSSProperties = {
  color: '#5a3a1b',
  textDecoration: 'none',
}

const emptyBox: CSSProperties = {
  padding: '18px',
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
}