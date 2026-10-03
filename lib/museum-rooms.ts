import { supabase } from '@/lib/supabase'

export const MUSEUM_MEDIA_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szvkleurojiwqkkztxtr.supabase.co') +
  '/storage/v1/object/public/media/'

export type MuseumRoomRecord = {
  id: string
  room_number: string
  slug: string
  title: string
  subtitle: string | null
  years_label: string | null
  status: 'draft' | 'preview' | 'published'
  config: Record<string, unknown>
  published_at: string | null
}

export type MuseumRoomMediaRecord = {
  id: string
  room_id: string
  slot_key: string
  role: string
  year: number | null
  subject: string | null
  storage_path: string
  mime_type: string | null
  alt_text: string | null
  credit: string | null
  crop_position: string
  crop_size: string
  sort_order: number
  approved: boolean
  link_href: string | null
  note: string | null
  public_url: string
}

export type PublishedMuseumRoom = {
  room: MuseumRoomRecord
  media: MuseumRoomMediaRecord[]
}

export function museumMediaUrl(storagePath: string) {
  return MUSEUM_MEDIA_BASE + storagePath
}

export async function getPublishedMuseumRoom(slug: string): Promise<PublishedMuseumRoom | null> {
  const { data: room, error: roomError } = await supabase
    .from('museum_rooms')
    .select('id,room_number,slug,title,subtitle,years_label,status,config,published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (roomError || !room) return null

  const { data: media, error: mediaError } = await supabase
    .from('museum_room_media')
    .select('id,room_id,slot_key,role,year,subject,storage_path,mime_type,alt_text,credit,crop_position,crop_size,sort_order,approved,link_href,note')
    .eq('room_id', room.id)
    .eq('approved', true)
    .order('sort_order', { ascending: true })
    .order('year', { ascending: true })

  if (mediaError) return null

  return {
    room: room as MuseumRoomRecord,
    media: ((media || []) as Omit<MuseumRoomMediaRecord, 'public_url'>[]).map((item) => ({
      ...item,
      public_url: museumMediaUrl(item.storage_path),
    })),
  }
}

export async function listPublishedMuseumRooms(): Promise<MuseumRoomRecord[]> {
  const { data, error } = await supabase
    .from('museum_rooms')
    .select('id,room_number,slug,title,subtitle,years_label,status,config,published_at')
    .eq('status', 'published')
    .order('room_number', { ascending: true })

  if (error) return []
  return (data || []) as MuseumRoomRecord[]
}
