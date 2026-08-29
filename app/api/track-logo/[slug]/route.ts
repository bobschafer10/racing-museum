import { NextResponse } from 'next/server'

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/bobschafer10/racing-museum/main/public/logos/tracks'

const TRACK_LOGO_ALIASES: Record<string, string[]> = {
  'capital-super-speedway-wi': ['madison-international-speedway-wi'],
  'dells-motor-speedway-wi': ['dells-raceway-park-wi'],
  'golden-sands-speedway-wi': ['golden-sands-raceway-wi'],
  'lacrosse-fairgrounds-wi': ['lacrosse-fairgrounds-speedway-wi'],
  'marshfield-speedway-wi': ['marshfield-speedway'],
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const safeSlug = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '')

  if (!safeSlug) {
    return new NextResponse('Invalid track slug', { status: 400 })
  }

  const candidates = [safeSlug, ...(TRACK_LOGO_ALIASES[safeSlug] || [])]

  for (const candidate of candidates) {
    for (const ext of ['jpg', 'png', 'jpeg', 'webp']) {
      try {
        // Do not cache an upstream 404. New museum logos are added regularly,
        // and a cached miss would otherwise keep showing the placeholder.
        const upstream = await fetch(`${GITHUB_RAW_BASE}/${candidate}.${ext}`, {
          cache: 'no-store',
        })

        if (!upstream.ok) continue

        const body = await upstream.arrayBuffer()
        const contentType =
          upstream.headers.get('content-type') ||
          (ext === 'png'
            ? 'image/png'
            : ext === 'webp'
              ? 'image/webp'
              : 'image/jpeg')

        return new NextResponse(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=604800',
          },
        })
      } catch {
        // Try the next candidate/extension.
      }
    }
  }

  const title = safeSlug
    .replace(/-(wi|il|mn|ia|mi)$/i, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
      <rect width="320" height="180" fill="#efe7d6"/>
      <rect x="6" y="6" width="308" height="168" fill="none" stroke="#b29364" stroke-width="3"/>
      <text x="160" y="77" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-weight="700" fill="#7a5827">TRACK LOGO</text>
      <text x="160" y="105" text-anchor="middle" font-family="Georgia, serif" font-size="18" font-weight="700" fill="#4a3218">${escapeXml(title)}</text>
    </svg>`

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Never cache a missing-logo placeholder. Once a logo is added to the
      // repository, the next request should discover it immediately.
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
