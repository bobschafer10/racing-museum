import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const { data, error } = await supabase
    .from('homepage_stats_view')
    .select('*')
    .single()

  return NextResponse.json({
    supabaseUrl: url,
    hasAnonKey: !!key,
    anonKeyStartsWith: key ? key.slice(0, 8) : null,
    anonKeyLength: key ? key.length : 0,
    stats: data,
    error,
  })
}