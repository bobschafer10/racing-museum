import { promises as fs } from "fs"
import path from "path"

export type NewspaperIssue = {
  slug: string
  title: string
  publication: string
  publicationSlug: string
  year: number
  issueDate: string
  description?: string | null
  summary?: string | null
  coverImage: string
  pages: string[]
  featured?: boolean
  volume?: string | number
  number?: string | number
}

export type NewspaperPublication = {
  slug: string
  name: string
  logo: string
  status?: "active" | "coming-soon"
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

export async function getNewspaperIssues(): Promise<NewspaperIssue[]> {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "public",
      "data",
      "newspapers-manifest.json"
    )

    const raw = await fs.readFile(manifestPath, "utf-8")
    const issues = JSON.parse(raw) as NewspaperIssue[]

    return issues.sort((a, b) => {
      if (a.publicationSlug !== b.publicationSlug) {
        return a.publicationSlug.localeCompare(b.publicationSlug)
      }

      return a.issueDate.localeCompare(b.issueDate)
    })
  } catch (error) {
    console.error("NEWSPAPER MANIFEST ERROR:", error)
    return []
  }
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