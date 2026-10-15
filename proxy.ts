import { NextRequest, NextResponse } from 'next/server'
import { BOB_PORTRAIT } from './app/rooms/media-member-of-the-month/bob-bergeron/bobPortrait'

const CANONICAL_MUSEUM = 'https://racing-museum.vercel.app'
const BOB_PORTRAIT_PATH = '/rooms/media-member-of-the-month/bob-bergeron/portrait'

function bobPortraitResponse() {
  const encoded = BOB_PORTRAIT.includes(',') ? BOB_PORTRAIT.split(',', 2)[1] : BOB_PORTRAIT
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new NextResponse(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-UMARM-Bob-Portrait': 'proxy',
    },
  })
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === BOB_PORTRAIT_PATH) {
    return bobPortraitResponse()
  }

  const quarantined = process.env.RENDER === 'true' || process.env.UMARM_RENDER_QUARANTINE === 'true'
  if (!quarantined) return NextResponse.next()

  // Keep Render's lightweight health probe local so the legacy service stays
  // stable while every public request is sent to the authoritative Vercel site.
  if (request.nextUrl.pathname === '/api/homepage-health') return NextResponse.next()

  const canonical = new URL(request.nextUrl.pathname + request.nextUrl.search, CANONICAL_MUSEUM)
  return NextResponse.redirect(canonical, 308)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
