export type PhotoManifestItem = {
  fileName: string
  storagePath: string
  trackSlug: string
  year: string
  driverSlug: string
  photographerSlug: string
  creditType: string
  sequence: string
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || ""

const BUCKET = "media"

export function getPhotoUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

export async function getTrackPhotos(trackSlug: string) {
  try {
    const data = await import(
      `@/public/data/photos/tracks/${trackSlug}.json`
    )

    return data.default as PhotoManifestItem[]
  } catch (err) {
    console.error(`Missing track manifest for ${trackSlug}`)
    return []
  }
}