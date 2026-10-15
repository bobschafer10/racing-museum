import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'

const BOB_SLUGS = new Set(['bob-bergeron', 'bob-bergeronr'])
const BUCKET = 'media'

function secureMatch(provided: string, expected: string) {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function renamedFileName(fileName: string, driverSlug: string) {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0) return null
  const stem = fileName.slice(0, dot)
  const extension = fileName.slice(dot)
  const parts = stem.split('_')
  if (parts.length < 6) return null
  parts[2] = driverSlug
  return `${parts.join('_')}${extension}`
}

export async function POST(request: Request) {
  const expectedPin = process.env.UMARM_RESEARCH_PIN || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  if (!expectedPin || !serviceKey || !url) {
    return NextResponse.json({ error: 'Research editing is not configured on this deployment.' }, { status: 503 })
  }

  const suppliedPin = request.headers.get('x-umarm-research-pin') || ''
  if (!secureMatch(suppliedPin, expectedPin)) {
    return NextResponse.json({ error: 'Research PIN is incorrect.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { photo_id?: number; driver_slug?: string } | null
  const photoId = Number(body?.photo_id)
  const driverSlug = String(body?.driver_slug || '').trim()

  if (!Number.isInteger(photoId) || photoId <= 0 || !/^[a-z0-9-]+$/.test(driverSlug)) {
    return NextResponse.json({ error: 'Invalid photo or driver selection.' }, { status: 400 })
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const [{ data: photo, error: photoError }, { data: driver, error: driverError }] = await Promise.all([
    admin
      .from('photos')
      .select('photo_id,file_name,track_slug,year,driver_slug,photographer_slug')
      .eq('photo_id', photoId)
      .maybeSingle(),
    admin
      .from('Drivers')
      .select('driver_id,driver_name,slug')
      .eq('slug', driverSlug)
      .eq('is_published', true)
      .maybeSingle(),
  ])

  if (photoError || !photo) return NextResponse.json({ error: photoError?.message || 'Photo not found.' }, { status: 404 })
  if (driverError || !driver) return NextResponse.json({ error: driverError?.message || 'Driver not found.' }, { status: 404 })
  if (!BOB_SLUGS.has(photo.photographer_slug || '')) {
    return NextResponse.json({ error: 'This editor is currently limited to Bob Bergeron photos.' }, { status: 403 })
  }

  const nextFileName = renamedFileName(photo.file_name, driver.slug)
  if (!nextFileName) return NextResponse.json({ error: 'The photo filename does not match the museum naming convention.' }, { status: 409 })

  const track = photo.track_slug || 'unknown-track'
  const year = photo.year || 'unknown-year'
  const folder = `photos/master/${track}/${year}`
  const oldPath = `${folder}/${photo.file_name}`
  const newPath = `${folder}/${nextFileName}`

  if (newPath !== oldPath) {
    const { data: collisionRows, error: collisionError } = await admin.storage
      .from(BUCKET)
      .list(folder, { limit: 10, search: nextFileName })

    if (collisionError) return NextResponse.json({ error: collisionError.message }, { status: 500 })
    if ((collisionRows || []).some((row) => row.name === nextFileName)) {
      return NextResponse.json({ error: 'A photo with that driver filename already exists. Nothing was changed.' }, { status: 409 })
    }

    const { error: moveError } = await admin.storage.from(BUCKET).move(oldPath, newPath)
    if (moveError) return NextResponse.json({ error: `Storage rename failed: ${moveError.message}` }, { status: 500 })
  }

  const { data: updated, error: updateError } = await admin
    .from('photos')
    .update({ driver_slug: driver.slug, file_name: nextFileName })
    .eq('photo_id', photoId)
    .select('photo_id,file_name,driver_slug')
    .single()

  if (updateError) {
    if (newPath !== oldPath) await admin.storage.from(BUCKET).move(newPath, oldPath)
    return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    photo: updated,
    driver: { driver_id: driver.driver_id, driver_name: driver.driver_name, slug: driver.slug },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
