import { supabase } from '@/lib/supabase'

export type ThisWeekHistoryRow = {
  race_date: string
  current_week_date: string
  event_year: number
  track_name: string
  track_slug: string | null
  class_name: string | null
  driver_name: string
  driver_slug: string | null
}

export type ThisWeekHistoryItem = ThisWeekHistoryRow & {
  href: string
  dateLabel: string
  story: string
}

const FEATURE_CLASS_TERMS = [
  'late model',
  'sprint',
  'midget',
  'modified',
  'stock car',
  'super stock',
  'sportsman',
  'grand national',
  'champ car',
]

const SUPPORT_CLASS_TERMS = [
  'four cylinder',
  'mini stock',
  'pure stock',
  'hobby stock',
  'crown vic',
  'enduro',
  'mini cup',
]

const NOTABLE_TRACK_TERMS = [
  'milwaukee',
  'slinger',
  'rockford',
  'lacrosse',
  'lake geneva',
  'madison',
  'capital',
  'hales corners',
  'angell park',
  'wisconsin international',
  'cedar lake',
  'grundy',
  'elko',
  'state fair',
  'santa fe',
  'illiana',
]

function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function centralTodayIso() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value || '1970'
  const month = parts.find((part) => part.type === 'month')?.value || '01'
  const day = parts.find((part) => part.type === 'day')?.value || '01'
  return `${year}-${month}-${day}`
}

export function weekBounds(referenceDate: string) {
  const reference = dateFromIso(referenceDate)
  const day = reference.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(reference)
  start.setUTCDate(reference.getUTCDate() + mondayOffset)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function addDaysIso(value: string, days: number) {
  const date = dateFromIso(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function formatWeekLabel(referenceDate: string) {
  const { start, end } = weekBounds(referenceDate)
  const startDate = dateFromIso(start)
  const endDate = dateFromIso(end)

  const startMonth = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(startDate)
  const endMonth = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(endDate)

  const startDay = startDate.getUTCDate()
  const endDay = endDate.getUTCDate()
  const year = endDate.getUTCFullYear()

  if (startDate.getUTCMonth() === endDate.getUTCMonth()) {
    return `${startMonth} ${startDay}–${endDay}, ${year}`
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
}

function shortDate(value: string, eventYear: number) {
  const date = dateFromIso(value)
  const month = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(date).toUpperCase()
  return `${month} ${date.getUTCDate()} • ${eventYear}`
}

function scoreCandidate(row: ThisWeekHistoryRow, referenceYear: number) {
  const track = (row.track_name || '').toLowerCase()
  const className = (row.class_name || '').toLowerCase()
  const age = Math.max(0, referenceYear - Number(row.event_year || referenceYear))

  let score = Math.min(age, 80) * 0.32

  if (NOTABLE_TRACK_TERMS.some((term) => track.includes(term))) score += 22
  if (FEATURE_CLASS_TERMS.some((term) => className.includes(term))) score += 13
  if (SUPPORT_CLASS_TERMS.some((term) => className.includes(term))) score -= 8

  if (age > 0 && (age % 10 === 0 || age === 25 || age === 50 || age === 75)) score += 14
  if (age >= 40) score += 5
  if (age <= 2) score -= 7

  return score
}

function buildStory(row: ThisWeekHistoryRow) {
  const division = row.class_name?.trim()
  if (division) {
    return `${row.driver_name} won the ${division} feature at ${row.track_name}.`
  }
  return `${row.driver_name} scored a victory at ${row.track_name}.`
}

function chooseHistoryItems(rows: ThisWeekHistoryRow[], referenceDate: string, limit: number) {
  const referenceYear = Number(referenceDate.slice(0, 4))
  const unique = Array.from(
    new Map(
      rows.map((row) => [
        [row.race_date, row.track_name, row.class_name, row.driver_name].join('|'),
        row,
      ]),
    ).values(),
  )

  const ranked = unique
    .map((row) => ({ row, score: scoreCandidate(row, referenceYear) }))
    .sort((a, b) => b.score - a.score || a.row.race_date.localeCompare(b.row.race_date))

  const selected: ThisWeekHistoryRow[] = []
  const selectedKeys = new Set<string>()
  const trackCounts = new Map<string, number>()
  const yearCounts = new Map<number, number>()

  const add = (row: ThisWeekHistoryRow) => {
    const key = [row.race_date, row.track_name, row.class_name, row.driver_name].join('|')
    if (selectedKeys.has(key)) return false
    selected.push(row)
    selectedKeys.add(key)
    trackCounts.set(row.track_name, (trackCounts.get(row.track_name) || 0) + 1)
    yearCounts.set(row.event_year, (yearCounts.get(row.event_year) || 0) + 1)
    return true
  }

  const byWeekDay = new Map<string, typeof ranked>()
  for (const candidate of ranked) {
    const bucket = byWeekDay.get(candidate.row.current_week_date) || []
    bucket.push(candidate)
    byWeekDay.set(candidate.row.current_week_date, bucket)
  }

  for (const day of [...byWeekDay.keys()].sort()) {
    const best = byWeekDay.get(day)?.find(({ row }) => (trackCounts.get(row.track_name) || 0) < 2)
    if (best) add(best.row)
    if (selected.length >= limit) break
  }

  for (const { row } of ranked) {
    if (selected.length >= limit) break
    if ((trackCounts.get(row.track_name) || 0) >= 2) continue
    if ((yearCounts.get(row.event_year) || 0) >= 1) continue
    add(row)
  }

  for (const { row } of ranked) {
    if (selected.length >= limit) break
    if ((trackCounts.get(row.track_name) || 0) >= 2) continue
    if ((yearCounts.get(row.event_year) || 0) >= 2) continue
    add(row)
  }

  for (const { row } of ranked) {
    if (selected.length >= limit) break
    add(row)
  }

  return selected
    .sort((a, b) => a.current_week_date.localeCompare(b.current_week_date) || b.event_year - a.event_year)
    .map((row) => ({
      ...row,
      href: `/results/${row.race_date}`,
      dateLabel: shortDate(row.current_week_date, row.event_year),
      story: buildStory(row),
    }))
}

export async function getThisWeekHistory(referenceDate = centralTodayIso(), limit = 18) {
  const { data, error } = await supabase.rpc('homepage_this_week_history', {
    p_reference_date: referenceDate,
    p_limit: 500,
  })

  if (error) {
    console.error('Unable to load this-week history:', error.message)
    return {
      items: [] as ThisWeekHistoryItem[],
      referenceDate,
      weekLabel: formatWeekLabel(referenceDate),
      ...weekBounds(referenceDate),
    }
  }

  const rows = (data || []) as ThisWeekHistoryRow[]
  return {
    items: chooseHistoryItems(rows, referenceDate, limit),
    referenceDate,
    weekLabel: formatWeekLabel(referenceDate),
    ...weekBounds(referenceDate),
  }
}
