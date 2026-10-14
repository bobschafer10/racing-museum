'use client'

import { useEffect, useMemo, useState } from 'react'

type DriverMatch = {
  driver_id: number
  driver_name: string
  slug: string
  hometown: string | null
  state: string | null
}

type Props = {
  photoId: number
  currentDriverSlug: string | null
  currentFileName: string
  nextFileName: string | null
}

const PIN_KEY = 'umarmResearchPin'

export default function ResearchPhotoEditor({ photoId, currentDriverSlug, currentFileName, nextFileName }: Props) {
  const [pin, setPin] = useState('')
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<DriverMatch[]>([])
  const [selected, setSelected] = useState<DriverMatch | null>(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    try { setPin(sessionStorage.getItem(PIN_KEY) || '') } catch {}
  }, [])

  useEffect(() => {
    const value = query.trim()
    setSelected(null)
    if (value.length < 2) {
      setMatches([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/photo-research/drivers?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const payload = await response.json()
        setMatches(response.ok ? (payload.drivers || []) : [])
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setMatches([])
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const currentLabel = useMemo(() => {
    if (!currentDriverSlug || currentDriverSlug === 'unknown-driver') return 'Unidentified driver'
    return currentDriverSlug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }, [currentDriverSlug])

  async function save() {
    if (!pin.trim()) {
      setStatus('Enter the research PIN first.')
      return
    }
    if (!selected) {
      setStatus('Select the matching driver before saving.')
      return
    }

    setSaving(true)
    setStatus('Saving identification…')

    try {
      const response = await fetch('/api/photo-research/update-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-umarm-research-pin': pin.trim(),
        },
        body: JSON.stringify({ photo_id: photoId, driver_slug: selected.slug }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setStatus(payload.error || 'Could not save this identification.')
        return
      }

      try { sessionStorage.setItem(PIN_KEY, pin.trim()) } catch {}
      setStatus(`Saved as ${payload.driver?.driver_name || selected.driver_name}.`)

      const target = nextFileName || payload.photo?.file_name || currentFileName
      window.setTimeout(() => {
        window.location.href = `/photo/${encodeURIComponent(target)}?research=1`
      }, 450)
    } catch {
      setStatus('Could not reach the research update service.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ma-section" id="research-editor">
      <div className="ma-panel" style={{ border: '1px solid #8a6b33', background: '#111619' }}>
        <div className="ma-kicker">Museum Research Mode</div>
        <h2 className="ma-h2" style={{ fontSize: 28, marginBottom: 8 }}>Identify This Bergeron Driver</h2>
        <p className="ma-note" style={{ maxWidth: 900, marginBottom: 18 }}>
          Current driver: <strong>{currentLabel}</strong>. Search the museum driver index, choose the correct person, and save. The stored photo filename is renamed at the same time so the archive remains consistent.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,.45fr) minmax(260px,1fr)', gap: 14, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="ma-card-label">Research PIN</span>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter once per browser session"
              autoComplete="off"
              style={{ padding: '11px 12px', background: '#080b0d', color: '#fff', border: '1px solid #394248', borderRadius: 3 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="ma-card-label">Search Driver Name</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Example: Ron Weyer"
              style={{ padding: '11px 12px', background: '#080b0d', color: '#fff', border: '1px solid #394248', borderRadius: 3 }}
            />
          </label>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
          {searching ? <div className="ma-note">Searching driver index…</div> : null}
          {!searching && query.trim().length >= 2 && matches.length === 0 ? <div className="ma-note">No matching published drivers found.</div> : null}
          {matches.map((driver) => {
            const active = selected?.slug === driver.slug
            const place = [driver.hometown, driver.state].filter(Boolean).join(', ')
            return (
              <button
                type="button"
                key={`${driver.driver_id}-${driver.slug}`}
                onClick={() => { setSelected(driver); setStatus('') }}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: active ? '1px solid #d1a651' : '1px solid #30383d',
                  background: active ? '#342716' : '#0b0f11',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <strong>{driver.driver_name}</strong>
                {place ? <span style={{ marginLeft: 8, color: '#aeb8bd', fontSize: 12 }}>{place}</span> : null}
                <span style={{ display: 'block', marginTop: 2, color: '#718087', fontSize: 11 }}>{driver.slug}</span>
              </button>
            )
          })}
        </div>

        <div className="ma-actions" style={{ marginTop: 16, alignItems: 'center' }}>
          <button type="button" className="ma-button" onClick={save} disabled={saving || !selected} style={{ cursor: saving || !selected ? 'default' : 'pointer', opacity: saving || !selected ? .55 : 1 }}>
            {saving ? 'Saving…' : 'Save Driver & Open Next'}
          </button>
          {nextFileName ? <a className="ma-button-ghost" href={`/photo/${encodeURIComponent(nextFileName)}?research=1`}>Skip This Photo →</a> : null}
          <a className="ma-button-ghost" href="/photos?photographer=bob-bergeron&driver=unknown-driver">Bergeron Unidentified Queue</a>
        </div>
        {status ? <div className="ma-note" style={{ marginTop: 12 }}>{status}</div> : null}
      </div>
    </section>
  )
}
