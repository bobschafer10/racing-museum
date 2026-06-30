require("dotenv").config()
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase URL or key in .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = "media"

const PUBLICATION_NAMES = {
  "checkered-flag-racing-news": "Checkered Flag Racing News",
  "midwest-racing-news": "Midwest Racing News",
  "national-speed-sport-news": "National Speed Sport News",
  "hawkeye-racing-news": "Hawkeye Racing News",
  "all-the-dirt-racing-news": "All The Dirt Racing News",
}

function publicUrl(filePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`
}

function isImage(name) {
  return /\.(jpg|jpeg|png|webp)$/i.test(name)
}

function isFolder(item) {
  return !item.name.includes(".")
}

function pageSortValue(name) {
  const match = name.match(/^(\d+)/)
  return match ? Number(match[1]) : 9999
}

function titleFromDate(slug) {
  const [y, m, d] = slug.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

async function list(pathName) {
  const { data, error } = await supabase.storage.from(BUCKET).list(pathName, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  })

  if (error) {
    console.error(`List failed: ${pathName}`, error.message)
    return []
  }

  return data || []
}

async function downloadJson(filePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath)
  if (error || !data) return null

  try {
    return JSON.parse(await data.text())
  } catch {
    return null
  }
}

async function rebuild() {
  const manifest = []

  const publicationFolders = (await list("newspapers")).filter(isFolder)

  for (const pub of publicationFolders) {
    const publicationSlug = pub.name
    const publicationName = PUBLICATION_NAMES[publicationSlug] || publicationSlug

    const issueFolders = (await list(`newspapers/${publicationSlug}`)).filter(isFolder)

    for (const issue of issueFolders) {
      const issueSlug = issue.name
      const issuePath = `newspapers/${publicationSlug}/${issueSlug}`
      const files = await list(issuePath)

      const metadata = await downloadJson(`${issuePath}/newspaper.json`)

      const imageFiles = files
        .filter((file) => isImage(file.name))
        .map((file) => file.name)

      const pages = imageFiles
        .filter(
          (name) =>
            name !== "front-cover.jpg" &&
            name !== "back-cover.jpg" &&
            name !== "thumbnail.jpg"
        )
                .sort((a, b) => pageSortValue(a) - pageSortValue(b))
        .map((name) => publicUrl(`${issuePath}/${name}`))

      const issueDate = metadata?.issueDate || issueSlug
      const year = Number(issueDate.substring(0, 4))

      manifest.push({
        slug: metadata?.slug || issueSlug,
        title: metadata?.title || titleFromDate(issueSlug),
        publication: metadata?.publication || publicationName,
        publicationSlug,
        year,
        issueDate,
        description: metadata?.description ?? null,
        summary:
          metadata?.summary ||
          `This ${titleFromDate(issueSlug)} issue of ${publicationName} preserves regional short-track racing coverage from the Upper Midwest, including race reports, photographs, schedules, advertisements, and period racing news from the season.`,
        highlights: metadata?.highlights || [],
        rawOcrHighlights: metadata?.rawOcrHighlights || [],
        topics: metadata?.topics || ["Newspaper Coverage"],
        ocrConfidence: metadata?.ocrConfidence ?? null,
        coverImage: metadata?.coverImage || publicUrl(`${issuePath}/front-cover.jpg`),
        backCoverImage:
          metadata?.backCoverImage || publicUrl(`${issuePath}/back-cover.jpg`),
        thumbnail: metadata?.thumbnail || publicUrl(`${issuePath}/thumbnail.jpg`),
        pages: metadata?.pages?.length ? metadata.pages : pages,
        featured: metadata?.featured || false,
        volume: metadata?.volume,
        number: metadata?.number,
      })
    }
  }

  manifest.sort((a, b) => {
    if (a.publicationSlug !== b.publicationSlug) {
      return a.publicationSlug.localeCompare(b.publicationSlug)
    }

    return a.issueDate.localeCompare(b.issueDate)
  })

  const managerManifestPath = path.join(
    __dirname,
    "public",
    "data",
    "newspapers-manifest.json"
  )

  const websiteManifestPath = path.join(
    __dirname,
    "..",
    "public",
    "data",
    "newspapers-manifest.json"
  )

  fs.mkdirSync(path.dirname(managerManifestPath), { recursive: true })
  fs.mkdirSync(path.dirname(websiteManifestPath), { recursive: true })

  fs.writeFileSync(managerManifestPath, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(websiteManifestPath, JSON.stringify(manifest, null, 2))

  console.log(`Rebuilt newspaper manifest with ${manifest.length} issues.`)
  console.log(
    "CFRN 1969:",
    manifest.filter(
      (x) =>
        x.publicationSlug === "checkered-flag-racing-news" && x.year === 1969
    ).length
  )
  console.log(
    "CFRN 1970:",
    manifest.filter(
      (x) =>
        x.publicationSlug === "checkered-flag-racing-news" && x.year === 1970
    ).length
  )
  console.log(
    "MRN:",
    manifest.filter((x) => x.publicationSlug === "midwest-racing-news").length
  )
}

rebuild().catch((error) => {
  console.error(error)
  process.exit(1)
})