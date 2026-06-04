import Link from 'next/link'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PageProps = {
  params: Promise<{
    date: string
  }>
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function groupByTrack(races: any[]) {
  const grouped: Record<string, any[]> = {}

  races.forEach((r) => {
    const key = r.track_name || 'Unknown Track'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })

  return grouped
}

export default async function ResultsDatePage({ params }: PageProps) {
  const { date } = await params

 const { data: races, error } = await supabase
  .from('global_results_view')
  .select('*')
  .eq('race_date', date)
  .order('track_name', { ascending: true })
  .order('class_name', { ascending: true })

const { data: allDatesData } = await supabase
  .from('global_results_view')
  .select('race_date')
  .order('race_date', { ascending: false })

 const uniqueDates = Array.from(
    new Set((allDatesData || []).map((row: any) => row.race_date))
  )

  const currentIndex = uniqueDates.indexOf(date)

  const previousDate =
    currentIndex < uniqueDates.length - 1
      ? uniqueDates[currentIndex + 1]
      : null

  const nextDate =
    currentIndex > 0
      ? uniqueDates[currentIndex - 1]
      : null

  if (error || !races || races.length === 0) {
    notFound()
  }

  const tracks = groupByTrack(races)
  const trackNames = Object.keys(tracks)
  const featureWinnerCount = races.length

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span style={breadcrumbSep}>/</span>
            <Link href="/results" style={breadcrumbLink}>Results</Link>
            <span style={breadcrumbSep}>/</span>
            <span style={breadcrumbCurrent}>{formatDate(date)}</span>
          </div>

          <div style={eyebrow}>Race Date Archive</div>
          <h1 style={pageTitle}>{formatDate(date)}</h1>

          <p style={pageIntro}>
            Browse all recorded feature winners from this race date, grouped by
            track and organized for quick archive reference.
          </p>

          <div style={summaryBar}>
            <div style={summaryItem}>
              <span style={summaryLabel}>Tracks</span>
              <span style={summaryValue}>{trackNames.length}</span>
            </div>
            <div style={summaryItem}>
              <span style={summaryLabel}>Feature Winners</span>
              <span style={summaryValue}>{featureWinnerCount}</span>
            </div>
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={recordsPanel}>
          <div style={recordsPanelHeader}>
            {formatDate(date)} Results
          </div>

          <div style={recordsPanelBody}>
            {trackNames.map((track) => {
              const trackRaces = [...tracks[track]].sort((a, b) =>
                (a.class_name || '').localeCompare(b.class_name || '')
              )

              const firstRace = trackRaces[0]
              const trackHref = firstRace?.track_slug
                ? `/tracks/${firstRace.track_slug}`
                : undefined

              return (
                <div key={track} style={trackBlock}>
                  <div style={trackHeader}>
                    {trackHref ? (
                      <Link href={trackHref} style={trackLink}>
                        {track}
                      </Link>
                    ) : (
                      track
                    )}
                  </div>

                  {trackRaces.map((r: any, i: number) => (
                    <div
                      key={`${date}-${r.track_slug}-${r.class_name}-${r.driver_name}-${i}`}
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
              )
            })}
          </div>
        </div>

        <div style={dateNav}>
  <div>
    {previousDate ? (
      <Link href={`/results/${previousDate}`} style={dateNavLink}>
        ← Previous Date
      </Link>
    ) : (
      <span style={dateNavDisabled}>← Previous Date</span>
    )}
  </div>

  <div>
    {nextDate ? (
      <Link href={`/results/${nextDate}`} style={dateNavLink}>
        Next Date →
      </Link>
    ) : (
      <span style={dateNavDisabled}>Next Date →</span>
    )}
  </div>
</div>

<div style={backRow}>
  <Link href="/results" style={backButton}>
    Back to Results
  </Link>
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
  margin: 0,
}

const dateNav: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  marginTop: '20px',
  paddingTop: '10px',
  borderTop: '1px solid #c2a97d',
}

const dateNavLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const dateNavDisabled: CSSProperties = {
  color: '#a18c69',
}

const summaryBar: CSSProperties = {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  marginTop: '20px',
}

const summaryItem: CSSProperties = {
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
  padding: '10px 14px',
  minWidth: '140px',
}

const summaryLabel: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#7a6348',
  marginBottom: '4px',
}

const summaryValue: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#3d2b16',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '36px 20px 40px',
  display: 'grid',
  gap: '28px',
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

const trackBlock: CSSProperties = {
  marginBottom: '24px',
}

const trackHeader: CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#3d2b16',
  marginBottom: '8px',
  paddingBottom: '6px',
  borderBottom: '2px solid #b89b6d',
}

const trackLink: CSSProperties = {
  color: '#7a5827',
  textDecoration: 'none',
  fontWeight: 700,
}

const resultRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '8px 0',
  borderBottom: '1px solid #ccb48a',
  marginLeft: '16px',
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

const backRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
}

const backButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '10px 14px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
}