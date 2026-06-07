const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: ".env.local" })
const { createClient } = require("@supabase/supabase-js")

const ROOT = process.cwd()
const PHOTOS_DIR = path.join(ROOT, "public", "photos")
const MANIFEST_PATH = path.join(ROOT, "public", "data", "photos", "all.json")

const BUCKET = "media"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".png") return "image/png"
  if (ext === ".webp") return "image/webp"
  return "application/octet-stream"
}

async function uploadOne(photo) {
  const localPath = path.join(PHOTOS_DIR, photo.fileName)

  if (!fs.existsSync(localPath)) {
    console.warn(`Missing local file: ${photo.fileName}`)
    return
  }

  const buffer = fs.readFileSync(localPath)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(photo.storagePath, buffer, {
      contentType: getContentType(photo.fileName),
      upsert: true,
    })

  if (error) {
    console.error(`Failed: ${photo.fileName}`)
    console.error(error.message)
    return
  }

  console.log(`Uploaded: ${photo.storagePath}`)
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("Missing manifest. Run build-photo-manifests.js first.")
    process.exit(1)
  }

  const photos = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))

  const pilotSlug = process.argv[2]

  const uploadList = pilotSlug
    ? photos.filter((p) => p.trackSlug === pilotSlug)
    : photos

  console.log(`Photos to upload: ${uploadList.length}`)

  for (const photo of uploadList) {
    await uploadOne(photo)
  }

  console.log("Upload complete.")
}

main()