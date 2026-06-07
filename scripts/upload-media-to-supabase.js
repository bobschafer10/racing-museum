require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'media'

const LOCAL_ROOT = 'newspaper_staging/cfrn_1969'
const REMOTE_ROOT = 'newspapers/checkered-flag-racing-news'

let uploaded = 0
let skipped = 0

async function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      await walk(fullPath)
      continue
    }

    const relativePath = path
      .relative(LOCAL_ROOT, fullPath)
      .replace(/\\/g, '/')

    const remotePath = `${REMOTE_ROOT}/${relativePath}`

    try {
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(path.dirname(remotePath), {
          search: path.basename(remotePath),
        })

      const alreadyExists =
        existing &&
        existing.find((f) => f.name === path.basename(remotePath))

      if (alreadyExists) {
        skipped++
        console.log(`SKIP ${skipped}: ${remotePath}`)
        continue
      }

      const fileBuffer = fs.readFileSync(fullPath)

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(remotePath, fileBuffer, {
          contentType: getContentType(fullPath),
        })

      if (error) {
        console.log(`ERROR: ${remotePath}`)
        console.log(error.message)
      } else {
        uploaded++
        console.log(`UPLOAD ${uploaded}: ${remotePath}`)
      }
    } catch (err) {
      console.log(`FAILED: ${remotePath}`)
      console.log(err.message)
    }
  }
}

function getContentType(file) {
  const ext = path.extname(file).toLowerCase()

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.json') return 'application/json'

  return 'application/octet-stream'
}

walk(LOCAL_ROOT).then(() => {
  console.log('DONE')
  console.log(`Uploaded: ${uploaded}`)
  console.log(`Skipped: ${skipped}`)
})