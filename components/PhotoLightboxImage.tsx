'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

type Props = {
  src: string
  alt: string
  caption?: string | null
  imageStyle?: CSSProperties
  buttonStyle?: CSSProperties
  showZoomBadge?: boolean
}

export default function PhotoLightboxImage({
  src,
  alt,
  caption,
  imageStyle,
  buttonStyle,
  showZoomBadge = true,
}: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open larger image: ${alt}`}
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'zoom-in',
          ...buttonStyle,
        }}
      >
        <img src={src} alt={alt} style={imageStyle} />
        {showZoomBadge && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: '7px',
              bottom: '7px',
              width: '27px',
              height: '27px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(70, 43, 17, 0.88)',
              color: '#fff7e7',
              border: '1px solid rgba(255,255,255,0.65)',
              fontSize: '16px',
              lineHeight: 1,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}
          >
            ⌕
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(24, 17, 10, 0.94)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '22px',
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close image"
            style={{
              position: 'fixed',
              top: '16px',
              right: '18px',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.55)',
              background: 'rgba(76, 49, 20, 0.92)',
              color: '#fff7e7',
              fontSize: '27px',
              cursor: 'pointer',
              zIndex: 10000,
            }}
          >
            ×
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: 'min(1200px, 96vw)',
              maxHeight: '94vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '100%',
                maxHeight: caption ? '82vh' : '90vh',
                objectFit: 'contain',
                border: '2px solid #d2b57f',
                boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
                background: '#eadfc7',
              }}
            />
            {caption && (
              <div
                style={{
                  color: '#f4e6cd',
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  textAlign: 'center',
                  maxWidth: '900px',
                }}
              >
                {caption}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
