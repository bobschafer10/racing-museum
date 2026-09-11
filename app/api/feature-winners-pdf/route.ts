import { supabase } from '@/lib/supabase'

type WinnerRow = {
  driver_id: number
  driver_name: string
  driver_slug: string
  driver_hometown: string | null
  driver_state: string | null
  feature_wins: number
  years_with_wins: number
  tracks_won_at: number
  classes_won_in: number
  first_win_date: string | null
  last_win_date: string | null
}

type PdfColumn = {
  label: string
  width: number
  align?: 'left' | 'center'
}

type PdfRow = string[]

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const LEFT = 36
const RIGHT = 36
const TOP = 34
const BOTTOM = 48

function safeInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function reportDate() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

function fileDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

function ascii(value: string) {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/•/g, '|')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
}

function escapePdf(value: string) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function shorten(value: string, max: number) {
  const clean = ascii(value).replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, Math.max(1, max - 3)).trimEnd()}...`
}

function approxTextWidth(value: string, size: number, bold = false) {
  return ascii(value).length * size * (bold ? 0.54 : 0.5)
}

function textCmd(
  value: string,
  x: number,
  yTop: number,
  size: number,
  bold = false,
  align: 'left' | 'center' | 'right' = 'left',
  boxWidth = 0,
) {
  const safe = escapePdf(value)
  let tx = x
  const width = approxTextWidth(value, size, bold)

  if (align === 'center' && boxWidth) tx = x + Math.max(0, (boxWidth - width) / 2)
  if (align === 'right' && boxWidth) tx = x + Math.max(0, boxWidth - width)

  const y = PAGE_HEIGHT - yTop
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf 0 g 1 0 0 1 ${tx.toFixed(2)} ${y.toFixed(2)} Tm (${safe}) Tj ET\n`
}

function lineCmd(x1: number, y1Top: number, x2: number, y2Top: number, gray = 0.72) {
  return `${gray} G 0.5 w ${x1.toFixed(2)} ${(PAGE_HEIGHT - y1Top).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_HEIGHT - y2Top).toFixed(2)} l S\n`
}

function fillRectCmd(x: number, yTop: number, width: number, height: number, gray: number) {
  return `${gray} g ${x.toFixed(2)} ${(PAGE_HEIGHT - yTop - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`
}

