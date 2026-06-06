const fs = require('fs')
const path = require('path')

const PROGRAMS_DIR = path.join(process.cwd(), 'public', 'media', 'programs')
const OUT_DIR = path.join(process.cwd(), 'public', 'data')
const OUT_FILE = path.join(OUT_DIR, 'race-programs-manifest.json')

const STORAGE_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/programs'

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter((part) => part !== 'wi' && part !== 'il')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function extractYear(slug) {
  const match = slug.match(/^(\d{4})/)
  return match ? Number(match[1]) : null
}

function main() {
  const folders = fs.readdirSync(PROGRAMS_DIR, { withFileTypes: true })

  const programs = folders
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name
      const folder = path.join(PROGRAMS_DIR, slug)
      const meta = readJson(path.join(folder, 'meta.json'))

      const images = fs
        .readdirSync(folder)
        .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((file) => `${STORAGE_BASE}/${slug}/${encodeURIComponent(file)}`)

      const coverImage =
        images.find((img) => img.toLowerCase().includes('front-cover')) ??
        images[0] ??
        null

      const backCoverImage =
        images.find((img) => img.toLowerCase().includes('back-cover')) ?? null

      return {
        slug,
        title: meta.title ?? titleFromSlug(slug),
        year: meta.year ?? extractYear(slug),
        track: meta.track ?? null,
        track_slug: meta.track_slug ?? null,
        series: meta.series ?? null,
        series_slug: meta.series_slug ?? null,
        type: meta.type ?? null,
        images,
        coverImage,
        backCoverImage,
      }
    })

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(programs, null, 2))

  console.log(`Wrote ${programs.length} programs to ${OUT_FILE}`)
}

main()