import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './results.module.css'

const SUPABASE_PHOTO_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/photos/master'

type Driver = {
  driver_name: string
  driver_slug?: string
  hometown: string | null
  state: string | null
}

type Photo = {
  photo_id: string | number
  file_name: string
  year: number | null
  photographer_slug: string | null
  credit_type: string | null
  sequence: number | null
  track_slug: string | null
}

type FullResultRow = {
  race_id: number
  race_date: string
  track_name: string
  track_slug: string
  class_name: string | null
  finishing_position: number
  first_place_driver: string | null
  second_place_driver: string | null
  third_place_driver: string | null
  first_place_driver_slug: string | null
  second_place_driver_slug: string | null
  third_place_driver_slug: string | null
}

type YearRow = {
  result_year: number
}

export default async function DriverResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    year?: string
    finish?: string
    state?: string
  }>
}) {
  const { slug } = await params
  const { year, finish, state } = await searchParams

  const { data: driver } = await supabase
    .from('driver_directory_view')
    .select('driver_name, driver_slug, hometown, state')
    .eq('driver_slug', slug)
    .single<Driver>()

  if (!driver) notFound()

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('driver_slug', slug)
    .order('year', { ascending: true, nullsFirst: false })
    .order('sequence', { ascending: true })
    .returns<Photo[]>()

  let resultsQuery = supabase
    .from('driver_full_results_view')
    .select(`
      race_id,
      race_date,
      track_name,
      track_slug,
      class_name,
      finishing_position,
      first_place_driver,
      second_place_driver,
      third_place_driver,
      first_place_driver_slug,
      second_place_driver_slug,
      third_place_driver_slug
    `)
    .eq('driver_slug', slug)

  if (year) {
    resultsQuery = resultsQuery
      .gte('race_date', `${year}-01-01`)
      .lte('race_date', `${year}-12-31`)
  }

  const { data: results } = await resultsQuery
    .order('race_date', { ascending: true })
    .returns<FullResultRow[]>()

  const { data: allYearRows } = await supabase
    .from('driver_results_by_year_view')
    .select('result_year')
    .eq('driver_slug', slug)
    .order('result_year', { ascending: true })
    .returns<YearRow[]>()

  const safePhotos = photos ?? []
  const safeYearRows = allYearRows ?? []
  let safeResults = results ?? []

  if (finish === '1') {
    safeResults = safeResults.filter(
      (result) => Number(result.finishing_position) === 1
    )
  }

  if (state === 'WI') {
    safeResults = safeResults.filter((result) =>
      result.track_slug.endsWith('-wi')
    )
  }

  const resultsTitle =
    finish === '1' && state === 'WI'
      ? 'Wisconsin Feature Wins by Date'
      : finish === '1'
        ? 'Recorded Feature Wins by Date'
        : year
          ? `Feature Results from ${year}`
          : 'Complete Feature Results by Date'

  const filterSummary =
    finish === '1' && state === 'WI'
      ? 'Showing Wisconsin feature wins'
      : finish === '1'
        ? 'Showing recorded feature wins'
        : year
          ? `Showing results for ${year}`
          : 'Showing all years'

  const heroPhotoItem =
    safePhotos.find((photo) => photo.year !== null) ?? safePhotos[0] ?? null

  const groupedResults = safeResults.reduce<Record<number, FullResultRow[]>>(
    (groups, result) => {
      const resultYear = new Date(result.race_date).getFullYear()
      if (!groups[resultYear]) groups[resultYear] = []
      groups[resultYear].push(result)
      return groups
    },
    {}
  )

  Object.values(groupedResults).forEach((yearResults) => {
    yearResults.sort(
      (a, b) =>
        new Date(a.race_date).getTime() - new Date(b.race_date).getTime()
    )
  })

  const buildFilterHref = (nextYear?: number) => {
    const query = new URLSearchParams()
    if (nextYear) query.set('year', String(nextYear))
    if (finish) query.set('finish', finish)
    if (state) query.set('state', state)
    const suffix = query.toString()
    return `/drivers/${slug}/results${suffix ? `?${suffix}` : ''}`
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        {heroPhotoItem ? (
          <img
            src={buildPhotoUrl(heroPhotoItem)}
            alt=""
            aria-hidden="true"
            className={styles.heroBackground}
          />
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroShade} />

        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/drivers">Drivers</Link>
            <span>/</span>
            <Link href={`/drivers/${slug}`}>{driver.driver_name}</Link>
            <span>/</span>
            <span>Full Results</span>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.profileMedia}>
              {heroPhotoItem ? (
                <>
                  <img
                    src={buildPhotoUrl(heroPhotoItem)}
                    alt={driver.driver_name}
                    className={styles.profilePhoto}
                  />
                  <div className={styles.photoCaption}>
                    {buildPhotoCaption(heroPhotoItem)}
                  </div>
                </>
              ) : (
                <div className={styles.photoPlaceholder}>
                  <strong>{getInitials(driver.driver_name)}</strong>
                  <span>Photo Coming Soon</span>
                </div>
              )}
            </div>

            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>Driver Results Archive</div>
              <h1>{driver.driver_name}</h1>
              <h2>
                {driver.hometown || 'Unknown hometown'}
                {driver.state ? `, ${driver.state}` : ''}
              </h2>
              <p>
                Complete feature results by date, with track, class, finishing
                position, and top feature finishers where available.
              </p>
              <div className={styles.heroActions}>
                <Link href={`/drivers/${slug}`} className={styles.primaryAction}>
                  Back to Driver Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Season-by-season archive</span>
            <h2>{resultsTitle}</h2>
          </div>
          <p>{safeResults.length.toLocaleString()} recorded results</p>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Filter by year</span>
            <Link
              href={buildFilterHref()}
              className={!year ? styles.activeFilter : styles.filterLink}
            >
              All
            </Link>
            {safeYearRows.map((row) => (
              <Link
                key={row.result_year}
                href={buildFilterHref(row.result_year)}
                className={
                  year === String(row.result_year)
                    ? styles.activeFilter
                    : styles.filterLink
                }
              >
                {row.result_year}
              </Link>
            ))}
          </div>
          <div className={styles.filterSummary}>{filterSummary}</div>
        </div>

        <div className={styles.resultsPanel}>
          {safeResults.length === 0 ? (
            <div className={styles.emptyState}>No full results available yet.</div>
          ) : (
            Object.entries(groupedResults).map(([yearKey, yearResults]) => (
              <details
                key={yearKey}
                className={styles.yearGroup}
                open={year === yearKey || year === undefined}
              >
                <summary className={styles.yearHeader}>
                  <span>{yearKey}</span>
                  <small>
                    {yearResults.length} result{yearResults.length === 1 ? '' : 's'}
                  </small>
                </summary>

                <div className={styles.yearRows}>
                  {yearResults.map((result, index) => (
                    <div
                      key={`${result.race_id}-${index}`}
                      className={styles.resultCard}
                    >
                      <div className={styles.resultHeader}>
                        <span>{formatRaceDate(result.race_date)}</span>
                        <strong>P{result.finishing_position}</strong>
                      </div>

                      <div className={styles.resultMeta}>
                        <img
                          src={`/logos/tracks/${result.track_slug}.jpg`}
                          alt=""
                          className={styles.trackLogo}
                        />
                        <Link
                          href={`/tracks/${result.track_slug}`}
                          className={styles.trackLink}
                        >
                          {result.track_name}
                        </Link>
                        <span className={styles.className}>
                          {result.class_name || 'Unknown'}
                        </span>
                      </div>

                      <div className={styles.podiumRow}>
                        {renderFinisher(
                          1,
                          result.first_place_driver,
                          result.first_place_driver_slug,
                          result.finishing_position
                        )}
                        {renderFinisher(
                          2,
                          result.second_place_driver,
                          result.second_place_driver_slug,
                          result.finishing_position
                        )}
                        {renderFinisher(
                          3,
                          result.third_place_driver,
                          result.third_place_driver_slug,
                          result.finishing_position
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

function renderFinisher(
  position: number,
  name: string | null,
  slug: string | null,
  featuredPosition: number
) {
  if (!name) return null

  const isFeatured = position === featuredPosition
  const className = `${styles.finisher} ${isFeatured ? styles.featuredFinisher : ''}`

  return (
    <span className={styles.podiumEntry}>
      <span className={styles.podiumPosition}>{position}.</span>{' '}
      {slug ? (
        <Link href={`/drivers/${slug}`} className={className}>
          {name}
        </Link>
      ) : (
        <span className={className}>{name}</span>
      )}
    </span>
  )
}

function formatRaceDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function buildPhotoUrl(photo: Photo | null | undefined) {
  if (!photo?.file_name) return ''
  const track = String(photo.track_slug || 'unknown-track')
  const photoYear = String(photo.year || 'unknown-year')
  return `${SUPABASE_PHOTO_BASE}/${track}/${photoYear}/${encodeURIComponent(photo.file_name)}`
}

function buildPhotoCaption(photo: Photo) {
  return [
    photo.year || 'Year Unknown',
    `${formatName(photo.photographer_slug || 'Unknown')} ${formatCreditType(photo.credit_type)}`,
  ].join(' • ')
}

function formatName(name: string | null) {
  if (!name) return 'Unknown'
  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatCreditType(type: string | null) {
  if (!type || type.toLowerCase() === 'unknown') return 'Photo'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
