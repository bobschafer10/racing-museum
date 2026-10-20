import type { ReactNode } from 'react'
import DriverProfileGalleryEnhancer from './DriverProfileGalleryEnhancer'
import DriverReportUtility from './DriverReportUtility'

const galleryStyles = `
#photos:has([class*="photoGrid"] > article:nth-child(31)):not([data-gallery-expanded="true"]) [class*="photoGrid"] > article:nth-child(n+25) {
  display: none;
}

.driver-report-utility {
  border-bottom: 1px solid rgba(198, 161, 91, 0.26);
  background: #0b0d0f;
}

.driver-report-utility-inner {
  width: min(1380px, calc(100% - 40px));
  min-height: 44px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.driver-report-utility-inner span {
  color: #9ea4a7;
  font-size: 0.61rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.driver-report-utility-inner a {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  border: 1px solid rgba(198, 161, 91, 0.54);
  background: #6d171d;
  color: #fff;
  text-decoration: none;
  font-size: 0.61rem;
  font-weight: 950;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.driver-report-utility-inner a:hover {
  background: #8f1c24;
  border-color: #c6a15b;
}

.driver-feature-report-action {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 15px;
  border: 1px solid rgba(198, 161, 91, 0.68);
  background: rgba(75, 55, 27, 0.82);
  color: #f3dfb4;
  text-decoration: none;
  font-size: 0.66rem;
  font-weight: 950;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.driver-feature-report-action:hover {
  border-color: #d8b66f;
  background: rgba(106, 75, 30, 0.96);
  color: #fff;
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
  .driver-report-utility-inner {
    width: min(1380px, calc(100% - 24px));
    min-height: 50px;
    justify-content: space-between;
  }

  .driver-report-utility-inner span {
    font-size: 0.56rem;
  }

  .driver-report-utility-inner a {
    font-size: 0.56rem;
  }

  .driver-feature-report-action {
    width: 100%;
  }

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

@media print {
  .driver-report-utility,
  .driver-feature-report-action {
    display: none !important;
  }
}
`

export default function DriverProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{galleryStyles}</style>
      <DriverReportUtility />
      {children}
      <DriverProfileGalleryEnhancer />
    </>
  )
}
