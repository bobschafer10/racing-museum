const path = require('path')
const express = require('express')
const multer = require('multer')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

const managerDir = __dirname
const repoRoot = path.resolve(managerDir, '..')

// Local manager credentials only. The browser never receives the service-role key.
dotenv.config({ path: path.join(managerDir, '.env'), override: false })
dotenv.config({ path: path.join(repoRoot, '.env.local'), override: false })
dotenv.config({ path: path.join(repoRoot, '.env'), override: false })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media'
const PORT = Number(process.env.MUSEUM_ROOM_MANAGER_PORT || 4217)

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\nMuseum Room Manager cannot start.')
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Create museum-room-manager/.env from .env.example, or use the repo .env.local file.\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.use(express.static(path.join(managerDir, 'public')))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 50 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed.'))
    cb(null, true)
  },
})

function cleanPart(value, fallback = 'asset') {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback
}

function extensionFor(file) {
  const byMime = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return byMime[file.mimetype] || cleanPart(path.extname(file.originalname).replace('.', ''), 'jpg')
}

function publicUrl(storagePath) {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

function storagePrefix(room) {
  return room?.config?.storage_prefix || `rooms/${cleanPart(room.room_number) || 'room'}-${cleanPart(room.slug)}`
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase()
      if (lower === 'jr' || lower === 'jr.') return 'Jr.'
      if (lower === 'sr' || lower === 'sr.') return 'Sr.'
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function inferFileAssignment(filename) {
  const stem = path.basename(filename, path.extname(filename))
  const normalized = stem.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
  const lower = normalized.toLowerCase()

  if (lower.includes('watermark') || lower.includes('larry wehrs')) {
    return {
      slot_key: 'watermark',
      role: 'watermark',
      year: null,
      subject: 'Larry Wehrs',
      alt_text: 'Larry Wehrs during the Oktoberfest era at LaCrosse Interstate Speedway',
    }
  }

  const yearMatch = normalized.match(/\b(19\d{2}|20\d{2})\b/)
  if (yearMatch) {
    const year = Number(yearMatch[1])
    const name = normalized
      .replace(yearMatch[1], ' ')
      .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '')
      .replace(/[\-–—]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const subject = titleCase(name || `Winner ${year}`)
    return {
      slot_key: `winner-${year}`,
      role: 'winner',
      year,
      subject,
      alt_text: `${subject}, ${year} Oktoberfest`,
    }
  }

  const subject = titleCase(normalized.replace(/[\-–—]+/g, ' '))
  return {
    slot_key: `artifact-${cleanPart(stem)}`,
    role: 'artifact',
    year: null,
    subject,
    alt_text: subject,
  }
}

async function getRoom(roomId) {
  const { data, error } = await supabase
    .from('museum_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  if (error) throw error
  return data
}

async function upsertMedia(room, file, fields) {
  const slotKey = cleanPart(fields.slot_key)
  if (!slotKey) throw new Error('slot_key is required')
  const ext = extensionFor(file)
  const storagePath = `${storagePrefix(room)}/${slotKey}.${ext}`

  const { data: existing, error: existingError } = await supabase
    .from('museum_room_media')
    .select('*')
    .eq('room_id', room.id)
    .eq('slot_key', slotKey)
    .maybeSingle()
  if (existingError) throw existingError

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: '3600',
    })
  if (uploadError) throw uploadError

  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path])
  }

  const payload = {
    room_id: room.id,
    slot_key: slotKey,
    role: fields.role || 'artifact',
    year: fields.year === '' || fields.year == null ? null : Number(fields.year),
    subject: fields.subject || null,
    storage_path: storagePath,
    mime_type: file.mimetype,
    alt_text: fields.alt_text || fields.subject || null,
    credit: fields.credit || null,
    crop_position: fields.crop_position || 'center center',
    crop_size: fields.crop_size || 'cover',
    sort_order: Number(fields.sort_order || 0),
    approved: fields.approved === false || fields.approved === 'false' ? false : true,
  }

  const { data, error } = await supabase
    .from('museum_room_media')
    .upsert(payload, { onConflict: 'room_id,slot_key' })
    .select('*')
    .single()
  if (error) throw error

  return { ...data, public_url: publicUrl(data.storage_path) }
}

app.get('/api/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('museum_rooms').select('id').limit(1)
    if (error) throw error
    res.json({ ok: true, bucket: BUCKET })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

app.get('/api/rooms', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('museum_rooms')
      .select('*')
      .order('room_number', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await getRoom(req.params.id)
    const { data: media, error } = await supabase
      .from('museum_room_media')
      .select('*')
      .eq('room_id', room.id)
      .order('sort_order', { ascending: true })
      .order('year', { ascending: true, nullsFirst: false })
    if (error) throw error
    res.json({
      room,
      media: (media || []).map((item) => ({ ...item, public_url: publicUrl(item.storage_path) })),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/rooms', async (req, res) => {
  try {
    const roomNumber = String(req.body.room_number || '').trim()
    const slug = cleanPart(req.body.slug || req.body.title)
    const title = String(req.body.title || '').trim()
    if (!roomNumber || !slug || !title) return res.status(400).json({ error: 'room_number, title and slug are required.' })

    const config = {
      storage_prefix: req.body.storage_prefix || `rooms/${cleanPart(roomNumber)}-${slug}`,
      ...(req.body.config || {}),
    }

    const { data, error } = await supabase
      .from('museum_rooms')
      .insert({
        room_number: roomNumber,
        slug,
        title,
        subtitle: req.body.subtitle || null,
        years_label: req.body.years_label || null,
        status: 'draft',
        config,
      })
      .select('*')
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.patch('/api/rooms/:id', async (req, res) => {
  try {
    const allowed = ['title', 'subtitle', 'years_label', 'status', 'config']
    const patch = {}
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body, key)) patch[key] = req.body[key]
    if (patch.status === 'published' && !Object.prototype.hasOwnProperty.call(req.body, 'published_at')) {
      patch.published_at = new Date().toISOString()
    }
    if (patch.status && patch.status !== 'published') patch.published_at = null

    const { data, error } = await supabase
      .from('museum_rooms')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/rooms/:id/media', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image file is required.' })
    const room = await getRoom(req.params.id)
    const data = await upsertMedia(room, req.file, req.body)
    res.status(201).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/rooms/:id/media/batch', upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'Choose one or more image files.' })
    const room = await getRoom(req.params.id)
    const saved = []
    for (const file of req.files) {
      const inferred = inferFileAssignment(file.originalname)
      saved.push(await upsertMedia(room, file, inferred))
    }
    res.status(201).json(saved)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.patch('/api/media/:id', async (req, res) => {
  try {
    const allowed = ['role', 'year', 'subject', 'alt_text', 'credit', 'crop_position', 'crop_size', 'sort_order', 'approved']
    const patch = {}
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body, key)) patch[key] = req.body[key]

    const { data, error } = await supabase
      .from('museum_room_media')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) throw error
    res.json({ ...data, public_url: publicUrl(data.storage_path) })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/media/:id', async (req, res) => {
  try {
    const { data: media, error: fetchError } = await supabase
      .from('museum_room_media')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (fetchError) throw fetchError

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([media.storage_path])
    if (storageError) throw storageError

    const { error: deleteError } = await supabase.from('museum_room_media').delete().eq('id', req.params.id)
    if (deleteError) throw deleteError
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: error.message || 'Unexpected manager error.' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Museum Room Manager: http://127.0.0.1:${PORT}`)
  console.log('Local-only server. Keep this window open while managing rooms.')
})
