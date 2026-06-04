'use client'

import type { CSSProperties } from 'react'

export default function SeriesLogo({
  slug,
  seriesName,
}: {
  slug: string
  seriesName: string
}) {
  const jpgPath = `/logos/series/${slug}.jpg`
  const pngPath = `/logos/series/${slug}.png`

  const fallbackIndex = hashSlug(slug) % fallbackDesigns.length
  const fallback = fallbackDesigns[fallbackIndex]
  const initials = getInitials(seriesName)

  return (
    <div style={logoWrap}>
      <img
        src={jpgPath}
        alt={`${seriesName} logo`}
        style={logoStyle}
        onError={(e) => {
          const target = e.currentTarget

          if (!target.src.includes('.png')) {
            target.src = pngPath
          } else {
            target.style.display = 'none'
            const fallbackEl = target.nextElementSibling as HTMLElement | null
            if (fallbackEl) fallbackEl.style.display = 'flex'
          }
        }}
      />

      <div
        style={{
          ...fallbackBase,
          ...fallback.wrap,
          display: 'none',
        }}
      >
        <div style={fallback.topLabel}>{fallback.label}</div>

        <div style={fallback.center}>
          {fallback.showInitials ? initials : fallback.symbol}
        </div>

        <div style={fallback.name}>{seriesName}</div>

        <div style={fallback.bottomLabel}>{fallback.bottom}</div>
      </div>
    </div>
  )
}

function hashSlug(slug: string) {
  return slug.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function getInitials(seriesName: string) {
  return (
    seriesName
      .replace(
        /series|association|tour|touring|club|league|racing|stock|auto|midwest|wisconsin|challenge|championship|modified|late|model|sprint/gi,
        ''
      )
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((word) => word[0]?.toUpperCase())
      .join('') || 'SER'
  )
}

const logoWrap: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const logoStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
}

const fallbackBase: CSSProperties = {
  width: '100%',
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '14px',
  color: '#4a3218',
  overflow: 'hidden',
}

const labelStyle: CSSProperties = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  fontWeight: 800,
  color: '#7a5827',
  marginBottom: '10px',
}

const nameStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 800,
  lineHeight: 1.15,
}

const bottomLabel: CSSProperties = {
  marginTop: '8px',
  fontSize: '10px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  fontWeight: 700,
}

const circleStyle: CSSProperties = {
  width: '72px',
  height: '72px',
  borderRadius: '999px',
  border: '3px solid #7a5827',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#efe1c7',
  color: '#3d2b16',
  fontSize: '24px',
  fontWeight: 900,
  marginBottom: '12px',
}

const ticketStyle: CSSProperties = {
  padding: '8px 12px',
  border: '2px dashed #8b642e',
  fontSize: '13px',
  fontWeight: 900,
  letterSpacing: '1px',
  color: '#5b3a1b',
  marginBottom: '12px',
}

const programStyle: CSSProperties = {
  fontSize: '30px',
  fontWeight: 900,
  color: '#7b1e17',
  borderTop: '3px solid #7b1e17',
  borderBottom: '3px solid #7b1e17',
  padding: '5px 12px',
  marginBottom: '12px',
}

const ovalStyle: CSSProperties = {
  minWidth: '92px',
  minHeight: '56px',
  borderRadius: '50%',
  border: '4px solid #3d2b16',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  fontWeight: 900,
  background: '#efe1c7',
  color: '#3d2b16',
  marginBottom: '12px',
  padding: '0 12px',
}

const newsStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 900,
  letterSpacing: '1px',
  color: '#3d2b16',
  borderTop: '2px solid #3d2b16',
  borderBottom: '2px solid #3d2b16',
  padding: '5px 10px',
  marginBottom: '12px',
}

const fallbackDesigns = [
  {
    label: 'Archive Series',
    bottom: 'Museum Record',
    symbol: '🏁',
    showInitials: true,
    wrap: {
      background: 'linear-gradient(135deg, #f4ead3 0%, #ddc8a2 100%)',
      border: '8px solid rgba(122,88,39,0.14)',
    },
    topLabel: labelStyle,
    center: circleStyle,
    name: nameStyle,
    bottomLabel,
  },
  {
    label: 'Touring Series',
    bottom: 'Historic Tour',
    symbol: 'TOUR',
    showInitials: false,
    wrap: {
      background: 'linear-gradient(to bottom, #f7edd8 0%, #e0c89d 100%)',
      borderTop: '6px double #7a5827',
      borderBottom: '6px double #7a5827',
    },
    topLabel: labelStyle,
    center: ticketStyle,
    name: nameStyle,
    bottomLabel,
  },
  {
    label: 'Race Program',
    bottom: 'Archive Collection',
    symbol: 'PROGRAM',
    showInitials: true,
    wrap: {
      background: 'linear-gradient(160deg, #efe1c7 0%, #f8efd9 48%, #d7bd8c 100%)',
      border: '1px solid #b29364',
    },
    topLabel: labelStyle,
    center: programStyle,
    name: nameStyle,
    bottomLabel,
  },
  {
    label: 'Sanctioning Body',
    bottom: 'Series Archive',
    symbol: 'OVAL',
    showInitials: true,
    wrap: {
      background: 'radial-gradient(circle at center, #f7edd8 0%, #d7bd8c 100%)',
      border: '1px solid #b29364',
    },
    topLabel: labelStyle,
    center: ovalStyle,
    name: nameStyle,
    bottomLabel,
  },
  {
    label: 'Newspaper File',
    bottom: 'Historic Coverage',
    symbol: 'NEWS',
    showInitials: false,
    wrap: {
      background:
        'repeating-linear-gradient(0deg, #f5ead3 0px, #f5ead3 8px, #ead9b9 9px, #ead9b9 10px)',
      border: '1px solid #b29364',
    },
    topLabel: labelStyle,
    center: newsStyle,
    name: nameStyle,
    bottomLabel,
  },
]