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

  const getCDNPath = (photoObj: any) => {
    const track = photoObj.track_slug || 'unknown-track'
    const yr = photoObj.year || 'unknown-year'
    return `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${track}/${yr}/${photoObj.file_name}`
  }

  return (
    <main style={styles.pageStyle}>
      <section style={styles.heroSection}>
        <div style={styles.heroSplit}>
          <div style={styles.heroLeft}>
            <div style={styles.eyebrow}>Museum Collection</div>
            <h1 style={styles.pageTitle}>Drivers</h1>
            <p style={styles.pageIntro}>
              Browse driver profiles, recorded wins, top 3 finishes, and historical race results
              from across the Upper Midwest.
            </p>

            <form action="/drivers" method="get" style={styles.searchForm}>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search drivers"
                style={styles.searchInput}
              />
              <button type="submit" style={styles.searchButton}>
                Search
              </button>
            </form>

            <div style={styles.alphabetBar}>
              <Link href="/drivers" style={styles.letterLink}>All</Link>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
                <Link
                  key={l}
                  href={`/drivers?letter=${l}`}
                  style={{
                    ...styles.letterLink,
                    fontWeight: letter === l ? 'bold' : 'normal',
                    textDecoration: letter === l ? 'underline' : 'none',
                  }}
                >
                  {l}
                </Link>
              ))}
            </div>

            <div style={styles.resultsLine}>
              {letter ? (
                <>Showing drivers with last names starting with <strong>{letter}</strong></>
              ) : query ? (
                <>Showing results for <strong>{query}</strong></>
              ) : (
                <>Showing driver directory</>
              )}
            </div>
          </div>

          <div style={styles.heroGallery}>
            {galleryPhoto ? (
              <>
                <img
                  src={getCDNPath(galleryPhoto)}
                  alt="Vintage racing archive"
                  style={styles.heroGalleryPhoto}
                />
                <div style={styles.heroGalleryCaption}>From the Museum Archive</div>
              </>
            ) : (
              <div style={styles.heroGalleryPlaceholder}>Midwest Racing Archive</div>
            )}
          </div>
        </div>
      </section>

      <section style={styles.contentWrap}>
        {error ? (
          <div style={styles.errorBox}>Unable to load drivers right now.</div>
        ) : !drivers || filteredDrivers.length === 0 ? (
          <div style={styles.emptyBox}>No drivers found.</div>
        ) : (
          <div style={styles.grid}>
            {filteredDrivers.map((driver) => {
              const driverPhoto = driverPhotoMap.get(driver.driver_slug)
              return (
                <Link key={driver.driver_slug} href={`/drivers/${driver.driver_slug}`} style={styles.cardLink}>
                  <article style={styles.card}>
                    <div style={styles.cardInner}>
                      {driverPhoto ? (
                        <>
                          <img
                            src={getCDNPath(driverPhoto)}
                            alt={driver.driver_name}
                            style={styles.cardPhoto}
                          />
                          <div style={styles.cardPhotoCaption}>
                            {driverPhoto.year || 'Year Unknown'} •{' '}
                            {formatSlugName(driverPhoto.photographer_slug)}{' '}
                            {getCreditLabel(driverPhoto.credit_type)}
                          </div>
                        </>
                      ) : (
                        <div style={styles.driverSignaturePlaceholder}>
                          <div style={styles.driverSignatureFlag} />
                          <div style={styles.driverSignatureName}>{driver.driver_name}</div>
                        </div>
                      )}

                      <h2 style={styles.driverName}>{driver.driver_name}</h2>
                      <p style={styles.metaLine}>
                        {driver.hometown || 'Unknown hometown'}
                        {driver.state ? `, ${driver.state}` : ''}
                      </p>

                      <div style={styles.statTable}>
                        <div style={styles.statRow}>
                          <span>Recorded Feature Wins</span>
                          <strong>{driver.recorded_wins ?? 0}</strong>
                        </div>
                        <div style={styles.statRow}>
                          <span>Wisconsin Feature Wins</span>
                          <strong>{driver.wisconsin_feature_wins ?? 0}</strong>
                        </div>
                        <div style={styles.statRow}>
                          <span>Recorded Top-3 Finishes</span>
                          <strong>{driver.recorded_top_3_finishes ?? 0}</strong>
                        </div>
                        <div style={{ ...styles.statRow, borderBottom: 'none' }}>
                          <span>Recorded Results</span>
                          <strong>