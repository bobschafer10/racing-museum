import { promises as fs } from "fs"
import path from "path"

export type RaceProgram = {
  slug: string
  title: string
  year: number | string | null
  track?: string | null
  track_slug?: string | null
  series?: string | null
  series_slug?: string | null
  type?: string | null
  subtitle?: string | null
  description?: string | null
  trackLogo?: string | null
  isNew?: boolean
  images: string[]
  coverImage?: string | null
  backCoverImage?: string | null
}

function extractYearFromSlug(slug: string) {
  const match = slug.match(/^(\d{4})/)
  return match ? Number(match[1]) : null
}

export async function getRacePrograms(): Promise<RaceProgram[]> {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "public",
      "data",
      "race-programs-manifest.json"
    )

    const raw = await fs.readFile(manifestPath, "utf-8")
    const programs = JSON.parse(raw) as RaceProgram[]

    return programs.sort((a, b) => {
      const aYear =
        typeof a.year === "number" ? a.year : extractYearFromSlug(a.slug)

      const bYear =
        typeof b.year === "number" ? b.year : extractYearFromSlug(b.slug)

      if (aYear !== null && bYear !== null) return aYear - bYear
      if (aYear !== null) return -1
      if (bYear !== null) return 1

      return a.title.localeCompare(b.title)
    })
  } catch (error) {
    console.error("PROGRAM MANIFEST ERROR:", error)
    return []
  }
}

export async function getRaceProgramBySlug(
  slug: string
): Promise<RaceProgram | null> {
  const programs = await getRacePrograms()
  return programs.find((program) => program.slug === slug) ?? null
}