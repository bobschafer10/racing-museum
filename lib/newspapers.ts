// lib/newspapers.ts

import { promises as fs } from "fs"
import path from "path"

export type NewspaperIssue = {
  slug: string
  title: string
  publication: string
  publicationSlug: string
  year: number
  issueDate: string
  description?: string
  coverImage: string
  pages: string[]
  featured?: boolean
}

export type NewspaperPublication = {
  slug: string
  name: string
  logo: string
}

export const newspaperPublications: NewspaperPublication[] = [
  {
    slug: "checkered-flag-racing-news",
    name: "Checkered Flag Racing News",
    logo: "/logos/newspapers/checkered-flag-racing-news.jpg",
  },
  {
    slug: "midwest-racing-news",
    name: "Midwest Racing News",
    logo: "/logos/newspapers/midwest-racing-news.jpg",
  },
  {
    slug: "national-speed-sport-news",
    name: "National Speed Sport News",
    logo: "/logos/newspapers/national-speed-sport-news.png",
  },
]

const NEWSPAPER_ROOT = path.join(
  process.cwd(),
  "public",
  "media",
  "newspapers"
)

type NewspaperMeta = {
  title?: string
  date?: string
  year?: number
  issue?: number
  description?: string
  featured?: boolean
}

function getPublicationName(publicationSlug: string) {
  return (
    newspaperPublications.find((pub) => pub.slug === publicationSlug)?.name ??
    publicationSlug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}

function titleFromDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function sortPageImages(files: string[]) {
  return files.sort((a, b) => {
    const aName = a.toLowerCase()
    const bName = b.toLowerCase()

    if (aName.includes("front_cover")) return -1
    if (bName.includes("front_cover")) return 1

    if (aName.includes("back_cover")) return 1
    if (bName.includes("back_cover")) return -1

    const aNum = aName.match(/\d+/)?.[0]
    const bNum = bName.match(/\d+/)?.[0]

    if (aNum && bNum) return Number(aNum) - Number(bNum)

    return aName.localeCompare(bName)
  })
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readMeta(issuePath: string): Promise<NewspaperMeta> {
  const metaPath = path.join(issuePath, "meta.json")

  if (!(await fileExists(metaPath))) return {}

  try {
    const raw = await fs.readFile(metaPath, "utf8")
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function getNewspaperIssues(): Promise<NewspaperIssue[]> {
  const issues: NewspaperIssue[] = []

  if (!(await fileExists(NEWSPAPER_ROOT))) return issues

  const publicationFolders = await fs.readdir(NEWSPAPER_ROOT, {
    withFileTypes: true,
  })

  for (const publicationFolder of publicationFolders) {
    if (!publicationFolder.isDirectory()) continue

    const publicationSlug = publicationFolder.name
    const publicationPath = path.join(NEWSPAPER_ROOT, publicationSlug)
    const publicationName = getPublicationName(publicationSlug)

    const issueFolders = await fs.readdir(publicationPath, {
      withFileTypes: true,
    })

    for (const issueFolder of issueFolders) {
      if (!issueFolder.isDirectory()) continue

      const issueSlug = issueFolder.name
      const issuePath = path.join(publicationPath, issueSlug)
      const meta = await readMeta(issuePath)

      const files = await fs.readdir(issuePath)

      const imageFiles = sortPageImages(
        files.filter((file) =>
          /\.(jpg|jpeg|png|webp)$/i.test(file)
        )
      )

      if (imageFiles.length === 0) continue

      const issueDate =
        meta.date ??
        issueSlug.match(/\d{4}-\d{2}-\d{2}/)?.[0] ??
        ""

      const year =
        meta.year ??
        (issueDate ? Number(issueDate.slice(0, 4)) : 0)

      const pages = imageFiles.map(
        (file) =>
          `/media/newspapers/${publicationSlug}/${issueSlug}/${file}`
      )

      const coverImage =
        pages.find((page) => page.toLowerCase().includes("front_cover")) ??
        pages[0]

      issues.push({
        slug: issueSlug,
        title: meta.title ?? `${titleFromDate(issueDate)} Issue`,
        publication: publicationName,
        publicationSlug,
        year,
        issueDate,
        description: meta.description,
        coverImage,
        pages,
        featured: meta.featured,
      })
    }
  }

  return issues.sort((a, b) => {
    if (a.publicationSlug !== b.publicationSlug) {
      return a.publicationSlug.localeCompare(b.publicationSlug)
    }

    return a.issueDate.localeCompare(b.issueDate)
  })
}

export async function getNewspaperIssuesByPublication(publicationSlug: string) {
  const issues = await getNewspaperIssues()
  return issues.filter((issue) => issue.publicationSlug === publicationSlug)
}

export async function getNewspaperIssue(
  publicationSlug: string,
  issueSlug: string
) {
  const issues = await getNewspaperIssues()
  return issues.find(
    (issue) =>
      issue.publicationSlug === publicationSlug &&
      issue.slug === issueSlug
  )
}