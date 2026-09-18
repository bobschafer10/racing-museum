'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'

export default function DriverReportUtility() {
  const pathname = usePathname()
  const [heroActions, setHeroActions] = useState<HTMLElement | null>(null)

  const match = pathname?.match(/^\/drivers\/([^/]+)/)
  const slug = match?.[1]
  const isProfilePage = Boolean(pathname && slug && pathname.replace(/\/$/, '') === `/drivers/${slug}`)

  useEffect(() => {
    if (!isProfilePage) {
      setHeroActions(null)
      return
    }

    const findHeroActions = () => {
      const target = document.querySelector<HTMLElement>('[class*="heroActions"]')
      setHeroActions(target)
    }

    findHeroActions()
    const frame = window.requestAnimationFrame(findHeroActions)
    return () => window.cancelAnimationFrame(frame)
  }, [isProfilePage, pathname])

  if (!pathname || !slug || pathname.endsWith('/feature-win-report')) return null

  const reportLink = (
    <Link
      href={`/drivers/${slug}/feature-win-report`}
      className={isProfilePage ? 'driver-feature-report-action' : undefined}
    >
      Feature Win Report (PDF)
    </Link>
  )

  if (isProfilePage) {
    return heroActions ? createPortal(reportLink, heroActions) : null
  }

  return (
    <div className="driver-report-utility" aria-label="Driver research tools">
      <div className="driver-report-utility-inner">
        <span>Driver Research Tool</span>
        {reportLink}
      </div>
    </div>
  )
}
