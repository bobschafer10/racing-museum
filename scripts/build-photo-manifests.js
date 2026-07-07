const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "public", "data", "photos")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "unknown"
    if (!acc[value]) acc[value] = []
    acc[value].push(item)
    return acc
  }, {})
}

async function fetchAllPhotos() {
  let all = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from("photos")
      .select("file_name, track_slug, year, driver_slug, photographer_slug, credit_type, sequence")
      .order("track_slug")
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    all = all.concat(data)
    if (data.length < pageSize) break

    from += pageSize
  }

  return all
}

async function main() {
  ensureDir(OUT_DIR)

  const rows = await fetchAllPhotos()

  const photos = rows.map((photo) => ({
    fileName: photo.file_name,
    storagePath: `photos/master/${photo.track_slug}/${photo.year}/${photo.file_name}`,
    publicPath: `/photos/${photo.file_name}`,
    trackSlug: photo.track_slug,
    year: photo.year,
    driverSlug: photo.driver_slug,
    photographerSlug: photo.photographer_slug,
    creditType: photo.credit_type,
    sequence: String(photo.sequence || ""),
  }))

  photos.sort((a, b) =>
    String(a.trackSlug).localeCompare(String(b.trackSlug)) ||
    String(a.year).localeCompare(String(b.year)) ||
    String(a.driverSlug).localeCompare(String(b.driverSlug)) ||
    String(a.fileName).localeCompare(String(b.fileName))
  )

  writeJson(path.join(OUT_DIR, "all.json"), photos)

  for (const [folder, key] of [
    ["tracks", "trackSlug"],
    ["drivers", "driverSlug"],
    ["photographers", "photographerSlug"],
    ["years", "year"],
  ]) {
    const grouped = groupBy(photos, key)

    for (const [slug, items] of Object.entries(grouped)) {
      writeJson(path.join(OUT_DIR, folder, `${slug}.json`), items)
    }
  }

  console.log(`Photos scanned from Supabase: ${photos.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})