import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 300

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const safeSlug = String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')

  if (!safeSlug) {
    return NextResponse.json({ error: 'Invalid driver slug' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('driver_wins_by_track_all_view')
    .select('track_name, track_slug, wins')
    .eq('driver_slug', safeSlug)
    .order('wins', { ascending: false })
    .order('track_name', { ascending: true })

  if (error) {
    console.error('driver-winning-tracks lookup failed', error)
    return NextResponse.json({ error: 'Unable to load winning tracks' }, { status: 500 })
  }

  const tracks = data ?? []
  return NextResponse.json(
    { count: tracks.length, tracks },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  )
}
