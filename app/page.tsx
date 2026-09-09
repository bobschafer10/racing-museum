import HomePageContent from './HomePageContent'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const fetchCache = 'force-cache'
export const revalidate = 300

export default async function Home() {
  const { data, error } = await supabase
    .from('homepage_stats_view')
    .select('*')
    .single()

  const drivers = Number(data?.drivers_count || 0)
  const results = Number(data?.results_count || 0)

  if (error || drivers < 1000 || results < 1000) {
    console.error('Homepage data health check failed', {
      code: error?.code,
      message: error?.message,
      drivers,
      results,
    })
    throw new Error('Homepage archive data unavailable during render')
  }

  return <HomePageContent />
}
