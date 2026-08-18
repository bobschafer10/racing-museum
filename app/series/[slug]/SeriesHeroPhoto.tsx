'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

type HeroPhoto = {
  photoId: number | string
  imageUrl: string
  driverName: string
  driverSlug: string
  year?: string | null
  photographer?: string | null
}

export default function SeriesHeroPhoto({ photos }: { photos: HeroPhoto[] }) {
  const pathname = usePathname()
  const [eligiblePhotos, setEligiblePhotos] = useState<HeroPhoto[] | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function filterToSeriesYears() {
      if (!photos.length) {
        if (!cancelled) setEligiblePhotos([])
        return
      }

      const slug = pathname.split('/').filter(Boolean)[1]
      if (!slug) {
        if (!cancelled) setEligiblePhotos([])
        return
      }

      const { data: seriesRow } = await supabase
        .from('Series')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (!seriesRow?.id) {
        if (!cancelled) setEligiblePhotos([])
        return
      }

      const { data: seasonRows } = await supabase
        .from('SeriesSeasons')
        .select('year')
        .eq('series_id', seriesRow.id)

      const validYears = new Set(
        (seasonRows || [])
          .map((row: any) => String(row.year || ''))
          .filter((year: string) => /^\d{4}$/.test(year))
      )

      const filtered = photos.filter((photo) => {
        const photoYear = String(photo.year || '')
        return validYears.has(photoYear)
      })

      if (!cancelled) {
        setEligiblePhotos(filtered)
        setIndex(filtered.length > 1 ? Math.floor(Math.random() * filtered.length) : 0)
      }
    }

    filterToSeriesYears()

    return () => {
      cancelled = true
    }
  }, [pathname, photos])

  if (!eligiblePhotos || !eligiblePhotos.length) return null

  const photo = eligiblePhotos[index] || eligiblePhotos[0]
  const yearText = photo.year ? ` • ${photo.year}` : ''
  const photographerText =
    photo.photographer && photo.photographer !== 'unknown-photographer'
      ? ` • Photo: ${humanize(photo.photographer)}`
      : ''

  return (
    <Link href={`/drivers/${photo.driverSlug}`} style={photoLink} className="series-hero-photo">
      <div style={photoFrame}>
        <img src={photo.imageUrl} alt={photo.driverName} style={photoImage} />
        <div style={caption}>
          <strong>{photo.driverName}</strong>{yearText}{photographerText}
        </div>
      </div>
    </Link>
  )
}

function humanize(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const photoLink: CSSProperties = {
  display: 'block',
  color: '#3d2b16',
  textDecoration: 'none',
  minWidth: 0,
}

const photoFrame: CSSProperties = {
  background: '#f4ead7',
  border: '2px solid #b29364',
  padding: '8px',
  boxShadow: '0 8px 22px rgba(60, 40, 20, 0.13)',
}

const photoImage: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '220px',
  objectFit: 'cover',
  objectPosition: 'center',
  background: '#e5d5b7',
  border: '1px solid #c2a97d',
}

const caption: CSSProperties = {
  padding: '8px 4px 2px',
  fontSize: '13px',
  lineHeight: 1.35,
  color: '#5a3a1b',
  textAlign: 'center',
}
