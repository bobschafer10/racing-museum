'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const SEARCH_RESULT_PATHS = new Set(['/drivers', '/tracks', '/series'])

export default function SearchResultAutoScroll() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const query = (searchParams.get('q') || '').trim()

  useEffect(() => {
    if (!SEARCH_RESULT_PATHS.has(pathname) || !query) return

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('directory')
      if (!target) return

      const top = target.getBoundingClientRect().top + window.scrollY - 20
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })

      if (window.location.hash !== '#directory') {
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}#directory`,
        )
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pathname, query, queryString])

  return null
}
