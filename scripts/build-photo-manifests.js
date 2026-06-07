const fs = require("fs")
const path = require("path")

const ROOT = process.cwd()
const PHOTOS_DIR = path.join(ROOT, "public", "photos")
const OUT_DIR = path.join(ROOT, "public", "data", "photos")

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"])

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function walk(dir) {
  let files = []
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) files = files.concat(walk(full))
    else files.push(full)
  }
  return files
}

function parsePhoto(filePath) {
  const fileName = path.basename(filePath)
  const ext = path.extname(fileName).toLowerCase()

  if (!IMAGE_EXTS.has(ext)) return null

  const base = fileName.replace(ext, "")
  const parts = base.split("_")

  const trackSlug = parts[0] || "unknown-track"
  const year = parts[1] || "unknown-year"
  const driverSlug = parts[2] || "unknown-driver"
  const photographerSlug = parts[3] || "unknown-photographer"
  const creditType = parts[4] || "photo"
  const sequence = parts[5] || "001"

  const storagePath = `photos/master/${trackSlug}/${year}/${fileName}`

  return {
    fileName,
    storagePath,
    publicPath: `/photos/${fileName}`,
    trackSlug,
    year,
    driverSlug,
    photographerSlug,
    creditType,
    sequence,
  }
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

function main() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`Missing photos folder: ${PHOTOS_DIR}`)
    process.exit(1)
  }

  ensureDir(OUT_DIR)

  const files = walk(PHOTOS_DIR)
  const photos = files.map(parsePhoto).filter(Boolean)

  photos.sort((a, b) => {
    return (
      String(a.trackSlug).localeCompare(String(b.trackSlug)) ||
      String(a.year).localeCompare(String(b.year)) ||
      String(a.driverSlug).localeCompare(String(b.driverSlug)) ||
      String(a.fileName).localeCompare(String(b.fileName))
    )
  })

  writeJson(path.join(OUT_DIR, "all.json"), photos)

  const groups = [
    ["tracks", "trackSlug"],
    ["drivers", "driverSlug"],
    ["photographers", "photographerSlug"],
    ["years", "year"],
  ]

  for (const [folder, key] of groups) {
    const grouped = groupBy(photos, key)

    for (const [slug, items] of Object.entries(grouped)) {
      writeJson(path.join(OUT_DIR, folder, `${slug}.json`), items)
    }
  }

  console.log(`Photos scanned: ${photos.length}`)
  console.log(`Manifest written to: public/data/photos`)
}

main()