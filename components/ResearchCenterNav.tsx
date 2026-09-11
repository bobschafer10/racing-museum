'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TOOLS = [
  { key: 'feature-wins', label: 'Feature Wins', href: '/stats/feature-winners' },
  { key: 'results', label: 'Results Archive', href: '/results' },
  { key: 'newspapers', label: 'Newspaper OCR', href: '/media/newspapers#newspaper-search' },
  { key: 'standings', label: 'Tracks & Standings', href: '/tracks' },
] as const

export default function ResearchCenterNav() {
  const pathname = usePathname()

  const standingsRoute = /^\/tracks\/[^/]+\/standings(?:\/|$)/.test(pathname)
  const activeKey = pathname.startsWith('/stats/feature-winners')
    ? 'feature-wins'
    : pathname.startsWith('/results')
      ? 'results'
      : pathname.startsWith('/media/newspapers')
        ? 'newspapers'
        : standingsRoute
          ? 'standings'
          : null

  if (!activeKey) return null

  return (
    <nav className="rc-tool-nav" aria-label="Research Center tools">
      <div className="rc-tool-nav-inner">
        <div className="rc-tool-nav-title">
          <span>Victory Lane</span>
          <strong>Research Center</strong>
        </div>

        <div className="rc-tool-nav-links">
          {TOOLS.map((tool) => {
            const active = activeKey === tool.key
            const href = tool.key === 'standings' && standingsRoute ? pathname : tool.href

            return (
              <Link
                key={tool.key}
                href={href}
                className={`rc-tool-nav-link${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tool.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
