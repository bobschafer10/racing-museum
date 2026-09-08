import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const base = {
    ok: false,
    env: {
      hasUrl: Boolean(url),
      hasAnonKey: Boolean(key),
      urlHost: url ? (() => { try { return new URL(url).host } catch { return 'invalid-url' } })() : null,
    },
  }

  if (!url || !key) {
    return NextResponse.json({ ...base, error: 'Missing Supabase environment variable(s)' }, { status: 500 })
  }

  const supabase = createClient(url, key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })

  const [stats, drivers, tracks, series, photos] = await Promise.all([
    supabase.from('homepage_stats_view').select('*').single(),
    supabase.from('driver_landing_directory_view').select('driver_name,driver_slug,photo_count').gt('photo_count', 0).limit(1),
    supabase.from('homepage_featured_tracks_view').select('track_name,slug').limit(1),
    supabase.from('Series').select('series_name,slug').eq('is_published', true).limit(1),
    supabase.from('photos').select('file_name,driver_slug,track_slug').limit(1),
  ])

  const result = {
    ...base,
    ok: !stats.error && !drivers.error && !tracks.error && !series.error && !photos.error,
    stats: {
      data: stats.data,
      error: stats.error ? { message: stats.error.message, code: stats.error.code } : null,
    },
    probes: {
      drivers: { rows: drivers.data?.length ?? 0, error: drivers.error ? { message: drivers.error.message, code: drivers.error.code } : null },
      tracks: { rows: tracks.data?.length ?? 0, error: tracks.error ? { message: tracks.error.message, code: tracks.error.code } : null },
      series: { rows: series.data?.length ?? 0, error: series.error ? { message: series.error.message, code: series.error.code } : null },
      photos: { rows: photos.data?.length ?? 0, error: photos.error ? { message: photos.error.message, code: photos.error.code } : null },
    },
  }

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
    headers: { 'Cache-Control': 'no-store' },
  })
}
