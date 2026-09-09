import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const PUBLICATION_NAMES: Record<string, string> = {
  "midwest-racing-news": "Midwest Racing News",
  "checkered-flag-racing-news": "Checkered Flag Racing News",
  "national-speed-sport-news": "National Speed Sport News",
  "hawkeye-racing-news": "Hawkeye Racing News",
  "all-the-dirt-racing-news": "All The Dirt Racing News",
}

function pageNumber(label: string | null) {
  const match = String(label || "").match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function queryTerms(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/["'()]/g, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !["and", "or", "not"].includes(term)),
    ),
  )
}

function makeSnippet(text: string, query: string) {
  const clean = text
    .replace(/===\s*COLUMN\s+\d+\s*===/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!clean) return ""

  const lower = clean.toLowerCase()
  const terms = queryTerms(query)
  let hit = -1
  for (const term of terms) {
    const found = lower.indexOf(term)
    if (found >= 0 && (hit < 0 || found < hit)) hit = found
  }

  const radius = 180
  const start = hit > radius ? hit - radius : 0
  const end = Math.min(clean.length, (hit >= 0 ? hit : 0) + radius + 220)
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`
}

function relevance(text: string, query: string) {
  const lower = text.toLowerCase()
  const normalizedQuery = query.toLowerCase().trim()
  const terms = queryTerms(query)
  let score = 0

  if (normalizedQuery && lower.includes(normalizedQuery)) score += 100
  for (const term of terms) {
    let from = 0
    let count = 0
    while (count < 12) {
      const at = lower.indexOf(term, from)
      if (at < 0) break
      count += 1
      from = at + term.length
    }
    score += Math.min(count, 12) * 4
  }
  return score
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim()

  if (query.length < 2) {
    return NextResponse.json({ query, results: [], error: "Enter at least two characters." }, { status: 400 })
  }
  if (query.length > 120) {
    return NextResponse.json({ query, results: [], error: "Search is too long." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("newspaper_ocr_pages")
    .select("id,publication_code,issue_date,page_label,storage_path,ocr_text,avg_confidence")
    .eq("status", "complete")
    .textSearch("search_vector", query, { type: "websearch", config: "simple" })
    .limit(60)

  if (error) {
    console.error("NEWSPAPER OCR SEARCH ERROR", error)
    return NextResponse.json({ query, results: [], error: "Newspaper search is temporarily unavailable." }, { status: 500 })
  }

  const results = (data || [])
    .map((row) => {
      const page = pageNumber(row.page_label)
      const ocrText = row.ocr_text || ""
      const publication = row.publication_code || ""
      const issueDate = row.issue_date || ""
      const href = `/media/newspapers/${publication}/${issueDate}${page ? `?sourcePage=${page}&q=${encodeURIComponent(query)}` : `?q=${encodeURIComponent(query)}`}`
      const image = `https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/${row.storage_path}`

      return {
        id: row.id,
        publication,
        publicationName: PUBLICATION_NAMES[publication] || publication,
        issueDate,
        page,
        pageLabel: row.page_label,
        snippet: makeSnippet(ocrText, query),
        confidence: row.avg_confidence,
        href,
        image,
        score: relevance(ocrText, query),
      }
    })
    .sort((a, b) => b.score - a.score || b.issueDate.localeCompare(a.issueDate) || (a.page || 0) - (b.page || 0))
    .slice(0, 40)

  return NextResponse.json(
    { query, count: results.length, results },
    { headers: { "Cache-Control": "no-store" } },
  )
}
