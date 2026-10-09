import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Hosting health checks should verify that the web process can answer a
// request. They must not fan out into Supabase on every probe; doing that turns
// a harmless uptime check into permanent database load and can amplify an
// outage when the database is already struggling.
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'upper-midwest-auto-racing-museum',
      checkedAt: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
