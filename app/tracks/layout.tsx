import { supabase } from '@/lib/supabase'
import TrackAliasEnhancer from './TrackAliasEnhancer'

export const revalidate = 300

type TrackAliasRow = {
  track_slug: string
  alias_name: string
  start_year?: number | null
  end_year?: number | null
  alias_logo_url?: string | null
  sort_order?: number | null
}

export default async function TracksLayout({ children }: { children: React.ReactNode }) {
  const { data } = await supabase
    .from('track_aliases')
    .select('track_slug,alias_name,start_year,end_year,alias_logo_url,sort_order')
    .eq('is_published', true)
    .order('track_slug', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('alias_name', { ascending: true })

  return (
    <>
      {children}
      <TrackAliasEnhancer aliases={(data ?? []) as TrackAliasRow[]} />
    </>
  )
}
