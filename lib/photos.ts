const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || ""

const BUCKET = "media"

export function getPhotoUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
}
