'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const imageByEvent: Record<string, string> = {
  'clash-at-the-creek': 'https://upload.wikimedia.org/wikipedia/commons/e/ee/IMCA_Modifieds_doing_Delaware_Style_restart.jpg',
  'jmck-63': '/special-events/jmck-63/john-mckarns.svg',
  'mighty-axe-nationals': 'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/track-logos/north-central-speedway-mn.jpg',
  'street-stock-little-dream': '/special-events/street-stock-little-dream/rice-lake-wissota-street-stock.svg',
}

const titleByEvent: Record<string, string> = {
  'clash-at-the-creek': 'Clash at the Creek',
  'jmck-63': 'JMcK 63',
  'mighty-axe-nationals': 'Mighty Axe Nationals',
  'street-stock-little-dream': 'Street Stock Little Dream',
}

const heroAltByEvent: Record<string, string[]> = {
  'clash-at-the-creek': ['Clash at the Creek', 'Clash at the Creek at 141 Speedway'],
  'jmck-63': ['JMcK 63 at LaCrosse', 'JMcK 63'],
  'mighty-axe-nationals': ['Mighty Axe Nationals at North Central Speedway', 'Mighty Axe Nationals'],
  'street-stock-little-dream': ['Street Stock Little Dream at Rice Lake Speedway', 'Street Stock Little Dream'],
}

function replaceImage(image: HTMLImageElement, src: string) {
  if (image.getAttribute('src') === src) return
  image.src = src
  image.srcset = ''
}

export default function EventImageOverrides() {
  const pathname = usePathname()

  useEffect(() => {
    const apply = () => {
      if (pathname === '/events' || pathname === '/events/') {
        for (const [slug, src] of Object.entries(imageByEvent)) {
          const title = titleByEvent[slug]
          document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
            if (image.alt === title) replaceImage(image, src)
          })
        }
        return
      }

      const match = pathname.match(/^\/events\/([^/]+)/)
      if (!match) return
      const slug = match[1]
      const src = imageByEvent[slug]
      if (!src) return

      const acceptedAlts = heroAltByEvent[slug] || []
      const candidates = Array.from(document.querySelectorAll<HTMLImageElement>('main section img'))
      const hero = candidates.find((image) => acceptedAlts.includes(image.alt)) || candidates[0]
      if (hero) replaceImage(hero, src)
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname])

  return null
}
