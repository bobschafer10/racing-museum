require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return `"${s.replace(/"/g, '""')}"`
}

function parsePhotoFile(fileName) {
  const base = fileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
  const parts = base.split('_')

  if (parts.length < 6) {
    return { valid: false, parts }
  }

  return {
    valid: true,
    track_slug: parts[0],
    year: parts[1],
    driver_slug: parts[2],
    photographer_slug: parts[3],
    credit_type: parts[4],
    sequence: parts[5],
    parts,
  }
}

async function fetchAllPhotos() {
  let rows = []
  let from = 0
  const size = 1000

  while (true) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .range(from, from + size - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    rows = rows.concat(data)
    from += size
  }

  return rows
}

async function fetchStoragePhotos() {
  let objects = []
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase.storage
      .from('media')
      .list('photos/master', {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) throw error
    if (!data || data.length === 0) break

    objects = objects.concat(data)
    offset += limit
  }

  return objects
}

async function main() {
  console.log('Fetching photos table...')
  const photos = await fetchAllPhotos()

  console.log(`Photos table rows: ${photos.length}`)

  const rows = []

  for (const photo of photos) {
    const parsed = parsePhotoFile(photo.file_name)
    const expectedPath = `photos/master/${photo.track_slug}/${photo.year}/${photo.file_name}`

    const issues = []

    if (!parsed.valid) issues.push('BAD_FILENAME_FORMAT')
    if (photo.year === 'unkown-year') issues.push('MISSPELLED_YEAR')
    if (photo.driver_slug?.includes('speedway')) issues.push('DRIVER_CONTAINS_SPEEDWAY')
    if (photo.driver_slug?.includes('photo')) issues.push('DRIVER_CONTAINS_PHOTO')
    if (photo.driver_slug?.includes('post')) issues.push('DRIVER_CONTAINS_POST')
    if (photo.driver_slug?.includes('checkered')) issues.push('DRIVER_CONTAINS_CHECKERED')

    if (parsed.valid) {
      if (photo.track_slug !== parsed.track_slug) issues.push(`TRACK_MISMATCH suggested=${parsed.track_slug}`)
      if (photo.year !== parsed.year) issues.push(`YEAR_MISMATCH suggested=${parsed.year}`)
      if (photo.driver_slug !== parsed.driver_slug) issues.push(`DRIVER_MISMATCH suggested=${parsed.driver_slug}`)
      if (photo.photographer_slug !== parsed.photographer_slug) issues.push(`PHOTOGRAPHER_MISMATCH suggested=${parsed.photographer_slug}`)
      if (photo.credit_type !== parsed.credit_type) issues.push(`CREDIT_MISMATCH suggested=${parsed.credit_type}`)
    }

    if (issues.length > 0) {
      rows.push({
        photo_id: photo.photo_id,
        file_name: photo.file_name,
        track_slug: photo.track_slug,
        year: photo.year,
        driver_slug: photo.driver_slug,
        photographer_slug: photo.photographer_slug,
        credit_type: photo.credit_type,
        expected_path: expectedPath,
        issues: issues.join('; '),
      })
    }
  }

  const header = [
    'photo_id',
    'file_name',
    'track_slug',
    'year',
    'driver_slug',
    'photographer_slug',
    'credit_type',
    'expected_path',
    'issues',
  ]

  const csv = [
    header.join(','),
    ...rows.map((r) => header.map((h) => csvEscape(r[h])).join(',')),
  ].join('\n')

  fs.writeFileSync('photo-audit-report.csv', csv)

  console.log(`Audit issues found: ${rows.length}`)
  console.log('Created photo-audit-report.csv')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})