function wrapText(value: string, maxChars: number) {
  const words = ascii(value).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (!words.length) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

function buildPdf(
  title: string,
  filterSummary: string[],
  columns: PdfColumn[],
  rows: PdfRow[],
  driverLocations: string[],
) {
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0)
  const rowHeight = 25
  const headerHeight = 22
  const pageStreams: string[] = []
  let rowIndex = 0

  while (rowIndex < rows.length || pageStreams.length === 0) {
    let stream = ''
    let y = TOP

    if (pageStreams.length === 0) {
      stream += textCmd('UPPER MIDWEST AUTO RACING MUSEUM', LEFT, y + 3, 11, true)
      y += 20
      stream += lineCmd(LEFT, y, PAGE_WIDTH - RIGHT, y, 0.35)
      y += 20
      stream += textCmd('Feature Win Archive', LEFT, y, 9, true)
      y += 17
      stream += textCmd(title, LEFT, y, 18, true)
      y += 20
      stream += textCmd(`Generated: ${reportDate()}`, LEFT, y, 8)
      y += 17
      stream += textCmd('FILTERS USED', LEFT, y, 7.5, true)
      y += 13

      const summaryText = filterSummary.join('  |  ')
      const summaryLines = wrapText(summaryText, 112)
      for (const line of summaryLines) {
        stream += textCmd(line, LEFT, y, 7.5)
        y += 11
      }

      stream += textCmd(`Results in this PDF: ${rows.length.toLocaleString('en-US')}`, LEFT, y + 2, 7.5, true)
      y += 20
    } else {
      stream += textCmd('UPPER MIDWEST AUTO RACING MUSEUM', LEFT, y + 2, 8.5, true)
      stream += textCmd(title, PAGE_WIDTH - RIGHT - 260, y + 2, 8.5, true, 'right', 260)
      y += 16
      stream += lineCmd(LEFT, y, PAGE_WIDTH - RIGHT, y, 0.45)
      y += 12
    }

    stream += fillRectCmd(LEFT, y, tableWidth, headerHeight, 0.88)
    let x = LEFT
    for (const column of columns) {
      stream += textCmd(
        column.label.toUpperCase(),
        x + 3,
        y + 14,
        7,
        true,
        column.align === 'left' ? 'left' : 'center',
        Math.max(0, column.width - 6),
      )
      x += column.width
    }
    stream += lineCmd(LEFT, y + headerHeight, LEFT + tableWidth, y + headerHeight, 0.4)
    y += headerHeight

    while (rowIndex < rows.length && y + rowHeight <= PAGE_HEIGHT - BOTTOM) {
      if (rowIndex % 2 === 1) {
        stream += fillRectCmd(LEFT, y, tableWidth, rowHeight, 0.97)
      }

      x = LEFT
      const row = rows[rowIndex]
      for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
        const column = columns[colIndex]
        const value = row[colIndex] || ''
        const isDriver = colIndex === 1
        const fontSize = isDriver ? 7.5 : 7
        const align = column.align === 'left' ? 'left' : 'center'

        stream += textCmd(
          shorten(value, isDriver ? 34 : 18),
          x + 3,
          y + (isDriver ? 10 : 15),
          fontSize,
          isDriver,
          align,
          Math.max(0, column.width - 6),
        )

        if (isDriver) {
          stream += textCmd(
            shorten(driverLocations[rowIndex] || 'Hometown unknown', 38),
            x + 3,
            y + 20,
            5.8,
            false,
            'left',
            Math.max(0, column.width - 6),
          )
        }

        x += column.width
      }

      stream += lineCmd(LEFT, y + rowHeight, LEFT + tableWidth, y + rowHeight, 0.84)
      y += rowHeight
      rowIndex += 1
    }

    pageStreams.push(stream)
  }

  const totalPages = pageStreams.length
  const footerY = PAGE_HEIGHT - 22

  for (let i = 0; i < pageStreams.length; i += 1) {
    pageStreams[i] += lineCmd(LEFT, PAGE_HEIGHT - 34, PAGE_WIDTH - RIGHT, PAGE_HEIGHT - 34, 0.72)
    pageStreams[i] += textCmd('uppermidwestautoracingmuseum.org', LEFT, footerY, 6.8)
    pageStreams[i] += textCmd(
      `Page ${i + 1} of ${totalPages}`,
      PAGE_WIDTH - RIGHT - 90,
      footerY,
      6.8,
      false,
      'right',
      90,
    )
  }

  const pageObjectNumbers = pageStreams.map((_, index) => 5 + index * 2)
  const maxObject = 4 + pageStreams.length * 2
  const objects: string[] = new Array(maxObject + 1).fill('')

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageStreams.length} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

  pageStreams.forEach((stream, index) => {
    const pageObject = 5 + index * 2
    const contentObject = pageObject + 1
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
  })

  let pdf = '%PDF-1.4\n%UMARM\n'
  const offsets: number[] = new Array(maxObject + 1).fill(0)

  for (let i = 1; i <= maxObject; i += 1) {
    offsets[i] = pdf.length
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${maxObject + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i <= maxObject; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}

function slugForFile(value: string) {
  return ascii(value)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams

  const requestedScope = params.get('scope') || 'wisconsin'
  const scope = ['wisconsin', 'non_wisconsin', 'full'].includes(requestedScope)
    ? requestedScope
    : 'wisconsin'
  const rawYear = params.get('year') || 'all'
  const parsedYear = safeInteger(rawYear, 0, 1900, 2200)
  const year = rawYear === 'all' || parsedYear === 0 ? 'all' : String(parsedYear)
  const rawTrack = params.get('track') || 'all'
  const trackId = rawTrack === 'all' ? null : safeInteger(rawTrack, 0, 0, 10_000_000)
  const requestedSurface = params.get('surface') || 'all'
  const surface = ['Dirt', 'Asphalt', 'Mixed'].includes(requestedSurface) ? requestedSurface : 'all'
  const rawClass = params.get('class') || 'all'
  const classId = rawClass === 'all' ? null : safeInteger(rawClass, 0, 0, 10_000_000)
  const q = (params.get('q') || '').trim().slice(0, 100)
  const minWins = safeInteger(params.get('minWins'), 1, 1, 100_000)
  const rows = params.get('rows') || '100'
  const rowLimit = rows === 'all' ? 5000 : [50, 100, 250].includes(Number(rows)) ? Number(rows) : 100

  const { data: winnerData, error } = await supabase.rpc('stats_feature_winners_report', {
    p_scope: scope,
    p_year: year === 'all' ? null : Number(year),
    p_track_id: trackId || null,
    p_surface: surface === 'all' ? null : surface,
    p_class_id: classId || null,
    p_q: q || null,
    p_min_wins: minWins,
    p_limit: rowLimit,
  })

  if (error) {
    console.error('feature-winners PDF report failed', error)
    return Response.json({ error: 'Unable to generate feature winners PDF' }, { status: 500 })
  }

  const winners = (winnerData || []) as WinnerRow[]

  let trackName = 'All Tracks'
  if (trackId) {
    const { data: trackData } = await supabase
      .from('stats_feature_winners_track_options_view')
      .select('track_name')
      .eq('track_id', trackId)
      .maybeSingle()
    trackName = trackData?.track_name || `Track #${trackId}`
  }

  let className = 'All Classes'
  if (classId) {
    const { data: classData } = await supabase
      .from('stats_feature_winners_class_options_view')
      .select('class_name')
      .eq('class_id', classId)
      .maybeSingle()
    className = classData?.class_name || `Class #${classId}`
  }

  const scopeLabel =
    scope === 'wisconsin'
      ? 'Wisconsin Tracks'
      : scope === 'non_wisconsin'
        ? 'Non-Wisconsin Tracks'
        : 'Full Coverage Area'

  const filterSummary = [
    `Scope: ${scopeLabel}`,
    `Year: ${year === 'all' ? 'All Years' : year}`,
    `Track: ${trackName}`,
    `Surface: ${surface === 'all' ? 'All Surfaces' : surface}`,
    `Class: ${className}`,
    `Minimum Wins: ${minWins}+`,
    q ? `Driver Search: ${q}` : 'Driver Search: None',
    `Rows: ${rows === 'all' ? 'All (up to 5,000)' : rowLimit}`,
  ]

  const allTime = year === 'all'
  const title = allTime ? 'All-Time Feature Winners' : `${year} Feature Winners`
  const columns: PdfColumn[] = allTime
    ? [
        { label: 'Rank', width: 30, align: 'center' },
        { label: 'Driver', width: 190, align: 'left' },
        { label: 'Wins', width: 42, align: 'center' },
        { label: 'Years', width: 40, align: 'center' },
        { label: 'Tracks', width: 42, align: 'center' },
        { label: 'Classes', width: 48, align: 'center' },
        { label: 'First Win', width: 72, align: 'center' },
        { label: 'Last Win', width: 72, align: 'center' },
      ]
    : [
        { label: 'Rank', width: 30, align: 'center' },
        { label: 'Driver', width: 200, align: 'left' },
        { label: 'Wins', width: 42, align: 'center' },
        { label: 'Tracks', width: 50, align: 'center' },
        { label: 'Classes', width: 50, align: 'center' },
        { label: 'First Win', width: 84, align: 'center' },
        { label: 'Last Win', width: 84, align: 'center' },
      ]

  const tableRows: PdfRow[] = winners.map((row, index) => {
    const base = [
      String(index + 1),
      row.driver_name,
      String(row.feature_wins),
    ]

    if (allTime) base.push(String(row.years_with_wins))

    base.push(
      String(row.tracks_won_at),
      String(row.classes_won_in),
      formatDate(row.first_win_date),
      formatDate(row.last_win_date),
    )
    return base
  })

  const driverLocations = winners.map((row) =>
    [row.driver_hometown, row.driver_state].filter(Boolean).join(', ') || 'Hometown unknown',
  )

  const pdf = buildPdf(title, filterSummary, columns, tableRows, driverLocations)
  const filenameParts = ['UMARM', 'Feature_Winners']

  if (trackName !== 'All Tracks') filenameParts.push(slugForFile(trackName))
  if (year !== 'all') filenameParts.push(year)
  if (trackName === 'All Tracks' && year === 'all') filenameParts.push('All_Time')
  filenameParts.push(fileDate())

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filenameParts.join('_')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
