import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const storagePath = request.nextUrl.searchParams.get('path')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!storagePath) {
    return NextResponse.json(
      { error: 'Missing photo path' },
      { status: 400 }
    )
  }

  if (
    !storagePath.startsWith('photos/master/') ||
    storagePath.includes('..')
  ) {
    return NextResponse.json(
      { error: 'Invalid photo path' },
      { status: 400 }
    )
  }

  if (!supabaseUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL is missing on Render' },
      { status: 500 }
    )
  }

  const cleanSupabaseUrl = supabaseUrl.replace(/\/+$/, '')

  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  const sourceUrl =
    `${cleanSupabaseUrl}/storage/v1/object/public/media/${encodedPath}`

  try {
    const response = await fetch(sourceUrl, {
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorBody = await response.text()

      console.error('Public photo fetch failed:', {
        storagePath,
        sourceUrl,
        status: response.status,
        errorBody,
      })

      return NextResponse.json(
        {
          error: 'Photo fetch failed',
          status: response.status,
          storagePath,
          sourceUrl,
          details: errorBody,
        },
        {
          status: response.status,
        }
      )
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'image/jpeg',
        'Content-Length': String(imageBuffer.byteLength),
        'Cache-Control':
          'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Photo proxy error:', {
      storagePath,
      sourceUrl,
      error,
    })

    return NextResponse.json(
      {
        error: 'Photo proxy failed',
        details:
          error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      }
    )
  }
}