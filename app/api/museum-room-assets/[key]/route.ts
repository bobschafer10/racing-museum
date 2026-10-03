import { supabase } from '@/lib/supabase'

export const revalidate = 86400

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params

  const { data, error } = await supabase
    .from('museum_room_assets')
    .select('mime_type,data_base64')
    .eq('asset_key', key)
    .maybeSingle()

  if (error || !data?.data_base64) {
    return new Response('Museum asset not found', { status: 404 })
  }

  const bytes = Buffer.from(data.data_base64, 'base64')

  return new Response(bytes, {
    headers: {
      'Content-Type': data.mime_type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
