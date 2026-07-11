import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const storagePath =
    request.nextUrl.searchParams.get('path')

  if (!storagePath) {
    return NextResponse.json(
      {
        error: 'Missing photo path',
      },
      {
        status: 400,
      }
    )
  }

  if (
    !storagePath.startsWith('photos/master/') ||
    storagePath.includes('..')
  ) {
    return NextResponse.json(
      {
        error: 'Invalid photo path',
      },
      {
        status: 400,
      }
    )
  }

  const { data, error } = await supabase.storage
    .from('media')
    .download(storagePath)

  if (error || !data) {
    console.error('Supabase photo download error:', {
      storagePath,
      error,
    })

    return NextResponse.json(
      {
        error: 'Photo could not be retrieved',
        path: storagePath,
        details: error?.message || null,
      },
      {
        status: 404,
      }
    )
  }

  const imageBuffer = await data.arrayBuffer()

  return new NextResponse(imageBuffer, {
    status: 200,
    headers: {
      'Content-Type': data.type || 'image/jpeg',
      'Content-Length': String(imageBuffer.byteLength),
      'Cache-Control':
        'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}