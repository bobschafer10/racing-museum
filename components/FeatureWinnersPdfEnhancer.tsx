'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function FeatureWinnersPdfEnhancer() {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const findTarget = () => {
      if (window.location.pathname !== '/stats/feature-winners') {
        setTarget(null)
        return
      }

      const board = document.querySelector('.feature-winners-board')
      const heading = board?.querySelector('h2')
      const header = heading?.parentElement?.parentElement
      setTarget(header instanceof HTMLElement ? header : null)
    }

    findTarget()

    const observer = new MutationObserver(findTarget)
    observer.observe(document.body, { childList: true, subtree: true })

    window.addEventListener('popstate', findTarget)

    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', findTarget)
    }
  }, [])

  if (!target) return null

  const downloadPdf = () => {
    const query = window.location.search || ''
    window.location.assign(`/api/feature-winners-pdf${query}`)
  }

  return createPortal(
    <button
      type="button"
      onClick={downloadPdf}
      title="Download the current feature-winner report as a letter-size PDF with a filter summary"
      aria-label="Download feature winners PDF report"
      style={buttonStyle}
    >
      <span style={pdfMarkStyle}>PDF</span>
      <span>Download PDF</span>
    </button>,
    target,
  )
}

const buttonStyle: React.CSSProperties = {
  order: 10,
  marginLeft: 'auto',
  alignSelf: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '9px',
  minHeight: '42px',
  padding: '10px 15px',
  border: '1px solid #3f1b0f',
  background: '#6d241c',
  color: '#fff8e8',
  fontSize: '13px',
  fontWeight: 900,
  letterSpacing: '.02em',
  cursor: 'pointer',
  boxShadow: '2px 2px 0 rgba(58,42,26,.28)',
  whiteSpace: 'nowrap',
}

const pdfMarkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '30px',
  height: '22px',
  padding: '0 5px',
  border: '1px solid rgba(255,248,232,.72)',
  background: 'rgba(255,248,232,.08)',
  fontSize: '9px',
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: '.08em',
}
