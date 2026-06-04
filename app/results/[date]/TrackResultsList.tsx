'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { CSSProperties } from 'react'

type RaceRow = {
  track_name: string
  track_slug?: string | null
  class_name?: string | null
  driver_name?: string | null
  driver_slug?: string | null
}

type Props = {
  tracks: Record<string, RaceRow[]>
}

export default function TrackResultsList({ tracks }: Props) {
  const [openTracks, setOpenTracks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    Object.keys(tracks).forEach((track) => {
      initial[track] = true
    })
    return initial
  })

  function toggleTrack(track: string) {
    setOpenTracks((prev) => ({
      ...prev,
      [track]: !prev[track],
    }))
  }

  const trackNames = Object.keys(tracks)

  return (
    <>
      {trackNames.map((track) => {
        const trackRaces = [...tracks[track]].sort((a, b) =>
          (a.class_name || '').localeCompare(b.class_name || '')
        )

        const firstRace = trackRaces[0]
        const isOpen = openTracks[track]

        return (
          <div key={track} style={trackBlock}>
            <button
              type="button"
              onClick={() => toggleTrack(track)}
              style={trackToggle}
            >
              <span style={trackToggleLeft}>
                <span style={trackArrow}>{isOpen ? '▼' : '▶'}</span>
                {firstRace?.track_slug ? (
                  <Link
                    href={`/tracks/${firstRace.track_slug}`}
                    style={trackLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {track}
                  </Link>
                ) : (
                  <span>{track}</span>
                )}
              </span>

              <span style={trackCount}>{trackRaces.length}</span>
            </button>

            {isOpen && (
              <div>
                {trackRaces.map((r, i) => (
                  <div
                    key={`${track}-${r.class_name}-${r.driver_name}-${i}`}
                    style={resultRow}
                  >
                    <div style={resultClass}>
                      {r.class_name || 'Unknown Class'}
                    </div>

                    <div style={resultWinner}>
                      {r.driver_slug ? (
                        <Link href={`/drivers/${r.driver_slug}`} style={inlineLink}>
                          {r.driver_name}
                        </Link>
                      ) : (
                        r.driver_name || 'Unknown Driver'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

const trackBlock: CSSProperties = {
  marginBottom: '22px',
}

const trackToggle: CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid #b89b6d',
  padding: '0 0 6px 0',
  cursor: 'pointer',
  textAlign: 'left',
  color: '#3d2b16',
  fontFamily: 'Georgia, serif',
  fontSize: '22px',
  fontWeight: 700,
}

const trackToggleLeft: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}

const trackArrow: CSSProperties = {
  fontSize: '14px',
  width: '16px',
}

const trackLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const trackCount: CSSProperties = {
  fontSize: '15px',
  color: '#7a6348',
  fontWeight: 400,
}

const resultRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '8px 0',
  borderBottom: '1px solid #ccb48a',
  marginLeft: '24px',
}

const resultClass: CSSProperties = {
  color: '#6f5733',
  fontSize: '16px',
}

const resultWinner: CSSProperties = {
  fontWeight: 700,
  textAlign: 'right',
}

const inlineLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}