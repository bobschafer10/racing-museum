const $ = (id) => document.getElementById(id)

const state = {
  rooms: [],
  current: null,
}

const ROOM001_NAMES = {
  1970: 'Tom Reffner',
  1971: 'Dick Trickle',
  1972: 'Joe Shear',
  1973: 'Marv Marzofka',
  1974: 'Jerry Makara',
  1975: 'Tom Reffner',
  1976: 'Larry Detjens',
  1977: 'Larry Detjens',
  1978: 'Dave Watson',
  1979: 'Butch Miller',
  1980: 'Mark Martin',
  1981: 'Junior Hanley',
  1982: 'Jim Back',
  1983: 'Tom Reffner',
  1984: 'Bryan Reffner',
  1985: 'Tom Reffner',
  1986: 'Rich Bickle Jr.',
}

const CROP_POSITIONS = [
  ['center center', 'Center'],
  ['center top', 'Top'],
  ['center bottom', 'Bottom'],
  ['left center', 'Left'],
  ['right center', 'Right'],
  ['left top', 'Top left'],
  ['right top', 'Top right'],
  ['left bottom', 'Bottom left'],
  ['right bottom', 'Bottom right'],
]

async function api(url, options = {}) {
  const response = await fetch(url, options)
  let payload = null
  try { payload = await response.json() } catch (_) {}
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`)
  return payload
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function showMessage(message, type = '') {
  const node = $('saveMessage')
  node.textContent = message
  node.style.color = type === 'error' ? '#8a2c23' : '#2f6a4f'
  if (message) setTimeout(() => {
    if (node.textContent === message) node.textContent = ''
  }, 3500)
}

async function checkHealth() {
  const node = $('connectionStatus')
  try {
    const health = await api('/api/health')
    node.textContent = `Connected • Supabase • ${health.bucket}`
    node.className = 'connection ok'
  } catch (error) {
    node.textContent = `Connection problem • ${error.message}`
    node.className = 'connection bad'
  }
}

async function loadRooms(preferredId) {
  state.rooms = await api('/api/rooms')
  renderRoomList()
  const id = preferredId || state.current?.room?.id || state.rooms[0]?.id
  if (id) await selectRoom(id)
}

function renderRoomList() {
  const list = $('roomList')
  list.innerHTML = ''
  for (const room of state.rooms) {
    const button = el('button', `room-item ${state.current?.room?.id === room.id ? 'active' : ''}`)
    button.type = 'button'
    button.append(el('span', '', `Room ${room.room_number}`))
    button.append(el('b', '', room.title))
    button.append(el('span', `status-pill ${room.status}`, room.status))
    button.addEventListener('click', () => selectRoom(room.id))
    list.append(button)
  }
}

async function selectRoom(id) {
  state.current = await api(`/api/rooms/${id}`)
  $('emptyState').classList.add('hidden')
  $('roomWorkspace').classList.remove('hidden')
  renderRoomList()
  renderWorkspace()
}

function renderWorkspace() {
  const { room } = state.current
  $('roomEyebrow').textContent = `Room ${room.room_number} • ${room.status}`
  $('roomTitle').textContent = room.title
  $('roomSubtitle').textContent = room.subtitle || room.years_label || ''
  $('titleInput').value = room.title || ''
  $('subtitleInput').value = room.subtitle || ''
  $('yearsInput').value = room.years_label || ''
  $('statusInput').value = room.status

  const note = $('publicationNote')
  if (room.status === 'published') {
    note.textContent = 'Published: approved Room assets can be read by the public website.'
    note.className = 'publication-note published'
  } else {
    note.textContent = `${room.status === 'preview' ? 'Preview' : 'Draft'}: this Room remains hidden from the public website.`
    note.className = 'publication-note'
  }

  renderIdentity()
  renderWinners()
  renderArtifacts()
}

function mediaBySlot(slot) {
  return state.current.media.find((item) => item.slot_key === slot)
}

function expectedName(year) {
  if (state.current.room.slug === 'oktoberfest-larry-wehrs') return ROOM001_NAMES[year] || `Winner ${year}`
  return `Timeline ${year}`
}

function imageVisual(media, label, year) {
  const visual = el('div', 'asset-visual')
  if (year) visual.append(el('span', 'winner-year', String(year)))
  if (media) {
    const img = document.createElement('img')
    img.src = media.public_url
    img.alt = media.alt_text || media.subject || label
    img.style.objectPosition = media.crop_position || 'center center'
    visual.append(img)
  } else if (year) {
    const plaque = el('div', 'year-plaque')
    plaque.append(el('b', '', String(year)))
    plaque.append(el('span', '', 'Photo needed'))
    visual.append(plaque)
  } else {
    const empty = el('div', 'empty-visual')
    empty.append(el('b', '', label))
    empty.append(el('small', '', 'No approved image yet'))
    visual.append(empty)
  }
  return visual
}

function buildCropSelect(media) {
  const select = document.createElement('select')
  select.dataset.field = 'crop_position'
  for (const [value, label] of CROP_POSITIONS) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    option.selected = (media?.crop_position || 'center center') === value
    select.append(option)
  }
  return select
}

function makeInputLabel(labelText, input) {
  const label = document.createElement('label')
  label.textContent = labelText
  label.append(input)
  return label
}

function buildAssetCard({ slot, role, year = null, label, defaultSubject = '', media = null, winner = false }) {
  const card = el('article', `${winner ? 'winner-card' : 'asset-card'} ${media ? '' : 'missing'}`)
  card.dataset.slot = slot
  if (media?.id) card.dataset.mediaId = media.id
  card.append(imageVisual(media, label, year))

  const body = el('div', 'asset-body')
  const titleRow = el('div', 'asset-title-row')
  titleRow.append(el('strong', '', media?.subject || defaultSubject || label))
  titleRow.append(el('small', '', role))
  body.append(titleRow)

  const subject = document.createElement('input')
  subject.type = 'text'
  subject.value = media?.subject || defaultSubject || ''
  subject.dataset.field = 'subject'
  subject.placeholder = label

  const credit = document.createElement('input')
  credit.type = 'text'
  credit.value = media?.credit || ''
  credit.dataset.field = 'credit'
  credit.placeholder = 'Photographer / collection'

  const fieldRow = el('div', 'field-row')
  fieldRow.append(makeInputLabel('Subject', subject))
  fieldRow.append(makeInputLabel('Crop', buildCropSelect(media)))
  body.append(fieldRow)
  body.append(makeInputLabel('Credit', credit))

  const actions = el('div', 'card-actions')
  const fileLabel = el('label', 'file-button', media ? 'Replace image' : 'Add image')
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    await uploadSlot({ file, slot, role, year, card })
  })
  fileLabel.append(fileInput)
  actions.append(fileLabel)

  if (media) {
    const approval = el('label', 'approval')
    const approved = document.createElement('input')
    approved.type = 'checkbox'
    approved.checked = media.approved !== false
    approved.dataset.field = 'approved'
    approval.append(approved, document.createTextNode('Approved'))
    actions.append(approval)

    const save = el('button', '', 'Save')
    save.type = 'button'
    save.addEventListener('click', () => saveMediaCard(card))
    actions.append(save)

    const remove = el('button', 'delete-button', 'Remove')
    remove.type = 'button'
    remove.addEventListener('click', () => deleteMedia(media))
    actions.append(remove)
  }

  body.append(actions)
  card.append(body)
  return card
}

function renderIdentity() {
  const grid = $('identityGrid')
  grid.innerHTML = ''
  const slots = [
    ['watermark', 'watermark', 'Watermark / identity', 'Larry Wehrs'],
    ['hero', 'hero', 'Hero image', 'Room hero'],
    ['story', 'story', 'Story image', 'Origin story'],
  ]
  for (const [slot, role, label, subject] of slots) {
    grid.append(buildAssetCard({ slot, role, label, defaultSubject: subject, media: mediaBySlot(slot) }))
  }
}

function roomYears() {
  const config = state.current.room.config || {}
  const start = Number(config.year_start || 0)
  const end = Number(config.year_end || 0)
  if (start && end && end >= start && end - start <= 80) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  return state.current.media.filter((m) => m.year).map((m) => m.year).sort((a,b) => a-b)
}

function renderWinners() {
  const grid = $('winnerGrid')
  grid.innerHTML = ''
  const years = roomYears()
  $('winnerWallTitle').textContent = state.current.room.slug === 'oktoberfest-larry-wehrs' ? 'Year by Year • 1970–1986' : 'Timeline Wall'
  let covered = 0
  for (const year of years) {
    const slot = `winner-${year}`
    const media = mediaBySlot(slot)
    if (media?.approved) covered++
    grid.append(buildAssetCard({
      slot,
      role: 'winner',
      year,
      label: `${year} winner`,
      defaultSubject: media?.subject || expectedName(year),
      media,
      winner: true,
    }))
  }
  $('coverageCount').textContent = `${covered} of ${years.length} approved photos`
}

function renderArtifacts() {
  const grid = $('artifactGrid')
  grid.innerHTML = ''
  const media = state.current.media.filter((item) => !['watermark','hero','story','winner'].includes(item.role))
  if (!media.length) {
    const empty = el('div', 'empty-visual')
    empty.style.minHeight = '120px'
    empty.append(el('b', '', 'Display case is empty'))
    empty.append(el('small', '', 'Add only the artifacts that improve the story.'))
    grid.append(empty)
    return
  }
  for (const item of media) {
    grid.append(buildAssetCard({ slot: item.slot_key, role: item.role, label: item.subject || 'Artifact', media: item }))
  }
}

async function uploadSlot({ file, slot, role, year, card, subjectOverride }) {
  const subject = subjectOverride || card?.querySelector('[data-field="subject"]')?.value || (year ? expectedName(year) : slot)
  const credit = card?.querySelector('[data-field="credit"]')?.value || ''
  const cropPosition = card?.querySelector('[data-field="crop_position"]')?.value || 'center center'
  const progress = $('batchProgress')
  progress.className = 'batch-progress'
  progress.textContent = `Uploading ${file.name}…`

  try {
    const form = new FormData()
    form.append('file', file)
    form.append('slot_key', slot)
    form.append('role', role)
    if (year) form.append('year', String(year))
    form.append('subject', subject)
    form.append('alt_text', year ? `${subject}, ${year} Oktoberfest` : subject)
    form.append('credit', credit)
    form.append('crop_position', cropPosition)
    form.append('approved', 'true')

    const response = await fetch(`/api/rooms/${state.current.room.id}/media`, { method: 'POST', body: form })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Upload failed')
    progress.className = 'batch-progress success'
    progress.textContent = `${file.name} saved to Supabase Storage.`
    await selectRoom(state.current.room.id)
  } catch (error) {
    progress.className = 'batch-progress error'
    progress.textContent = error.message
  }
}

async function saveMediaCard(card) {
  const id = card.dataset.mediaId
  if (!id) return
  const patch = {}
  for (const node of card.querySelectorAll('[data-field]')) {
    patch[node.dataset.field] = node.type === 'checkbox' ? node.checked : node.value
  }
  try {
    await api(`/api/media/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    showMessage('Image details saved.')
    await selectRoom(state.current.room.id)
  } catch (error) {
    showMessage(error.message, 'error')
  }
}

