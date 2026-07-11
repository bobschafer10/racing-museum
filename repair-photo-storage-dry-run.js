import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'media'
const PREFIX = 'photos/master'

const { data, error } = await supabase.storage
  .from(BUCKET)
  .list(PREFIX, { limit: 1000 })

if (error) throw error

const rows = [
  ['old_path', 'new_path', 'action', 'notes']
]

for (const file of data) {
  const name = file.name

  if (!name.toLowerCase().endsWith('.jpg')) continue

  const oldPath = `${PREFIX}/${name}`

  let fixedName = name
    .replace(/_(\d{4})-/, '_$1_')
    .replace(/_unknown_year_/, '_unknown-year_')
    .replace(/_unknow-year_/, '_unknown-year_')
    .replace(/post-/, 'post_')
    .replace(/photo-/, 'photo_')
    .replace(/\.jpg\s*$/i, '.jpg')
    .trim()

  const match = fixedName.match(/^(.+)_(\d{4}|unknown-year)_(.+)$/)

  if (!match) {
    rows.push([oldPath, '', 'REVIEW', 'Could not parse track/year'])
    continue
  }

  const [, trackSlug, year] = match
  const newPath = `${PREFIX}/${trackSlug}/${year}/${fixedName}`

  const action = fixedName === name ? 'MOVE' : 'RENAME_AND_MOVE'

  rows.push([oldPath, newPath, action, ''])
}

const csv = rows
  .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
  .join('\n')

fs.writeFileSync('photo-storage-repair-dry-run.csv', csv)

console.log(`Created photo-storage-repair-dry-run.csv with ${rows.length - 1} rows`)