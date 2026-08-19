import { NextResponse } from 'next/server'

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/bobschafer10/racing-museum/main/public/logos/tracks'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const safeSlug = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '')

  if (!safeSlug) {
    return new NextResponse('Invalid track slug', { status: 400 })
  }

  for (const ext of ['jpg', 'png']) {
    try {
      const upstream = await fetch(`${GITHUB_RAW_BASE}/${safeSlug}.${ext}`, {
        cache: 'force-cache',
      })

      if (!upstream.ok) continue

      const body = await upstream.arrayBuffer()
      const contentType =
        upstream.headers.get('content-type') ||
        (ext === 'png' ? 'image/png' : 'image/jpeg')

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      })
    } catch {
      // Try the next extension.
    }
  }

  return new NextResponse('Track logo not found', { status: 404 })
}
