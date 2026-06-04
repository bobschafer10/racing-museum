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
  images: string[]
  coverImage?: string | null
  backCoverImage?: string | null
  addedAt?: string | null
  updatedAt?: string | null
  isNew?: boolean
}

type RaceProgramMeta = {
  title?: string
  year?: number | string
  track?: string
  track_slug?: string
  series?: string
  series_slug?: string
  type?: string
}

const PROGRAMS_DIR = path.join(process.cwd(), "public", "media", "programs")

const UPPERCASE_PARTS = new Set(["abc", "ira", "usa", "imca", "usac", "artgo"])

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : null
}

function cleanType(value: unknown) {
  const cleaned = clean(value)
  return cleaned ? cleaned.toLowerCase() : null
}

function cleanYear(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const cleaned = value.trim()
    return cleaned.length ? cleaned : null
  }
  return null
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter((part) => part.toLowerCase() !== "wi")
    .map((part) => {
      const lower = part.toLowerCase()
      if (UPPERCASE_PARTS.has(lower)) return lower.toUpperCase()
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

function extractYearFromSlug(slug: string) {
  const match = slug.match(/^(\d{4})/)
  return match ? Number(match[1]) : null
}

function findCoverImage(images: string[]) {
  return (
    images.find((img) => /front-cover.*\.(jpg|jpeg|png|webp)$/i.test(img)) ??
    images.find(
      (img) =>
        /(^|\/)cover.*\.(jpg|jpeg|png|webp)$/i.test(img) &&
        !/back-cover.*\.(jpg|jpeg|png|webp)$/i.test(img)
    ) ??
    null
  )
}

function findBackCoverImage(images: string[]) {
  return (
    images.find((img) => /back-cover.*\.(jpg|jpeg|png|webp)$/i.test(img)) ??
    null
  )
}

async function readProgramMeta(folderPath: string): Promise<RaceProgramMeta | null> {
  try {
    const metaPath = path.join(folderPath, "meta.json")
    const raw = await fs.readFile(metaPath, "utf-8")
    return JSON.parse(raw) as RaceProgramMeta
  } catch {
    return null
  }
}

export async function getRacePrograms(): Promise<RaceProgram[]> {
  let entries: string[] = []

  try {
    entries = await fs.readdir(PROGRAMS_DIR)
  } catch {
    return []
  }

  const programs = await Promise.all(
    entries.map(async (slug) => {
      const folderPath = path.join(PROGRAMS_DIR, slug)
      const stat = await fs.stat(folderPath).catch(() => null)

      if (!stat?.isDirectory()) return null

      const files = await fs.readdir(folderPath)

      const images = files
        .filter((file) => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((file) => `/media/programs/${slug}/${file}`)

      const meta = await readProgramMeta(folderPath)
      const coverImage = findCoverImage(images)
      const backCoverImage = findBackCoverImage(images)

      const fallbackYear = extractYearFromSlug(slug)
      const year = cleanYear(meta?.year) ?? fallbackYear

const updatedAt = stat.mtime.toISOString()
const daysOld =
  (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24)

const isNew = daysOld <= 30

      return {
  slug,
  title: clean(meta?.title) ?? titleFromSlug(slug),
  year,
  track: clean(meta?.track),
  track_slug: clean(meta?.track_slug),
  series: clean(meta?.series),
  series_slug: clean(meta?.series_slug),
  type: cleanType(meta?.type),
  images,
  coverImage,
  backCoverImage,
  addedAt: updatedAt,
  updatedAt,
  isNew,
}
    })
  )

  return programs
    .filter((p): p is RaceProgram => p !== null)
    .sort((a, b) => {
      const aYear = typeof a.year === "number" ? a.year : extractYearFromSlug(a.slug)
      const bYear = typeof b.year === "number" ? b.year : extractYearFromSlug(b.slug)

      if (aYear !== null && bYear !== null) return aYear - bYear
      if (aYear !== null) return -1
      if (bYear !== null) return 1
      return a.title.localeCompare(b.title)
    })
}

export async function getRaceProgramBySlug(
  slug: string
): Promise<RaceProgram | null> {
  const programs = await getRacePrograms()
  return programs.find((program) => program.slug === slug) ?? null
}