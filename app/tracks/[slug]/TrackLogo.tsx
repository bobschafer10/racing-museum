'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TrackLogo({
  slug,
  trackName,
  logoUrl,
}: {
  slug: string
  trackName: string
  logoUrl?: string | null
}) {
  const pathname = usePathname()
  const [landingPhotoUrl, setLandingPhotoUrl] = useState<string | null>(null)
  const [databaseLogoUrl, setDatabaseLogoUrl] = useState<string | null>(logoUrl || null)
  const [logoCandidateIndex, setLogoCandidateIndex] = useState(0)

  useEffect(() => {
    setLogoCandidateIndex(0)
    setDatabaseLogoUrl(logoUrl || null)
  }, [slug, logoUrl])

  useEffect(() => {
    if (logoUrl) return

    let cancelled = false

    async function loadDatabaseLogo() {
      const { data } = await supabase
        .from('track_landing_directory_view')
        .select('logo_url')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelled) return
      setDatabaseLogoUrl(data?.logo_url || null)
    }

    void loadDatabaseLogo()

    return () => {
      cancelled = true
    }
  }, [slug, logoUrl])

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

  const encodedSlug = encodeURIComponent(slug)
  // Sauk Centre's former I-94 Raceway is not the current I-94 Speedway in
  // Fergus Falls. Old static files for both Sauk Centre slugs incorrectly
  // contain Fergus Falls logos, so only use an explicitly assigned database
  // logo for these two historical track records.
  const saukCentreI94 =
    slug === 'i-94-speedway-mn' || slug === 'i94-speedway-mn'
  const logoCandidates = [
    ...(databaseLogoUrl ? [databaseLogoUrl] : []),
    ...(!saukCentreI94
      ? [
          `/logos/tracks/${encodedSlug}.jpg?v=4`,
          `/logos/tracks/${encodedSlug}.png?v=4`,
          `/logos/tracks/${encodedSlug}.jpeg?v=4`,
          `/logos/tracks/${encodedSlug}.webp?v=4`,
          `/logos/tracks/${encodedSlug}.svg?v=4`,
          `/api/track-logo/${encodedSlug}?v=4`,
        ]
      : []),
  ]

  const showLandingPhoto = pathname === '/tracks' && Boolean(landingPhotoUrl)
  const imageSrc =
    showLandingPhoto && landingPhotoUrl
      ? landingPhotoUrl
      : logoCandidates[Math.min(logoCandidateIndex, logoCandidates.length - 1)] || null

  return (
    <div style={showLandingPhoto ? photoWrap : logoWrap}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={showLandingPhoto ? `Racing at ${trackName}` : `${trackName} logo`}
          style={showLandingPhoto ? photoImage : logoImage}
          onError={(e) => {
            if (showLandingPhoto) {
              setLandingPhotoUrl(null)
              return
            }

            if (logoCandidateIndex < logoCandidates.length - 1) {
              setLogoCandidateIndex((current) => current + 1)
              return
            }

            const target = e.currentTarget
            target.style.display = 'none'
            const fallbackEl = target.nextElementSibling as HTMLElement | null
            if (fallbackEl) fallbackEl.style.display = 'flex'
          }}
        />
      ) : null}
      <div style={imageSrc ? fallbackStyle : { ...fallbackStyle, display: 'flex' }}>
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
