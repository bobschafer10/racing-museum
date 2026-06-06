const fs = require('fs')
const path = require('path')

const LOCAL_ROOT = path.join(process.cwd(), 'newspaper_staging', 'cfrn_1969')
const OUT_DIR = path.join(process.cwd(), 'public', 'data')
const OUT_FILE = path.join(OUT_DIR, 'newspapers-manifest.json')

const PUBLICATION_SLUG = 'checkered-flag-racing-news'
const PUBLICATION_NAME = 'Checkered Flag Racing News'
const STORAGE_BASE =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/newspapers/checkered-flag-racing-news'

function sortPages(files) {
  return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function main() {
  const issueFolders = fs.readdirSync(LOCAL_ROOT, { withFileTypes: true })

  const issues = issueFolders
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const issueSlug = entry.name
      const issuePath = path.join(LOCAL_ROOT, issueSlug)

      const pageFiles = sortPages(
        fs
          .readdirSync(issuePath)
          .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
      )

      const pages = pageFiles.map(
        (file) => `${STORAGE_BASE}/${issueSlug}/${encodeURIComponent(file)}`
      )

      return {
        slug: issueSlug,
        title: `${PUBLICATION_NAME} - ${issueSlug}`,
        publication: PUBLICATION_NAME,
        publicationSlug: PUBLICATION_SLUG,
        year: Number(issueSlug.slice(0, 4)),
        issueDate: issueSlug,
        description: null,
        coverImage: pages[0] ?? null,
        pages,
        featured: false,
      }
    })

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(issues, null, 2))

  console.log(`Wrote ${issues.length} newspaper issues to ${OUT_FILE}`)
}

main()