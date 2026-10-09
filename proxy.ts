import { NextRequest, NextResponse } from 'next/server'

const CANONICAL_MUSEUM = 'https://racing-museum.vercel.app'

export function proxy(request: NextRequest) {
  if (process.env.RENDER !== 'true') return NextResponse.next()

  // Keep Render's lightweight health probe local so the legacy service stays
  // stable while every public request is sent to the authoritative Vercel site.
  if (request.nextUrl.pathname === '/api/homepage-health') return NextResponse.next()

  const canonical = new URL(request.nextUrl.pathname + request.nextUrl.search, CANONICAL_MUSEUM)
  return NextResponse.redirect(canonical, 308)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
