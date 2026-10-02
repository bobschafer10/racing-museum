import type { ReactNode } from 'react'

const WEHRS_WATERMARK =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/newspapers/checkered-flag-racing-news/1979-10-10/001.jpg'

export default function OktoberfestLarryWehrsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          zIndex: 1,
          top: 0,
          right: 'clamp(8px, 3vw, 58px)',
          width: 'min(660px, 48vw)',
          height: 610,
          pointerEvents: 'none',
          backgroundImage: `url("${WEHRS_WATERMARK}")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '260% auto',
          backgroundPosition: '12% 39%',
          opacity: 0.22,
          filter: 'grayscale(1) sepia(.55) contrast(1.1) brightness(1.15)',
          mixBlendMode: 'screen',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, #000 28%, rgba(0,0,0,.72) 52%, transparent 80%)',
          maskImage:
            'radial-gradient(ellipse at center, #000 28%, rgba(0,0,0,.72) 52%, transparent 80%)',
        }}
      />
    </div>
  )
}
