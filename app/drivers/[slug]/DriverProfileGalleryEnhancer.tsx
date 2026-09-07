'use client'

import { useEffect } from 'react'

const TIPPING_POINT = 30
const PREVIEW_COUNT = 24

export default function DriverProfileGalleryEnhancer() {
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
    const profilePath = window.location.pathname.replace(/\/$/, '')
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
  }, [])

  return null
}
