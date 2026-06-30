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
  backCoverImage?: string
  thumbnail?: string
  pages: string[]
  featured?: boolean
  volume?: string | number
  number?: string | number
  highlights?: string[]
  rawOcrHighlights?: string[]
  topics?: string[]
  ocrConfidence?: number | null
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

function sortIssues(a: NewspaperIssue, b: NewspaperIssue) {
  if (a.publicationSlug !== b.publicationSlug) {
    return a.publicationSlug.localeCompare(b.publicationSlug)
  }

  return a.issueDate.localeCompare(b.issueDate)
}

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

    return issues.sort(sortIssues)
  } catch (error) {
    console.error("NEWSPAPER MANIFEST ERROR:", error)
    return []
  }
}

export async function getNewspaperIssuesByPublication(
  publicationSlug: string
): Promise<NewspaperIssue[]> {
  const issues = await getNewspaperIssues()

  return issues.filter(
    (issue) => issue.publicationSlug === publicationSlug
  )
}

export async function getNewspaperIssuesByYear(
  publicationSlug: string,
  year: string | number
): Promise<NewspaperIssue[]> {
  const issues = await getNewspaperIssues()

  return issues.filter(
    (issue) =>
      issue.publicationSlug === publicationSlug &&
      String(issue.year) === String(year)
  )
}

export async function getNewspaperIssue(
  publicationSlug: string,
  issueSlug: string
): Promise<NewspaperIssue | undefined> {
  const issues = await getNewspaperIssues()

  return issues.find(
    (issue) =>
      issue.publicationSlug === publicationSlug &&
      issue.slug === issueSlug
  )
}

export async function getFeaturedNewspaperIssues(): Promise<NewspaperIssue[]> {
  const issues = await getNewspaperIssues()
  return issues.filter((issue) => issue.featured)
}

export async function getNewspaperArchiveSummary() {
  const issues = await getNewspaperIssues()

  const publications = new Map<
    string,
    {
      slug: string
      name: string
      issueCount: number
      years: Record<string, number>
      firstYear: string
      lastYear: string
    }
  >()

  for (const issue of issues) {
    const year = String(issue.year)

    if (!publications.has(issue.publicationSlug)) {
      publications.set(issue.publicationSlug, {
        slug: issue.publicationSlug,
        name: issue.publication,
        issueCount: 0,
        years: {},
        firstYear: year,
        lastYear: year,
      })
    }

    const pub = publications.get(issue.publicationSlug)!

    pub.issueCount += 1
    pub.years[year] = (pub.years[year] || 0) + 1

    if (year < pub.firstYear) pub.firstYear = year
    if (year > pub.lastYear) pub.lastYear = year
  }

  return {
    totalIssues: issues.length,
    totalPublications: publications.size,
    totalYears: new Set(issues.map((issue) => String(issue.year))).size,
    publications: Array.from(publications.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  }
}