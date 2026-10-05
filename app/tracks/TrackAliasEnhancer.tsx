'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import styles from './track-aliases.module.css'

type TrackAlias = {
  track_slug: string
  alias_name: string
  start_year?: number | null
  end_year?: number | null
  alias_logo_url?: string | null
  sort_order?: number | null
}

function formatAliasYears(alias: TrackAlias) {
  if (alias.start_year && alias.end_year) {
    return alias.start_year === alias.end_year
      ? String(alias.start_year)
      : `${alias.start_year}–${alias.end_year}`
  }
  if (alias.start_year) return `${alias.start_year}–`
  if (alias.end_year) return `through ${alias.end_year}`
  return ''
}

export default function TrackAliasEnhancer({ aliases }: { aliases: TrackAlias[] }) {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/tracks' || aliases.length === 0) return

    const aliasesBySlug = new Map<string, TrackAlias[]>()
    aliases.forEach((alias) => {
      const existing = aliasesBySlug.get(alias.track_slug) ?? []
      existing.push(alias)
      aliasesBySlug.set(alias.track_slug, existing)
    })

    const insertedBlocks: HTMLElement[] = []
    const touchedLinks: HTMLAnchorElement[] = []
    const trackLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href^="/tracks/"]'),
    )

    trackLinks.forEach((link) => {
      const href = link.getAttribute('href') || ''
      const slug = href.startsWith('/tracks/') ? href.slice('/tracks/'.length).split(/[?#]/)[0] : ''
      const trackAliases = aliasesBySlug.get(slug)

      if (!trackAliases?.length || link.dataset.trackAliasEnhanced === 'true') return

      const cardName = link.querySelector<HTMLElement>(
        '[class*="trackCardName"], [class*="discoveryName"]',
      )
      const tableCell = link.closest('td')

      if (!cardName && !tableCell) return

      const block = document.createElement('div')
      block.className = `${styles.aliasBlock} ${tableCell ? styles.directoryAlias : styles.cardAlias}`
      block.setAttribute('aria-label', 'Historic or alternate track names')

      const label = document.createElement('span')
      label.className = styles.aliasLabel
      label.textContent = trackAliases.length === 1 ? 'Also known as' : 'Historic names'
      block.appendChild(label)

      const names = document.createElement('span')
      names.className = styles.aliasNames

      trackAliases.forEach((alias) => {
        const item = document.createElement('span')
        item.className = styles.aliasItem

        if (alias.alias_logo_url) {
          const image = document.createElement('img')
          image.src = alias.alias_logo_url
          image.alt = alias.alias_name
          image.className = styles.aliasLogo
          item.appendChild(image)
        } else {
          const wordmark = document.createElement('span')
          wordmark.className = styles.aliasWordmark
          wordmark.textContent = alias.alias_name
          item.appendChild(wordmark)
        }

        const years = formatAliasYears(alias)
        if (years) {
          const yearSpan = document.createElement('span')
          yearSpan.className = styles.aliasYears
          yearSpan.textContent = years
          item.appendChild(yearSpan)
        }

        names.appendChild(item)
      })

      block.appendChild(names)

      if (cardName) {
        cardName.insertAdjacentElement('afterend', block)
      } else {
        link.insertAdjacentElement('afterend', block)
      }

      link.dataset.trackAliasEnhanced = 'true'
      touchedLinks.push(link)
      insertedBlocks.push(block)
    })

    return () => {
      insertedBlocks.forEach((block) => block.remove())
      touchedLinks.forEach((link) => delete link.dataset.trackAliasEnhanced)
    }
  }, [aliases, pathname])

  return null
}
