'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const TIPPING_POINT = 30
const PREVIEW_COUNT = 24

type WinningTrack = {
  track_name: string
  track_slug: string | null
  wins: number
}

export default function DriverProfileGalleryEnhancer() {
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false

    async function enhanceWinningTracks() {
      const parts = pathname.split('/').filter(Boolean)
      if (parts[0] !== 'drivers' || !parts[1]) return

      try {
        const response = await fetch(`/api/driver-winning-tracks/${encodeURIComponent(parts[1])}`)
        if (!response.ok) return

        const payload = (await response.json()) as { count?: number; tracks?: WinningTrack[] }
        if (cancelled) return

        const tracks = Array.isArray(payload.tracks) ? payload.tracks : []
        const count = Number(payload.count ?? tracks.length)

        const metricCards = Array.from(
          document.querySelectorAll<HTMLElement>('[class*="metricCard"]'),
        )
        const tracksMetric = metricCards.find((card) =>
          Array.from(card.querySelectorAll('span')).some(
            (span) => span.textContent?.trim() === 'Tracks Won At',
          ),
        )
        const metricValue = tracksMetric?.querySelector('strong')
        if (metricValue && Number.isFinite(count)) {
          metricValue.textContent = count.toLocaleString('en-US')
        }

        const trackHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h3')).find(
          (heading) => heading.textContent?.trim() === 'Feature Wins by Track',
        )
        const panel = trackHeading?.parentElement
        if (!panel || tracks.length === 0) return

        const existingRows = Array.from(
          panel.querySelectorAll<HTMLElement>('[class*="rankRow"]'),
        )
        const rowClassName = existingRows[0]?.className || ''
        existingRows.forEach((row) => row.remove())

        tracks.forEach((track, index) => {
          const row = document.createElement(track.track_slug ? 'a' : 'div')
          if (rowClassName) row.className = rowClassName
          if (track.track_slug && row instanceof HTMLAnchorElement) {
            row.href = `/tracks/${track.track_slug}`
          }

          const label = document.createElement('span')
          const rank = document.createElement('small')
          rank.textContent = String(index + 1).padStart(2, '0')
          label.append(rank, document.createTextNode(track.track_name || 'Unknown track'))

          const wins = document.createElement('strong')
          wins.textContent = Number(track.wins || 0).toLocaleString('en-US')

          row.append(label, wins)
          panel.append(row)
        })
      } catch {
        // Keep the server-rendered panel as a fallback if enhancement fails.
      }
    }

    void enhanceWinningTracks()
    return () => {
      cancelled = true
    }
  }, [pathname])

  useEffect(() => {
    const section = document.getElementById('photos')
    if (!section) return

    const grid = section.querySelector<HTMLElement>('[class*="photoGrid"]')
    if (!grid) return

    const cards = Array.from(grid.querySelectorAll<HTMLElement>(':scope > article'))
    if (cards.length <= TIPPING_POINT) return

    section.dataset.galleryCapped = 'true'

    const controls = document.createElement('div')
    controls.className = 'driver-photo-gallery-controls'

    const copy = document.createElement('div')
    copy.className = 'driver-photo-gallery-copy'

    const title = document.createElement('strong')
    title.textContent = 'Large museum photo collection'

    const detail = document.createElement('span')
    detail.textContent = `Showing ${PREVIEW_COUNT} selected images here so the driver profile stays easy to navigate.`

    copy.append(title, detail)

    const actions = document.createElement('div')
    actions.className = 'driver-photo-gallery-actions'

    const archiveLink = document.createElement('a')
    const profilePath = pathname.replace(/\/$/, '')
    archiveLink.href = `${profilePath}/photos`
    archiveLink.textContent = 'View complete photo archive →'

    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.textContent = `Show all ${cards.length} photos on this page`
    toggle.addEventListener('click', () => {
      const expanded = section.dataset.galleryExpanded === 'true'
      section.dataset.galleryExpanded = expanded ? 'false' : 'true'
      toggle.textContent = expanded
        ? `Show all ${cards.length} photos on this page`
        : 'Collapse to selected photos'
    })

    actions.append(archiveLink, toggle)
    controls.append(copy, actions)
    grid.insertAdjacentElement('afterend', controls)

    return () => {
      controls.remove()
      delete section.dataset.galleryCapped
      delete section.dataset.galleryExpanded
    }
  }, [pathname])

  return null
}
