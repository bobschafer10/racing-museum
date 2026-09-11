'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TrackLogo({
  slug,
  trackName,
}: {
  slug: string
  trackName: string
}) {
  const pathname = usePathname()
  const [landingPhotoUrl, setLandingPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (pathname !== '/tracks') {
      setLandingPhotoUrl(null)
      return
    }

    let cancelled = false

    async function loadLandingCardPhoto() {
      const { data } = await supabase
        .from('track_hero_photo_variants_view')
        .select('image_url')
        .eq('slug', slug)
        .eq('photo_rank', 1)
        .limit(1)

      if (cancelled) return
      setLandingPhotoUrl(data?.[0]?.image_url || null)
    }

    void loadLandingCardPhoto()

    return () => {
      cancelled = true
    }
  }, [pathname, slug])

  useEffect(() => {
    let preferredRank = 1

    if (pathname.includes('/feature-winners')) preferredRank = 4
    else if (pathname.includes('/champions')) preferredRank = 3
    else if (pathname.includes('/results')) preferredRank = 2
    else return

    let cancelled = false

    async function syncHeroImage() {
      const { data } = await supabase
        .from('track_hero_photo_variants_view')
        .select('photo_rank,image_url')
        .eq('slug', slug)
        .lte('photo_rank', preferredRank)
        .order('photo_rank', { ascending: false })
        .limit(1)

      if (cancelled || !data?.[0]?.image_url) return

      const heroImage = Array.from(document.querySelectorAll<HTMLImageElement>('img')).find(
        (image) => image.alt === `Racing at ${trackName}`,
      )

      if (heroImage && heroImage.src !== data[0].image_url) {
        heroImage.src = data[0].image_url
      }
    }

    void syncHeroImage()

    return () => {
      cancelled = true
    }
  }, [pathname, slug, trackName])

  // Version parameter prevents browsers/CDNs from reusing a placeholder
  // that was cached before a newly added logo existed.
  const logoPath = `/api/track-logo/${encodeURIComponent(slug)}?v=2`
  const showLandingPhoto = pathname === '/tracks' && Boolean(landingPhotoUrl)
  const imageSrc = showLandingPhoto && landingPhotoUrl ? landingPhotoUrl : logoPath

  return (
    <div style={showLandingPhoto ? photoWrap : logoWrap}>
      <img
        src={imageSrc}
        alt={showLandingPhoto ? `Racing at ${trackName}` : `${trackName} logo`}
        style={showLandingPhoto ? photoImage : logoImage}
        onError={(e) => {
          if (showLandingPhoto) {
            setLandingPhotoUrl(null)
            return
          }

          const target = e.currentTarget
          target.style.display = 'none'
          const fallbackEl = target.nextElementSibling as HTMLElement | null
          if (fallbackEl) fallbackEl.style.display = 'flex'
        }}
      />
      <div style={fallbackStyle}>
        <div style={fallbackLabel}>Track Logo</div>
        <div style={fallbackName}>{trackName}</div>
      </div>
    </div>
  )
}

const logoWrap: CSSProperties = {
  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#efe7d6', overflow: 'hidden',
}

const photoWrap: CSSProperties = {
  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1012', overflow: 'hidden',
}

const logoImage: CSSProperties = {
  width: '100%', height: '100%', objectFit: 'contain', display: 'block',
}

const photoImage: CSSProperties = {
  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
}

const fallbackStyle: CSSProperties = {
  width: '100%', height: '100%', display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '12px', color: '#4a3218', border: '1px solid #b29364', background: '#f1e5ce',
}

const fallbackLabel: CSSProperties = {
  fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#7a5827', marginBottom: '6px', fontWeight: 700,
}

const fallbackName: CSSProperties = {
  fontSize: '17px', fontWeight: 800, lineHeight: 1.15,
}
