'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'

type Props = {
  src: string
  alt: string
  className?: string
  style?: CSSProperties
  loading?: 'lazy' | 'eager'
}

/** Avoid showing the browser's broken-image icon for archived metadata
 * whose original file has not yet been recovered. The record/link stays visible.
 */
export default function PhotoPreviewImage({ src, alt, className, style, loading = 'lazy' }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <div
        className={className}
        role="img"
        aria-label={`Photo currently unavailable: ${alt}`}
        style={{
          width: '100%',
          minHeight: 160,
          aspectRatio: '4 / 3',
          display: 'grid',
          placeItems: 'center',
          padding: 16,
          boxSizing: 'border-box',
          textAlign: 'center',
          color: '#9ba5aa',
          background: '#151a1d',
          border: '1px solid #343a3e',
          fontSize: 12,
          ...style,
        }}
      >
        Image not yet available
      </div>
    )
  }

  return <img className={className} src={src} alt={alt} loading={loading} style={style} onError={() => setFailedSrc(src)} />
}
