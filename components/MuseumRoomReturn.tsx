'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type RoomReturn = {
  href: string
  label: string
}

const DEFAULT_LABEL = 'Return to Museum Room'

export default function MuseumRoomReturn() {
  const [roomReturn, setRoomReturn] = useState<RoomReturn | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedHref = params.get('returnTo')

    // Keep this navigation intentionally limited to museum-room routes.
    if (!requestedHref || !requestedHref.startsWith('/rooms/')) return

    const requestedLabel = params.get('returnLabel')?.trim()
    setRoomReturn({
      href: requestedHref,
      label: requestedLabel || DEFAULT_LABEL,
    })
  }, [])

  if (!roomReturn) return null

  return (
    <div style={returnWrap}>
      <Link href={roomReturn.href} style={returnLink}>
        ← {roomReturn.label}
      </Link>
    </div>
  )
}

const returnWrap: React.CSSProperties = {
  position: 'fixed',
  right: '18px',
  bottom: '18px',
  zIndex: 10000,
  maxWidth: 'calc(100vw - 36px)',
}

const returnLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '44px',
  padding: '10px 15px',
  border: '1px solid #b58b52',
  borderRadius: '4px',
  background: '#3a2719',
  color: '#f3e4c7',
  boxShadow: '0 4px 14px rgba(0,0,0,.28)',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '.02em',
  textDecoration: 'none',
}
