import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().slice(0, 80)

  if (q.length < 2) return NextResponse.json({ drivers: [] })

  const { data, error } = await supabase
    .from('Drivers')
    .select('driver_id,driver_name,slug,hometown,state')
    .eq('is_published', true)
    .ilike('driver_name', `%${q.replace(/[%_]/g, '')}%`)
    .order('driver_name', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ drivers: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
}
