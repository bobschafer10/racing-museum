import type { ReactNode } from 'react'
import RoomPolish from './RoomPolish'

const WEHRS_WATERMARK =
  'https://szvkleurojiwqkkztxtr.supabase.co/storage/v1/object/public/media/newspapers/checkered-flag-racing-news/1979-10-10/001.jpg'

export default function OktoberfestLarryWehrsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <RoomPolish />

      <style>{`
        main > section:first-child {
          background-image: none !important;
          background-color: #1b120d !important;
        }

        main > section:first-child::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: url("${WEHRS_WATERMARK}");
          background-repeat: no-repeat;
          background-size: 260% auto;
          background-position: 12% 39%;
          opacity: .38;
          filter: grayscale(1) sepia(.45) contrast(1.1) brightness(.82);
          -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,.98) 0%, rgba(0,0,0,.92) 62%, rgba(0,0,0,.48) 82%, transparent 100%);
          mask-image: linear-gradient(90deg, rgba(0,0,0,.98) 0%, rgba(0,0,0,.92) 62%, rgba(0,0,0,.48) 82%, transparent 100%);
        }

        #year-by-year > div[aria-hidden='true'] {
          display: none !important;
        }

        #year-by-year div:has(> a[href^='/drivers/']) {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px !important;
          margin-top: 14px !important;
        }

        #year-by-year a[href^='/results/'],
        #year-by-year a[href^='/drivers/'],
        #year-by-year a[href^='/media/newspapers/'] {
          min-height: 36px;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          padding: 8px 10px !important;
          border: 1px solid #a87d43;
          border-radius: 3px;
          background: linear-gradient(180deg, #fff8e6 0%, #ead5a9 100%);
          box-shadow: 0 2px 0 rgba(91,58,29,.12);
          color: #6f281f !important;
          text-decoration: none !important;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: .055em;
          line-height: 1.15;
          font-size: 8px !important;
          font-weight: 900 !important;
          transition: transform .12s ease, background .12s ease, border-color .12s ease;
        }

        #year-by-year a[href^='/results/']:hover,
        #year-by-year a[href^='/drivers/']:hover,
        #year-by-year a[href^='/media/newspapers/']:hover {
          transform: translateY(-1px);
          border-color: #7c2b22;
          background: #f7e5bc;
        }

        @media (max-width: 720px) {
          #year-by-year div:has(> a[href^='/drivers/']) {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
