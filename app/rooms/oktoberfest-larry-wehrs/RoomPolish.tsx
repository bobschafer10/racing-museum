'use client'

import { useEffect } from 'react'

type CoverageReplacement = {
  currentHref: string
  newHref?: string
  label: string
}

const coverageReplacements: CoverageReplacement[] = [
  {
    currentHref: '/media/newspapers/midwest-racing-news/1970-10-01',
    label: 'Pre-Race Advertisement →',
  },
  {
    currentHref: '/media/newspapers/midwest-racing-news/1973-10-04',
    newHref: '/media/newspapers/midwest-racing-news/1973-12-13?sourcePage=19&q=Oktoberfest',
    label: 'Post-Race Recap →',
  },
  {
    currentHref: '/media/newspapers/midwest-racing-news/1974-10-03',
    newHref: '/media/newspapers/checkered-flag-racing-news/1974-12-11?sourcePage=7&q=Oktoberfest',
    label: 'Post-Race Coverage →',
  },
  {
    currentHref: '/media/newspapers/midwest-racing-news/1975-10-02',
    newHref: '/media/newspapers/checkered-flag-racing-news/1975-12-10?sourcePage=2&q=Oktoberfest',
    label: 'Full Race Story →',
  },
  {
    currentHref: '/media/newspapers/midwest-racing-news/1980-10-02',
    newHref: '/media/newspapers/midwest-racing-news/1980-12-11?sourcePage=19&q=Oktoberfest',
    label: 'Full Race Story →',
  },
  {
    currentHref: '/media/newspapers/midwest-racing-news/1981-10-01',
    newHref: '/media/newspapers/midwest-racing-news/1981-12-10?sourcePage=24&q=Oktoberfest',
    label: 'Full Race Story →',
  },
  {
    currentHref: '/media/newspapers/midwest-racing-news/1985-10-17',
    newHref: '/media/newspapers/midwest-racing-news/1985-11-14?sourcePage=5&q=Oktoberfest',
    label: 'Post-Race Coverage →',
  },
]

export default function RoomPolish() {
  useEffect(() => {
    const yearSection = document.querySelector('#year-by-year')
    if (!yearSection) return

    for (const replacement of coverageReplacements) {
      const link = Array.from(yearSection.querySelectorAll<HTMLAnchorElement>('a')).find((candidate) =>
        candidate.getAttribute('href')?.startsWith(replacement.currentHref),
      )

      if (!link) continue
      if (replacement.newHref) link.href = replacement.newHref
      link.textContent = replacement.label
      link.setAttribute('aria-label', replacement.label.replace(' →', ''))
    }
  }, [])

  return null
}
