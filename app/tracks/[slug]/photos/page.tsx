import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import styles from "../track-profile.module.css"

const PAGE_SIZE = 96

function getPhotoUrl(photo: any) {
  if (!photo?.file_name) return ""

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const trackSlug = photo.track_slug || photo.file_name.split("_")[0]
  const year = photo.year || photo.file_name.split("_")[1] || "unknown-year"

  return `${baseUrl}/storage/v1/object/public/media/photos/master/${trackSlug}/${year}/${photo.file_name}`
}

function formatSlugName(value?: string | null) {
  if (
    !value ||
    value === "unknown-credit" ||
    value === "unknown-driver" ||
    value === "unknown"
  ) {
    return null
  }

  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default async function TrackPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const baseSlug = slug.replace(/-(wi|il|mn|mi)$/i, "")
  const requestedPage = Number(query.page || 1)
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.floor(requestedPage)
    : 1

  const [{ data: track }, { count }] = await Promise.all([
    supabase
      .from("track_profile_view_v3")
      .select("track_name,slug,city,state")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("photos")
      .select("photo_id", { count: "exact", head: true })
      .or(`track_slug.eq.${slug},track_slug.eq.${baseSlug}`)
      .neq("credit_type", "unknown"),
  ])

  if (!track) notFound()

  const totalPhotos = Number(count || 0)
  const totalPages = Math.max(1, Math.ceil(totalPhotos / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const from = (safePage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .or(`track_slug.eq.${slug},track_slug.eq.${baseSlug}`)
    .neq("credit_type", "unknown")
    .order("year", { ascending: false, nullsFirst: false })
    .order("sequence", { ascending: true })
    .range(from, to)

  const rows = photos || []
  const location = [track.city, track.state].filter(Boolean).join(", ")
  const firstShown = totalPhotos === 0 ? 0 : from + 1
  const lastShown = Math.min(from + rows.length, totalPhotos)

  return (
    <main className={styles.subpage}>
      <section className={styles.subHero}>
        <div className={styles.subHeroInner}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/tracks">Tracks</Link>
            <span>›</span>
            <Link href={`/tracks/${slug}`}>{track.track_name}</Link>
            <span>›</span>
            <span>Photos</span>
          </nav>
          <p className={styles.eyebrow}>Museum Photo Collection</p>
          <h1 className={styles.subTitle}>Track Photos</h1>
          <p className={styles.subSubtitle}>
            {track.track_name}{location ? ` • ${location}` : ""}
          </p>
          <p className={styles.subIntro}>
            Browse the complete photo archive currently connected to {track.track_name}.
            The collection will continue to expand as photographs are identified and cataloged.
          </p>
          <div className={styles.subActions}>
            <Link href={`/tracks/${slug}`} className={styles.backButton}>
              ← Track Overview
            </Link>
            <Link href={`/tracks/${slug}/feature-winners`} className={styles.secondaryButton}>
              Feature Winners
            </Link>
            <Link href={`/tracks/${slug}/champions`} className={styles.secondaryButton}>
              Track Champions
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.subContent}>
        <section className={styles.summaryGrid} aria-label="Photo archive summary">
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{totalPhotos.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Archived Photos</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{safePage}</div>
            <div className={styles.summaryLabel}>Page of {totalPages}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {totalPhotos ? `${firstShown}–${lastShown}` : "—"}
            </div>
            <div className={styles.summaryLabel}>Photos Shown</div>
          </div>
        </section>

        {rows.length === 0 ? (
          <section className={styles.panel}>
            <div className={styles.empty}>No track photos are available yet.</div>
          </section>
        ) : (
          <section className={styles.archivePhotoGrid}>
            {rows.map((photo: any) => {
              const driverName = formatSlugName(photo.driver_slug) || "Driver not identified"
              const photographer = formatSlugName(photo.photographer_slug)
              const hasDriver =
                !!photo.driver_slug &&
                photo.driver_slug !== "unknown-driver" &&
                photo.driver_slug !== "unknown"

              return (
                <article className={styles.archivePhotoCard} key={photo.photo_id}>
                  {hasDriver ? (
                    <Link href={`/drivers/${photo.driver_slug}`}>
                      <img
                        src={getPhotoUrl(photo)}
                        alt={`${driverName} at ${track.track_name}`}
                        className={styles.archivePhotoImage}
                      />
                    </Link>
                  ) : (
                    <img
                      src={getPhotoUrl(photo)}
                      alt={`Historic racing at ${track.track_name}`}
                      className={styles.archivePhotoImage}
                    />
                  )}
                  <div className={styles.archivePhotoMeta}>
                    <strong>
                      {hasDriver ? (
                        <Link href={`/drivers/${photo.driver_slug}`} className={styles.driverLink}>
                          {driverName}
                        </Link>
                      ) : (
                        driverName
                      )}
                    </strong>
                    <div>{photo.year && photo.year !== "unknown-year" ? photo.year : "Year unknown"}</div>
                    <div>{photographer ? `${photographer} photo` : "Photographer not identified"}</div>
                  </div>
                </article>
              )
            })}
          </section>
        )}

        {totalPages > 1 ? (
          <nav className={styles.subActions} aria-label="Photo archive pagination" style={{ marginTop: 22 }}>
            {safePage > 1 ? (
              <Link
                href={`/tracks/${slug}/photos?page=${safePage - 1}`}
                className={styles.secondaryButton}
              >
                ← Previous Photos
              </Link>
            ) : null}
            <span className={styles.secondaryButton} aria-current="page">
              Page {safePage} of {totalPages}
            </span>
            {safePage < totalPages ? (
              <Link
                href={`/tracks/${slug}/photos?page=${safePage + 1}`}
                className={styles.secondaryButton}
              >
                Next Photos →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </main>
  )
}