async function deleteMedia(media) {
  if (!confirm(`Remove ${media.subject || media.slot_key} from this Room and delete its stored Room image?`)) return
  try {
    await api(`/api/media/${media.id}`, { method: 'DELETE' })
    showMessage('Image removed.')
    await selectRoom(state.current.room.id)
  } catch (error) {
    showMessage(error.message, 'error')
  }
}

async function saveRoom() {
  const status = $('statusInput').value
  if (status === 'published' && state.current.room.status !== 'published') {
    const approved = state.current.media.filter((m) => m.approved).length
    if (!confirm(`Publish Room ${state.current.room.room_number}? It currently has ${approved} approved images. The Room will become readable by the public website.`)) return
  }
  try {
    const room = await api(`/api/rooms/${state.current.room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: $('titleInput').value.trim(),
        subtitle: $('subtitleInput').value.trim() || null,
        years_label: $('yearsInput').value.trim() || null,
        status,
      }),
    })
    state.current.room = room
    showMessage('Room settings saved.')
    await loadRooms(room.id)
  } catch (error) {
    showMessage(error.message, 'error')
  }
}

async function importBatch(files) {
  if (!files?.length) return
  const progress = $('batchProgress')
  progress.className = 'batch-progress'
  progress.textContent = `Uploading ${files.length} image${files.length === 1 ? '' : 's'} directly to Supabase Storage…`
  const form = new FormData()
  for (const file of files) form.append('files', file)

  try {
    const response = await fetch(`/api/rooms/${state.current.room.id}/media/batch`, { method: 'POST', body: form })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Batch upload failed')
    progress.className = 'batch-progress success'
    progress.textContent = `${payload.length} image${payload.length === 1 ? '' : 's'} imported and assigned. Review the wall below before publishing.`
    await selectRoom(state.current.room.id)
  } catch (error) {
    progress.className = 'batch-progress error'
    progress.textContent = error.message
  } finally {
    $('batchInput').value = ''
  }
}

function renderPreview() {
  const dialog = $('previewDialog')
  const content = $('previewContent')
  const room = state.current.room
  $('previewTitle').textContent = `Room ${room.room_number} • ${room.title}`
  content.innerHTML = ''

  const hero = el('section', 'preview-hero')
  const heroMedia = mediaBySlot('hero')
  if (heroMedia) hero.style.backgroundImage = `url(${JSON.stringify(heroMedia.public_url).slice(1,-1)})`
  const heroCopy = el('div', 'preview-hero-copy')
  const watermark = mediaBySlot('watermark')
  if (watermark) {
    const img = document.createElement('img')
    img.className = 'preview-watermark'
    img.src = watermark.public_url
    img.alt = watermark.alt_text || 'Room identity'
    img.style.objectPosition = watermark.crop_position || 'center center'
    heroCopy.append(img)
  }
  heroCopy.append(el('span', 'eyebrow', `Museum Room ${room.room_number}`))
  heroCopy.append(el('h2', '', room.title))
  heroCopy.append(el('p', '', [room.subtitle, room.years_label].filter(Boolean).join(' • ')))
  hero.append(heroCopy)
  content.append(hero)

  const wall = el('section', 'preview-wall')
  wall.append(el('h3', '', state.current.room.slug === 'oktoberfest-larry-wehrs' ? 'Year by Year • 1970–1986' : 'Timeline'))
  const years = el('div', 'preview-years')
  for (const year of roomYears()) {
    const media = mediaBySlot(`winner-${year}`)
    const card = el('article', 'preview-year')
    const pic = el('div', 'pic')
    if (media?.approved) {
      const img = document.createElement('img')
      img.src = media.public_url
      img.alt = media.alt_text || media.subject || String(year)
      img.style.objectPosition = media.crop_position || 'center center'
      pic.append(img)
    } else {
      pic.append(el('span', 'fallback', String(year)))
    }
    const copy = el('div', 'copy')
    copy.append(el('small', '', String(year)))
    copy.append(el('b', '', media?.subject || expectedName(year)))
    card.append(pic, copy)
    years.append(card)
  }
  wall.append(years)
  content.append(wall)
  dialog.showModal()
}

function setupEvents() {
  $('saveRoomButton').addEventListener('click', saveRoom)
  $('previewButton').addEventListener('click', renderPreview)
  $('closePreviewButton').addEventListener('click', () => $('previewDialog').close())

  $('batchInput').addEventListener('change', () => importBatch($('batchInput').files))
  const drop = $('batchDrop')
  for (const type of ['dragenter','dragover']) {
    drop.addEventListener(type, (event) => {
      event.preventDefault()
      drop.classList.add('dragover')
    })
  }
  for (const type of ['dragleave','drop']) {
    drop.addEventListener(type, (event) => {
      event.preventDefault()
      drop.classList.remove('dragover')
    })
  }
  drop.addEventListener('drop', (event) => importBatch(event.dataTransfer.files))

  $('addArtifactButton').addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return
      const subject = prompt('Artifact title?', file.name.replace(/\.[^.]+$/, '')) || 'Museum artifact'
      await uploadSlot({
        file,
        slot: `artifact-${Date.now()}`,
        role: 'artifact',
        year: null,
        subjectOverride: subject,
      })
    })
    input.click()
  })

  $('newRoomButton').addEventListener('click', () => $('newRoomDialog').showModal())
  $('cancelNewRoom').addEventListener('click', () => $('newRoomDialog').close())
  $('newRoomForm').addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const room = await api('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      })
      $('newRoomDialog').close()
      event.currentTarget.reset()
      await loadRooms(room.id)
    } catch (error) {
      alert(error.message)
    }
  })
}

async function boot() {
  setupEvents()
  await checkHealth()
  try {
    await loadRooms()
  } catch (error) {
    $('emptyState').innerHTML = ''
    $('emptyState').append(el('h1', '', 'Manager could not load'))
    $('emptyState').append(el('p', '', error.message))
  }
}

boot()
