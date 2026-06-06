require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const batches = require('./newspaper-batches')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'media'

let uploaded = 0
let skipped = 0

async function walk(localRoot, remoteRoot, dir = localRoot) {
  if (!fs.existsSync(dir)) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      await walk(localRoot, remoteRoot, fullPath)
      continue
    }

    if (!/\.(jpg|jpeg|png|webp|json|txt)$/i.test(entry.name)) continue

    const relativePath = path.relative(localRoot, fullPath).replace(/\\/g, '/')
    const remotePath = `${remoteRoot}/${relativePath}`

    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list(path.dirname(remotePath), {
        search: path.basename(remotePath),
      })

    const alreadyExists =
      existing && existing.find((file) => file.name === path.basename(remotePath))

    if (alreadyExists) {
      skipped++
      console.log(`SKIP ${skipped}: ${remotePath}`)
      continue
    }

    const fileBuffer = fs.readFileSync(fullPath)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(remotePath, fileBuffer, {
        contentType: getContentType(entry.name),
      })

    if (error) {
      console.log(`ERROR: ${remotePath}`)
      console.log(error.message)
    } else {
      uploaded++
      console.log(`UPLOAD ${uploaded}: ${remotePath}`)
    }
  }
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.json') return 'application/json'
  if (ext === '.txt') return 'text/plain'
  return 'application/octet-stream'
}

async function main() {
  for (const batch of batches) {
    if (!fs.existsSync(batch.localRoot)) {
      console.log(`MISSING: ${batch.localRoot}`)
      continue
    }

    console.log(`\nUploading ${batch.publicationName}: ${batch.localRoot}`)

    await walk(
      batch.localRoot,
      `newspapers/${batch.publicationSlug}`
    )
  }

  console.log('\nDONE')
  console.log(`Uploaded: ${uploaded}`)
  console.log(`Skipped: ${skipped}`)
}

main()