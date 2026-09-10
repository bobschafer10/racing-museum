'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DriverReportUtility() {
  const pathname = usePathname()
  if (!pathname || pathname.endsWith('/feature-win-report')) return null

  const match = pathname.match(/^\/drivers\/([^/]+)/)
  if (!match) return null

  const slug = match[1]

  return (
    <div className="driver-report-utility" aria-label="Driver research tools">
      <div className="driver-report-utility-inner">
        <span>Driver Research Tool</span>
        <Link href={`/drivers/${slug}/feature-win-report`}>Feature Win Report (PDF)</Link>
      </div>
    </div>
  )
}
