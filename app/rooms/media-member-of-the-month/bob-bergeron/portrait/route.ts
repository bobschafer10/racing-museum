import { BOB_PORTRAIT } from '../bobPortrait'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const encoded = BOB_PORTRAIT.includes(',') ? BOB_PORTRAIT.split(',', 2)[1] : BOB_PORTRAIT
    const bytes = Buffer.from(encoded, 'base64')

    if (!bytes.length) {
      return new Response('Bob Bergeron portrait is empty', { status: 500 })
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Bob Bergeron portrait route failed', error)
    return new Response('Bob Bergeron portrait failed to load', { status: 500 })
  }
}
