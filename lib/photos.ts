import { PHOTO_STORAGE_OVERRIDES } from './photo-storage-overrides'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const BUCKET = 'media'

// The photo table tracks the *canonical* facility/year. An archived binary may
// retain its original folder or capitalization; use the verified physical path.
export function getPhotoUrl(storagePath: string) {
  const fileName = storagePath.split('/').pop() || ''
  let decodedName = fileName
  try { decodedName = decodeURIComponent(fileName) } catch { /* leave malformed names unchanged */ }
  const resolvedPath = PHOTO_STORAGE_OVERRIDES[decodedName] || storagePath
  const encodedPath = resolvedPath.split('/').map(segment => {
    try { return encodeURIComponent(decodeURIComponent(segment)) }
    catch { return encodeURIComponent(segment) }
  }).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodedPath}`
}
