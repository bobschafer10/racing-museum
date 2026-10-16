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

type RaceProgramSupplement = Omit<RaceProgram, "images" | "coverImage" | "backCoverImage"> & {
  pageCount: number
}

const STORAGE_BASE =
  "https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/programs"

function extractYearFromSlug(slug: string) {
  const match = slug.match(/^(\d{4})/)
  return match ? Number(match[1]) : null
}

function normalizeProgram(program: RaceProgram): RaceProgram {
  const cover = program.coverImage ?? null
  const backCover = program.backCoverImage ?? null

  const interior = program.images.filter((image) => {
    if (cover && image === cover) return false
    if (backCover && image === backCover) return false

    // 1983 EWSCA: 019.jpg and 020.jpg are byte-for-byte duplicates.
    if (
      program.slug === "1983-eastern-wisconsin-stock-car-association-yearbook" &&
      image.endsWith("/020.jpg")
    ) {
      return false
    }

    return true
  })

  const ordered = [
    ...(cover ? [cover] : []),
    ...interior,
    ...(backCover ? [backCover] : []),
  ]

  return {
    ...program,
    images: Array.from(new Set(ordered)),
  }
}

function expandSupplement(program: RaceProgramSupplement): RaceProgram {
  const base = `${STORAGE_BASE}/${program.slug}`
  const images = Array.from({ length: program.pageCount }, (_, index) => {
    const page = String(index + 1).padStart(3, "0")
    return `${base}/${page}.jpg`
  })

  return {
    ...program,
    isNew: true,
    images,
    coverImage: `${base}/front-cover.jpg`,
    backCoverImage: `${base}/back-cover.jpg`,
  }
}

async function getSupplementPrograms(): Promise<RaceProgram[]> {
  try {
    const supplementPath = path.join(
      process.cwd(),
      "public",
      "data",
      "race-programs-manifest-supplement.json"
    )
    const raw = await fs.readFile(supplementPath, "utf-8")
    return (JSON.parse(raw) as RaceProgramSupplement[]).map(expandSupplement)
  } catch {
    return []
  }
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
    const basePrograms = JSON.parse(raw) as RaceProgram[]
    const supplementPrograms = await getSupplementPrograms()

    const merged = Array.from(
      new Map(
        [...basePrograms, ...supplementPrograms].map((program) => [program.slug, program])
      ).values()
    ).map(normalizeProgram)

    return merged.sort((a, b) => {
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
