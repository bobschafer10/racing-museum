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

function writeCsv(fileName, rows, headers) {
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')),
  ].join('\n')

  fs.writeFileSync(fileName, csv)
}

function sqlEscape(value) {
  if (value === null || value === undefined) return null
  return String(value).replace(/'/g, "''")
}

function parsePhotoFile(fileName) {
  const extMatch = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const extension = extMatch ? extMatch[1].toLowerCase() : ''
  const base = fileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
  const parts = base.split('_')

  if (parts.length !== 6) {
    return { valid: false, extension, parts }
  }

  return {
    valid: true,
    extension,
    track_slug: parts[0],
    year: parts[1],
    driver_slug: parts[2],
    photographer_slug: parts[3],
    credit_type: parts[4],
    sequence: parts[5],
    parts,
  }
}

function isFullUnknown(photo) {
  return (
    photo.track_slug === 'unknown-track' &&
    photo.year === 'unknown-year' &&
    photo.driver_slug === 'unknown-driver' &&
    photo.photographer_slug === 'unknown-photographer'
  )
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

function fetchStorageObjects() {
  const file = 'storage-photos.csv'

  if (!fs.existsSync(file)) {
    throw new Error(
      'Missing storage-photos.csv. Save the export in the project root.'
    )
  }

  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/).filter(Boolean)

  return lines
    .slice(1)
    .map((line) => line.replace(/^"|"$/g, '').trim())
    .filter(Boolean)
}

async function main() {
  console.log('Fetching photos table...')
  const photos = await fetchAllPhotos()
  console.log(`Photos table rows: ${photos.length}`)

  console.log('Fetching storage photos...')
  const storagePaths = fetchStorageObjects()
  const storageSet = new Set(storagePaths)
  console.log(`Storage photo files: ${storagePaths.length}`)

  const expectedSet = new Set()

  const metadataIssues = []
  const storageMissing = []
  const safeFixes = []
  const filenameProblems = []

  let fullUnknownCount = 0
  let foundCount = 0
  let missingCount = 0

  for (const photo of photos) {
    const parsed = parsePhotoFile(photo.file_name)
    const expectedPath = `photos/master/${photo.track_slug}/${photo.year}/${photo.file_name}`
    expectedSet.add(expectedPath)

    if (isFullUnknown(photo)) fullUnknownCount++

    const existsInStorage = storageSet.has(expectedPath)

    if (existsInStorage) {
      foundCount++
    } else {
      missingCount++
      storageMissing.push({
        photo_id: photo.photo_id,
        file_name: photo.file_name,
        track_slug: photo.track_slug,
        year: photo.year,
        driver_slug: photo.driver_slug,
        photographer_slug: photo.photographer_slug,
        credit_type: photo.credit_type,
        expected_path: expectedPath,
        full_unknown: isFullUnknown(photo) ? 'YES' : 'NO',
      })
    }

    const issues = []
    const suggested = {}

    if (!parsed.valid) {
      issues.push('BAD_FILENAME_FORMAT')
      filenameProblems.push({
        photo_id: photo.photo_id,
        file_name: photo.file_name,
        parts_found: parsed.parts.length,
        issue: 'Expected exactly 6 underscore-separated parts before extension',
      })
    }

    if (photo.year === 'unkown-year') {
      issues.push('MISSPELLED_YEAR')
      suggested.year = 'unknown-year'
    }

    if (photo.year === 'Unknown-year') {
      issues.push('CAPITALIZED_UNKNOWN_YEAR')
      suggested.year = 'unknown-year'
    }

    if (photo.year === 'uknown-year') {
      issues.push('MISSPELLED_YEAR_UKNOWN')
      suggested.year = 'unknown-year'
    }

    if (photo.track_slug === 'unknown_track') {
      issues.push('UNKNOWN_TRACK_UNDERSCORE')
      suggested.track_slug = 'unknown-track'
    }

    if (parsed.valid) {
      if (photo.track_slug !== parsed.track_slug) {
        issues.push(`TRACK_MISMATCH suggested=${parsed.track_slug}`)
        suggested.track_slug = parsed.track_slug
      }

      if (photo.year !== parsed.year) {
        issues.push(`YEAR_MISMATCH suggested=${parsed.year}`)
        suggested.year = parsed.year
      }

      if (photo.driver_slug !== parsed.driver_slug) {
        issues.push(`DRIVER_MISMATCH suggested=${parsed.driver_slug}`)
        suggested.driver_slug = parsed.driver_slug
      }

      if (photo.photographer_slug !== parsed.photographer_slug) {
        issues.push(`PHOTOGRAPHER_MISMATCH suggested=${parsed.photographer_slug}`)
        suggested.photographer_slug = parsed.photographer_slug
      }

      if (photo.credit_type !== parsed.credit_type) {
        issues.push(`CREDIT_MISMATCH suggested=${parsed.credit_type}`)
        suggested.credit_type = parsed.credit_type
      }
    }

    if (photo.driver_slug?.includes('speedway')) issues.push('DRIVER_CONTAINS_SPEEDWAY')
    if (photo.driver_slug?.includes('photo')) issues.push('DRIVER_CONTAINS_PHOTO')
    if (photo.driver_slug?.includes('post')) issues.push('DRIVER_CONTAINS_POST')
    if (photo.driver_slug?.includes('checkered')) issues.push('DRIVER_CONTAINS_CHECKERED')

    if (issues.length > 0) {
      metadataIssues.push({
        photo_id: photo.photo_id,
        file_name: photo.file_name,
        track_slug: photo.track_slug,
        year: photo.year,
        driver_slug: photo.driver_slug,
        photographer_slug: photo.photographer_slug,
        credit_type: photo.credit_type,
        expected_path: expectedPath,
        exists_in_storage: existsInStorage ? 'YES' : 'NO',
        full_unknown: isFullUnknown(photo) ? 'YES' : 'NO',
        issues: issues.join('; '),
        suggested_track_slug: suggested.track_slug || '',
        suggested_year: suggested.year || '',
        suggested_driver_slug: suggested.driver_slug || '',
        suggested_photographer_slug: suggested.photographer_slug || '',
        suggested_credit_type: suggested.credit_type || '',
      })

      const setParts = []

      for (const [field, value] of Object.entries(suggested)) {
        setParts.push(`${field} = '${sqlEscape(value)}'`)
      }

      const allowedSafeFields = ['year', 'track_slug', 'photographer_slug', 'credit_type']

const blockedValues = [
  'unknown',
  'Unknown-year',
  'uknown-year',
  'unknonwn-year',
  'speedway-joe-slack-phot',
  'post-001.jpg',
]

const safeSetParts = setParts.filter((part) => {
  const field = part.split('=')[0].trim()
  const value = part.split("'")[1]

  if (!allowedSafeFields.includes(field)) return false
  if (!value) return false
  if (blockedValues.includes(value)) return false
  if (value.includes(' ')) return false
  if (value.includes('.jpg')) return false
  if (value.includes('.jpeg')) return false
  if (value.includes('.png')) return false
  if (value.includes('.gif')) return false

  return true
})

if (safeSetParts.length > 0) {
  safeFixes.push(
    `update photos set ${safeSetParts.join(', ')} where photo_id = ${photo.photo_id};`
  )
}
    }
  }

  const storageOrphans = storagePaths
    .filter((path) => !expectedSet.has(path))
    .map((path) => ({ storage_path: path }))

  writeCsv(
    'photo-audit-summary.csv',
    [
      { metric: 'photos_table_rows', value: photos.length },
      { metric: 'storage_photo_files', value: storagePaths.length },
      { metric: 'matched_storage_files', value: foundCount },
      { metric: 'missing_storage_files', value: missingCount },
      { metric: 'storage_orphans', value: storageOrphans.length },
      { metric: 'metadata_issue_rows', value: metadataIssues.length },
      { metric: 'filename_problem_rows', value: filenameProblems.length },
      { metric: 'full_unknown_rows', value: fullUnknownCount },
      { metric: 'safe_sql_fix_count', value: safeFixes.length },
    ],
    ['metric', 'value']
  )

  writeCsv(
    'photo-metadata-issues.csv',
    metadataIssues,
    [
      'photo_id',
      'file_name',
      'track_slug',
      'year',
      'driver_slug',
      'photographer_slug',
      'credit_type',
      'expected_path',
      'exists_in_storage',
      'full_unknown',
      'issues',
      'suggested_track_slug',
      'suggested_year',
      'suggested_driver_slug',
      'suggested_photographer_slug',
      'suggested_credit_type',
    ]
  )

  writeCsv(
    'photo-storage-missing.csv',
    storageMissing,
    [
      'photo_id',
      'file_name',
      'track_slug',
      'year',
      'driver_slug',
      'photographer_slug',
      'credit_type',
      'expected_path',
      'full_unknown',
    ]
  )

  writeCsv(
    'photo-storage-orphans.csv',
    storageOrphans,
    ['storage_path']
  )

  writeCsv(
    'photo-filename-problems.csv',
    filenameProblems,
    ['photo_id', 'file_name', 'parts_found', 'issue']
  )

  fs.writeFileSync(
    'photo-safe-fixes.sql',
    [
      '-- Review before running.',
      '-- Generated by scripts/photo-audit.js',
      '',
      ...safeFixes,
      '',
    ].join('\n')
  )

  console.log('Created:')
  console.log('photo-audit-summary.csv')
  console.log('photo-metadata-issues.csv')
  console.log('photo-storage-missing.csv')
  console.log('photo-storage-orphans.csv')
  console.log('photo-filename-problems.csv')
  console.log('photo-safe-fixes.sql')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})