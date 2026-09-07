import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PhotoLightboxImage from '@/components/PhotoLightboxImage'
import styles from './photo-archive.module.css'

export const revalidate = 300

const PAGE_SIZE = 60
const PHOTO_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master'

type Driver = {
  driver_name: string
  hometown: string | null
  state: string | null
}

type Photo = {
  photo_id: string | number
  file_name: string
  year: string | number | null
  photographer_slug: string | null
  credit_type: string | null
  sequence: number | null
  track_slug: string | null
}

export default async function DriverPhotoArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const queryParams = (await searchParams) ?? {}
  const requestedPage = Math.max(1, Number.parseInt(queryParams.page || '1', 10) || 1)
  const from = (requestedPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [driverResult, photoResult] = await Promise.all([
    supabase
      .from('driver_directory_alpha_view')
      .select('driver_name,hometown,state')
      .eq('driver_slug', slug)
      .maybeSingle<Driver>(),
    supabase
      .from('photos')
      .select('photo_id,file_name,year,photographer_slug,credit_type,sequence,track_slug', { count: 'exact' })
      .eq('driver_slug', slug)
      .order('year', { ascending: true, nullsFirst: false })
      .order('sequence', { ascending: true, nullsFirst: false })
      .range(from, to),
  ])

  const driver = driverResult.data
  if (!driver) notFound()

  const photos = (photoResult.data ?? []) as Photo[]
  const totalPhotos = photoResult.count ?? photos.length
  const pageCount = Math.max(1, Math.ceil(totalPhotos / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, pageCount)
  const heroPhoto = photos[0] ?? null
  const heroUrl = buildPhotoUrl(heroPhoto)
  const location = [driver.hometown, driver.state].filter(Boolean).join(', ') || 'Hometown not yet documented'

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroUrl ? <img src={heroUrl} alt="" className={styles.heroImage} aria-hidden="true" /> : null}
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span>
            <Link href="/drivers">Drivers</Link><span>›</span>
            <Link href={`/drivers/${slug}`}>{driver.driver_name}</Link><span>›</span>
            <span>Photos</span>
          </div>

          <span className={styles.eyebrow}>Museum Photo Collection</span>
          <h1>{driver.driver_name}</h1>
          <h2>Photo Archive</h2>
          <p>{location}</p>

          <div className={styles.heroStats}>
            <div><strong>{totalPhotos.toLocaleString('en-US')}</strong><span>Archived Photos</span></div>
            <div><strong>{currentPage}</strong><span>Current Page</span></div>
            <div><strong>{pageCount}</strong><span>Archive Pages</span></div>
          </div>

          <div className={styles.heroActions}>
            <Link href={`/drivers/${slug}`}>← Back to Driver Profile</Link>
            <Link href={`/drivers/${slug}/results`}>View Race Results →</Link>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Complete collection</span>
            <h2>{driver.driver_name} Photography</h2>
          </div>
          <p>
            {totalPhotos === 0
              ? 'No photographs are currently connected to this driver.'
              : `Showing ${from + 1}–${Math.min(to + 1, totalPhotos)} of ${totalPhotos.toLocaleString('en-US')} images`}
          </p>
        </div>

        {photos.length === 0 ? (
          <div className={styles.emptyState}>No photographs are available on this page.</div>
        ) : (
          <div className={styles.photoGrid}>
            {photos.map((photo) => {
              const track = formatTrackSlug(photo.track_slug)
              const year = formatPhotoYear(photo.year)
              const credit = buildCreditLine(photo)
              const caption = [year, track, credit].filter(Boolean).join(' • ')
              return (
                <article className={styles.photoCard} key={photo.photo_id}>
                  <PhotoLightboxImage
                    src={buildPhotoUrl(photo)}
                    alt={`${driver.driver_name}${track ? ` at ${track}` : ''}`}
                    caption={caption}
                    imageStyle={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
                    showZoomBadge
                  />
                  <div className={styles.photoCaption}>
                    <strong>{[year, track].filter(Boolean).join(' • ')}</strong>
                    <span>{credit}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {pageCount > 1 ? (
          <nav className={styles.pagination} aria-label="Driver photo archive pages">
            {currentPage > 1 ? (
              <Link href={`/drivers/${slug}/photos?page=${currentPage - 1}`}>← Previous</Link>
            ) : <span />}
            <strong>Page {currentPage} of {pageCount}</strong>
            {currentPage < pageCount ? (
              <Link href={`/drivers/${slug}/photos?page=${currentPage + 1}`}>Next →</Link>
            ) : <span />}
          </nav>
        ) : null}

        <div className={styles.footerLinks}>
          <Link href={`/drivers/${slug}`}>Driver Overview</Link>
          <Link href={`/drivers/${slug}/results`}>Complete Results</Link>
          <Link href="/drivers">Driver Directory</Link>
        </div>
      </section>
    </main>
  )
}

function buildPhotoUrl(photo: Photo | null | undefined) {
  if (!photo?.file_name) return ''
  const track = String(photo.track_slug || 'unknown-track')
  const year = String(photo.year || 'unknown-year')
  return `${PHOTO_BASE}/${track}/${year}/${encodeURIComponent(photo.file_name)}`
}

function formatPhotoYear(value: Photo['year']) {
  if (value === null || value === undefined) return 'Year Unknown'
  const text = String(value).trim()
  return !text || text === 'unknown-year' || text === 'unknown' ? 'Year Unknown' : text
}

function formatTrackSlug(value: string | null | undefined) {
  if (!value || value === 'unknown-track' || value === 'unknown') return ''
  return value
    .replace(/-(wi|mn|mi|il|in)$/i, '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function buildCreditLine(photo: Photo) {
  const photographer = photo.photographer_slug && photo.photographer_slug !== 'unknown'
    ? formatName(photo.photographer_slug)
    : 'Credit not yet documented'
  const creditType = photo.credit_type && photo.credit_type !== 'unknown'
    ? formatName(photo.credit_type)
    : ''
  return creditType ? `${photographer} • ${creditType}` : photographer
}

function formatName(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
