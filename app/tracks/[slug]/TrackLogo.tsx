'use client'

import type { CSSProperties } from 'react'

export default function TrackLogo({
  slug,
  trackName,
}: {
  slug: string
  trackName: string
}) {
  const logoPathJpg = `/logos/tracks/${slug}.jpg`
  const logoPathPng = `/logos/tracks/${slug}.png`
  const fallbackIndex = hashSlug(slug) % fallbackDesigns.length
  const fallback = fallbackDesigns[fallbackIndex]
  const initials = getInitials(trackName)

  return (
    <div style={logoWrap}>
      <img
        src={logoPathJpg}
        alt={`${trackName} logo`}
        style={logoImage}
        onError={(e) => {
          const target = e.currentTarget

          if (!target.src.includes('.png')) {
            target.src = logoPathPng
          } else {
            target.style.display = 'none'
            const fallbackEl = target.nextElementSibling as HTMLElement | null
            if (fallbackEl) fallbackEl.style.display = 'flex'
          }
        }}
      />

      <div
        style={{
          ...logoFallbackBase,
          ...fallback.wrap,
          display: 'none',
        }}
      >
        <div style={fallback.topLabel}>{fallback.label}</div>

        <div style={fallback.center}>
          {fallback.showInitials ? initials : fallback.symbol}
        </div>

        <div style={fallback.name}>{trackName}</div>

        <div style={fallback.bottomLabel}>{fallback.bottom}</div>
      </div>
    </div>
  )
}

function hashSlug(slug: string) {
  return slug.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function getInitials(trackName: string) {
  return trackName
    .replace(/speedway|raceway|fairgrounds|grounds|track|park|motor|motors|county|state/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'TRK'
}

const logoWrap: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#efe7d6',
  overflow: 'hidden',
}

const logoImage: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
}

const logoFallbackBase: CSSProperties = {
  width: '100%',
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '16px',
  color: '#4a3218',
  position: 'relative',
  overflow: 'hidden',
}

const fallbackDesigns = [
  {
    label: 'Archive Track',
    bottom: 'Logo Needed',
    symbol: '🏁',
    showInitials: true,
    wrap: {
      background:
        'linear-gradient(135deg, #f4ead3 0%, #ddc8a2 100%)',
      border: '8px solid rgba(122, 88, 39, 0.16)',
    },
    topLabel: {
      fontSize: '12px',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      fontWeight: 700,
      color: '#7a5827',
      marginBottom: '10px',
    },
    center: {
      width: '74px',
      height: '74px',
      borderRadius: '999px',
      border: '3px solid #7a5827',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '26px',
      fontWeight: 900,
      background: '#efe1c7',
      color: '#3d2b16',
      marginBottom: '12px',
    },
    name: {
      fontSize: '18px',
      fontWeight: 800,
      lineHeight: 1.15,
      maxWidth: '92%',
    },
    bottomLabel: {
      marginTop: '8px',
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color: '#7a5827',
      fontWeight: 700,
    },
  },
  {
    label: 'Admit One',
    bottom: 'Historic Venue',
    symbol: 'TICKET',
    showInitials: false,
    wrap: {
      background:
        'linear-gradient(to bottom, #f7edd8 0%, #e0c89d 100%)',
      borderTop: '6px double #7a5827',
      borderBottom: '6px double #7a5827',
    },
    topLabel: {
      fontSize: '13px',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      fontWeight: 800,
      color: '#7a5827',
      marginBottom: '12px',
    },
    center: {
      padding: '8px 12px',
      border: '2px dashed #8b642e',
      fontSize: '13px',
      fontWeight: 900,
      letterSpacing: '1px',
      color: '#5b3a1b',
      marginBottom: '12px',
    },
    name: {
      fontSize: '19px',
      fontWeight: 800,
      lineHeight: 1.15,
      maxWidth: '94%',
    },
    bottomLabel: {
      marginTop: '8px',
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color: '#7a5827',
      fontWeight: 700,
    },
  },
  {
    label: 'Race Program',
    bottom: 'Archive Record',
    symbol: 'PROGRAM',
    showInitials: true,
    wrap: {
      background:
        'linear-gradient(160deg, #efe1c7 0%, #f8efd9 48%, #d7bd8c 100%)',
      border: '1px solid #b29364',
    },
    topLabel: {
      fontSize: '12px',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      fontWeight: 800,
      color: '#7a5827',
      marginBottom: '10px',
    },
    center: {
      fontSize: '34px',
      fontWeight: 900,
      color: '#7b1e17',
      borderTop: '3px solid #7b1e17',
      borderBottom: '3px solid #7b1e17',
      padding: '5px 12px',
      marginBottom: '12px',
    },
    name: {
      fontSize: '18px',
      fontWeight: 800,
      lineHeight: 1.15,
      maxWidth: '94%',
    },
    bottomLabel: {
      marginTop: '8px',
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color: '#7a5827',
      fontWeight: 700,
    },
  },
  {
    label: 'Speedway Sign',
    bottom: 'Museum File',
    symbol: 'OVAL',
    showInitials: true,
    wrap: {
      background:
        'radial-gradient(circle at center, #f7edd8 0%, #d7bd8c 100%)',
      border: '1px solid #b29364',
    },
    topLabel: {
      fontSize: '12px',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      fontWeight: 800,
      color: '#7a5827',
      marginBottom: '12px',
    },
    center: {
      minWidth: '100px',
      minHeight: '58px',
      borderRadius: '50%',
      border: '4px solid #3d2b16',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      fontWeight: 900,
      background: '#efe1c7',
      color: '#3d2b16',
      marginBottom: '12px',
      padding: '0 14px',
    },
    name: {
      fontSize: '18px',
      fontWeight: 800,
      lineHeight: 1.15,
      maxWidth: '94%',
    },
    bottomLabel: {
      marginTop: '8px',
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color: '#7a5827',
      fontWeight: 700,
    },
  },
  {
    label: 'Newspaper File',
    bottom: 'Track History',
    symbol: 'NEWS',
    showInitials: false,
    wrap: {
      background:
        'repeating-linear-gradient(0deg, #f5ead3 0px, #f5ead3 8px, #ead9b9 9px, #ead9b9 10px)',
      border: '1px solid #b29364',
    },
    topLabel: {
      fontSize: '12px',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      fontWeight: 800,
      color: '#7a5827',
      marginBottom: '10px',
    },
    center: {
      fontSize: '20px',
      fontWeight: 900,
      letterSpacing: '1px',
      color: '#3d2b16',
      borderTop: '2px solid #3d2b16',
      borderBottom: '2px solid #3d2b16',
      padding: '5px 10px',
      marginBottom: '12px',
    },
    name: {
      fontSize: '18px',
      fontWeight: 800,
      lineHeight: 1.15,
      maxWidth: '94%',
    },
    bottomLabel: {
      marginTop: '8px',
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color: '#7a5827',
      fontWeight: 700,
    },
  },
] satisfies {
  label: string
  bottom: string
  symbol: string
  showInitials: boolean
  wrap: CSSProperties
  topLabel: CSSProperties
  center: CSSProperties
  name: CSSProperties
  bottomLabel: CSSProperties
}[]