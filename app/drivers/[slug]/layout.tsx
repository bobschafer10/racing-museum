import type { ReactNode } from 'react'
import DriverProfileGalleryEnhancer from './DriverProfileGalleryEnhancer'

const galleryStyles = `
#photos:has([class*="photoGrid"] > article:nth-child(31)):not([data-gallery-expanded="true"]) [class*="photoGrid"] > article:nth-child(n+25) {
  display: none;
}

.driver-photo-gallery-controls {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(233, 220, 194, 0.22);
  background: linear-gradient(135deg, rgba(198, 161, 91, 0.08), transparent 62%), #101417;
}

.driver-photo-gallery-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.driver-photo-gallery-copy strong {
  color: #f4f1ea;
  font-size: 0.76rem;
  font-weight: 950;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.driver-photo-gallery-copy span {
  color: #92989c;
  font-size: 0.66rem;
  line-height: 1.5;
}

.driver-photo-gallery-actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.driver-photo-gallery-actions a,
.driver-photo-gallery-actions button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  font: inherit;
  font-size: 0.61rem;
  font-weight: 950;
  letter-spacing: 0.045em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}

.driver-photo-gallery-actions a {
  background: #bd1721;
  color: #fff;
}

.driver-photo-gallery-actions button {
  background: #14191d;
  color: #e5e1da;
  border-color: rgba(233, 220, 194, 0.24);
}

.driver-photo-gallery-actions a:hover {
  background: #df2630;
}

.driver-photo-gallery-actions button:hover {
  color: #fff;
  border-color: #c6a15b;
}

@media (max-width: 720px) {
  .driver-photo-gallery-controls {
    align-items: flex-start;
    flex-direction: column;
  }

  .driver-photo-gallery-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .driver-photo-gallery-actions a,
  .driver-photo-gallery-actions button {
    width: 100%;
  }
}
`

export default function DriverProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{galleryStyles}</style>
      {children}
      <DriverProfileGalleryEnhancer />
    </>
  )
}
