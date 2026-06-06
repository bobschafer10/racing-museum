const fs = require('fs')
const path = require('path')
const batches = require('./newspaper-batches')

const OUT_DIR = path.join(process.cwd(), 'public', 'data')
const OUT_FILE = path.join(OUT_DIR, 'newspapers-manifest.json')
const STORAGE_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/newspapers'

function sortPages(files) {
  return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function buildIssue(batch, issueSlug) {
  const issuePath = path.join(process.cwd(), batch.localRoot, issueSlug)

  const pageFiles = sortPages(
    fs
      .readdirSync(issuePath)
      .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
  )

  const pages = pageFiles.map(
    (file) =>
      `${STORAGE_BASE}/${batch.publicationSlug}/${issueSlug}/${encodeURIComponent(file)}`
  )

  return {
    slug: issueSlug,
    title: `${batch.publicationName} - ${issueSlug}`,
    publication: batch.publicationName,
    publicationSlug: batch.publicationSlug,
    year: Number(issueSlug.slice(0, 4)),
    issueDate: issueSlug,
    description: null,
    summary: null,
    coverImage: pages[0] ?? "",
    pages,
    featured: false,
  }
}

function main() {
  const issues = []

  for (const batch of batches) {
    const fullRoot = path.join(process.cwd(), batch.localRoot)

    if (!fs.existsSync(fullRoot)) {
      console.log(`MISSING: ${batch.localRoot}`)
      continue
    }

    const issueFolders = fs
      .readdirSync(fullRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())

    for (const issueFolder of issueFolders) {
      issues.push(buildIssue(batch, issueFolder.name))
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(issues, null, 2))

  console.log(`Wrote ${issues.length} newspaper issues to ${OUT_FILE}`)
}

main()