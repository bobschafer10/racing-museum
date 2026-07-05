'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

const STORAGE_KEY = 'umarm-archive-notice-accepted'

export default function ArchiveAcknowledgmentModal() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = window.localStorage.getItem(STORAGE_KEY)
    if (!accepted) setShow(true)
  }, [])

  function enterArchive() {
    window.localStorage.setItem(STORAGE_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={topRow}>
          <div style={seal}>📖</div>

          <div>
            <div style={label}>Historical Research Notice</div>
            <h2 style={title}>Welcome to the Upper Midwest Auto Racing Museum</h2>
            <div style={tagline}>
              A Living Archive of Upper Midwest Auto Racing History
            </div>
          </div>
        </div>

        <p style={lead}>
          Before exploring the museum&apos;s historical records, please understand
          that this archive represents ongoing research, discovery, preservation,
          and verification.
        </p>

        <div style={noticeBox}>
          <div style={noticeHeading}>
            Historical racing records are inherently incomplete.
          </div>

          <p style={noticeText}>
            Race results, championships, point standings, photographs, and other
            historical records presented throughout the museum represent those
            that have been <strong>discovered, researched, and verified</strong>{' '}
            from surviving historical sources.
          </p>
        </div>

        <div style={important}>
          The absence of a race result, driver, event, championship, statistic,
          or photograph should not be interpreted as evidence that it did not
          occur.
        </div>

        <p style={text}>
          Many race programs, newspapers, official records, and photographs have{' '}
          <strong>never been recovered</strong>, while others have unfortunately
          been <strong>lost forever</strong>. The archive continues to grow as
          new historical materials are discovered and verified.
        </p>

        <p style={acknowledgment}>
          By entering the archive, you acknowledge that the museum is an ongoing
          historical research project that continues to grow as new records are
          discovered and verified.
        </p>

        <p style={missionLine}>
          Every race program preserved. Every photograph identified. Every race
          result recovered. Together, we&apos;re preserving the history of Upper
          Midwest auto racing.
        </p>

        <button type="button" onClick={enterArchive} style={button}>
          Enter the Archive
        </button>
      </div>
    </div>
  )
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'rgba(20, 14, 8, 0.76)',
  backdropFilter: 'blur(2px)',
}

const modal: CSSProperties = {
  width: 'min(720px, 100%)',
  maxHeight: '88vh',
  overflowY: 'auto',
  padding: '28px',
  borderRadius: '18px',
  border: '3px solid #8a5a1f',
  background:
    'radial-gradient(circle at top left, rgba(255,255,255,0.72), transparent 38%), linear-gradient(135deg, #fff4d8, #ead3a3)',
  boxShadow: '0 30px 90px rgba(0,0,0,0.5)',
}

const topRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '52px 1fr',
  gap: '16px',
  alignItems: 'start',
  marginBottom: '16px',
}

const seal: CSSProperties = {
  width: '46px',
  height: '46px',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#3a2a1a',
  color: '#fff8e8',
  fontSize: '23px',
  boxShadow: 'inset 0 0 0 2px rgba(255,248,232,0.32)',
}

const label: CSSProperties = {
  display: 'inline-block',
  marginBottom: '8px',
  padding: '5px 12px',
  borderRadius: '999px',
  background: 'rgba(122, 77, 18, 0.16)',
  color: '#5b3510',
  fontSize: '0.72rem',
  fontWeight: 900,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
}

const title: CSSProperties = {
  margin: '0',
  color: '#2b1d0e',
  fontFamily: 'Georgia, serif',
  fontSize: '1.72rem',
  lineHeight: 1.08,
}

const tagline: CSSProperties = {
  marginTop: '8px',
  color: '#6f4e24',
  fontSize: '1.08rem',
  fontWeight: 800,
  fontStyle: 'italic',
}

const lead: CSSProperties = {
  margin: '0 0 14px',
  color: '#332416',
  fontSize: '0.98rem',
  lineHeight: 1.5,
}

const noticeBox: CSSProperties = {
  margin: '14px 0',
  padding: '15px 18px',
  border: '1px solid rgba(122, 77, 18, 0.28)',
  background: 'rgba(255, 248, 232, 0.62)',
}

const noticeHeading: CSSProperties = {
  marginBottom: '7px',
  color: '#2b1d0e',
  fontSize: '1.05rem',
  fontWeight: 900,
}

const noticeText: CSSProperties = {
  margin: 0,
  color: '#332416',
  fontSize: '0.96rem',
  lineHeight: 1.5,
}

const important: CSSProperties = {
  margin: '14px 0',
  padding: '16px 18px',
  borderLeft: '7px solid #7a260f',
  background: 'rgba(255, 250, 238, 0.9)',
  color: '#24170c',
  fontSize: '1.05rem',
  lineHeight: 1.45,
  fontWeight: 900,
}

const text: CSSProperties = {
  margin: '0 0 12px',
  color: '#332416',
  fontSize: '0.96rem',
  lineHeight: 1.5,
}

const acknowledgment: CSSProperties = {
  margin: '0 0 12px',
  color: '#3f3325',
  fontSize: '0.9rem',
  lineHeight: 1.45,
  fontWeight: 700,
}

const missionLine: CSSProperties = {
  margin: '0 0 14px',
  color: '#6f4e24',
  fontSize: '0.86rem',
  lineHeight: 1.4,
  fontStyle: 'italic',
  fontWeight: 700,
}

const button: CSSProperties = {
  width: '100%',
  marginTop: '6px',
  padding: '16px 22px',
  border: '2px solid #2b1d0e',
  borderRadius: '10px',
  background: '#3a2a1a',
  color: '#fff8e8',
  fontSize: '1.08rem',
  fontWeight: 900,
  cursor: 'pointer',
  letterSpacing: '0.02em',
}