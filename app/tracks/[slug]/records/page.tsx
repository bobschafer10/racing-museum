import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export default async function TrackRecordsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: track } = await supabase
    .from('track_profile_view')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!track) {
    notFound()
  }

  const { data: results } = await supabase
    .from('track_full_results_view')
    .select('*')
    .eq('track_slug', slug)
    .order('race_date', { ascending: false })
    .limit(500)

  const groupedResultsArray = Array.isArray(groupedResults)
  ? groupedResults
  : []

const groupedByDecade = Object.values(
  groupedResultsArray.reduce((acc: any, group: any) => {
      const date = r.race_date

      if (!acc[date]) {
        acc[date] = {
          date,
          races: [],
        }
      }

      acc[date].races.push(r)
      return acc
    }, {})
  )
const groupedByDecade = Object.values(
  (groupedResults || []).reduce((acc: any, group: any) => {
    const year = new Date(group.date).getFullYear()
    const decade = `${Math.floor(year / 10) * 10}s`

    if (!acc[decade]) {
      acc[decade] = {
        decade,
        nights: [],
      }
    }

    acc[decade].nights.push(group)
    return acc
  }, {})
).sort((a: any, b: any) => {
  const aYear = parseInt(a.decade)
  const bYear = parseInt(b.decade)
  return bYear - aYear
})
  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/tracks" style={breadcrumbLink}>Tracks</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href={`/tracks/${track.slug}`} style={breadcrumbLink}>
              {track.track_name}
            </Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>Full Records</span>
          </div>

          <div style={eyebrow}>Track Archive</div>
          <h1 style={pageTitle}>{track.track_name} Full Records</h1>

          <p style={pageIntro}>
            Race-by-race results archive for this venue. Records are grouped by race date
            and will continue to expand as additional historical material is added.
          </p>

          <div style={buttonRow}>
            <Link href={`/tracks/${track.slug}`} style={backButton}>
              Back to Track Profile
            </Link>
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={summaryBar}>
          <div style={summaryItem}>
            <div style={summaryItemLabel}>Track</div>
            <div style={summaryItemValue}>{track.track_name}</div>
          </div>
          <div style={summaryItem}>
            <div style={summaryItemLabel}>Location</div>
            <div style={summaryItemValue}>
              {track.city || 'Unknown city'}
              {track.state ? `, ${track.state}` : ''}
            </div>
          </div>
          <div style={summaryItem}>
            <div style={summaryItemLabel}>Race Nights Shown</div>
            <div style={summaryItemValue}>{groupedResults.length}</div>
          </div>
        </div>

        <div style={recordsPanel}>
<div style={decadeNav}>
    <span style={decadeNavLabel}>Jump to:</span>
    {groupedByDecade.map((d: any) => (
      <a
        key={d.decade}
        href={`#decade-${d.decade}`}
        style={decadeNavLink}
      >
        {d.decade}
      </a>
    ))}
  </div>
          <div style={recordsPanelHeader}>Full Results Archive</div>
          <div style={recordsPanelBody}>
            {groupedByDecade.length > 0 ? (
  groupedByDecade.map((decadeGroup: any) => (
    <div
  key={decadeGroup.decade}
  id={`decade-${decadeGroup.decade}`}
  style={decadeBlock}
>
      <div style={decadeHeader}>{decadeGroup.decade}</div>

      {decadeGroup.nights.map((group: any) => (
        <div key={group.date} style={nightBlock}>
          <div style={nightHeader}>
            {formatDate(group.date)} ({group.races.length} classes)
          </div>

          {group.races.map((r: any, i: number) => (
            <div
              key={`${group.date}-${r.class_name}-${r.driver_name}-${i}`}
              style={resultRow}
            >
              <span style={resultLabel}>{r.class_name}</span>
              <span style={resultValue}>
                {r.driver_slug ? (
                  <Link href={`/drivers/${r.driver_slug}`} style={inlineLink}>
                    {r.driver_name}
                  </Link>
                ) : (
                  r.driver_name
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  ))
) : (
  <p style={panelText}>No full records available yet.</p>
)}
          </div>
        </div>
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  color: '#2f2417',
  minHeight: '100vh',
  fontFamily: 'Georgia, serif',
  margin: 0,
}

const heroSection: CSSProperties = {
  background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const heroInner: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 30px',
}

const breadcrumbRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  fontSize: '15px',
  marginBottom: '22px',
  color: '#6b4a22',
}

const breadcrumbLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
}

const breadcrumbSep: CSSProperties = {
  color: '#8d7049',
}

const breadcrumbCurrent: CSSProperties = {
  color: '#4b351d',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const pageTitle: CSSProperties = {
  fontSize: '48px',
  margin: '0 0 12px',
  color: '#3d2b16',
  lineHeight: 1.05,
}

const pageIntro: CSSProperties = {
  fontSize: '18px',
  lineHeight: 1.7,
  maxWidth: '850px',
  margin: '0 0 20px',
}

const buttonRow: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

const backButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '12px 18px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 40px',
}

const summaryBar: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '18px',
  marginBottom: '24px',
}

const summaryItem: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '16px',
  textAlign: 'center',
}

const summaryItemLabel: CSSProperties = {
  fontSize: '16px',
  marginBottom: '8px',
  color: '#5a3a1b',
}

const summaryItemValue: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#2f2417',
}

const recordsPanel: CSSProperties = {
  background: '#ddc8a2',
  border: '2px solid #b29364',
  padding: '10px',
}

const recordsPanelHeader: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#5b3a1b',
  marginBottom: '10px',
}

const recordsPanelBody: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '16px',
}

const nightBlock: CSSProperties = {
  marginBottom: '24px',
}

const nightHeader: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#3d2b16',
  marginBottom: '8px',
  borderBottom: '2px solid #b89b6d',
  paddingBottom: '6px',
}

const resultRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 0',
  borderBottom: '1px solid #ccb48a',
}

const resultLabel: CSSProperties = {
  color: '#5a3a1b',
}

const resultValue: CSSProperties = {
  fontWeight: 700,
  textAlign: 'right',
}

const inlineLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const panelText: CSSProperties = {
  fontSize: '17px',
  lineHeight: 1.7,
  margin: 0,
}
const decadeBlock: CSSProperties = {
  marginBottom: '30px',
}

const decadeHeader: CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#3d2b16',
  marginBottom: '14px',
  borderBottom: '3px solid #a8844f',
  paddingBottom: '6px',
}
const decadeNav: CSSProperties = {
  marginBottom: '14px',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  alignItems: 'center',
}

const decadeNavLabel: CSSProperties = {
  fontWeight: 700,
  color: '#5a3a1b',
}

const decadeNavLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
  borderBottom: '1px solid #7a5827',
  paddingBottom: '2px',
}