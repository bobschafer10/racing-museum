import Link from 'next/link'
import type { CSSProperties } from 'react'

export default function HistoricalArchiveNotice() {
  return (
    <section style={noticeWrap}>
      <div style={noticeLabel}>Museum Archive Notice</div>

      <h2 style={noticeTitle}>A Living Archive of Upper Midwest Auto Racing History</h2>

      <p style={noticeText}>
        The Upper Midwest Auto Racing Museum is a living archive dedicated to
        preserving the history of auto racing across the Upper Midwest.
      </p>

      <p style={noticeText}>
        Historical racing records are inherently incomplete. The information
        presented throughout the museum reflects only those race results,
        championships, point standings, photographs, and other historical
        records that have been discovered, researched, and verified from
        surviving sources.
      </p>

      <p style={noticeText}>
        The absence of a race result, driver, event, championship, statistic, or
        photograph should not be interpreted as evidence that it did not occur.
        Many historical records remain undiscovered, while others have
        unfortunately been lost over time.
      </p>

      <p style={noticeText}>
        <strong>Have something to add?</strong> If you have race results,
        photographs, race programs, newspapers, yearbooks, point standings,
        championship records, or corrections, please{' '}
        <Link href="/contact" style={noticeLink}>
          contact the museum
        </Link>
        . Every contribution helps preserve another piece of Upper Midwest auto
        racing history.
      </p>
    </section>
  )
}

const noticeWrap: CSSProperties = {
  margin: '32px 0',
  padding: '22px 24px',
  borderRadius: '16px',
  border: '1px solid rgba(120, 86, 43, 0.35)',
  background:
    'linear-gradient(135deg, rgba(255,248,232,0.96), rgba(246,236,210,0.96))',
  boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
}

const noticeLabel: CSSProperties = {
  display: 'inline-block',
  marginBottom: '8px',
  padding: '4px 10px',
  borderRadius: '999px',
  background: 'rgba(120, 86, 43, 0.12)',
  color: '#6f4e24',
  fontSize: '0.72rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const noticeTitle: CSSProperties = {
  margin: '0 0 12px',
  color: '#2b1d0e',
  fontSize: '1.35rem',
  lineHeight: 1.2,
}

const noticeText: CSSProperties = {
  margin: '0 0 12px',
  color: '#3f3325',
  fontSize: '0.96rem',
  lineHeight: 1.65,
}

const noticeLink: CSSProperties = {
  color: '#7a4d12',
  fontWeight: 800,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
}