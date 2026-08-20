import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'

const MIN_YEAR = 1980
const MAX_YEAR = 2026
const mrnYears = new Set([1981, 1982, 1983, 1987, 1999])

export default async function SlingerNationalsYearPage({
  params,
}: {
  params: Promise<{ year: string }>
}) {
  const { year } = await params
  const seasonYear = Number(year)

  if (!Number.isInteger(seasonYear) || seasonYear < MIN_YEAR || seasonYear > MAX_YEAR) {
    notFound()
  }

  const seriesEra = seasonYear < 2000
  const raceCount =
    seasonYear === 1980 ? 3 :
    seasonYear === 1981 || seasonYear === 1982 ? 4 :
    seasonYear >= 1983 && seasonYear <= 1998 ? 3 :
    seasonYear === 1999 ? 2 : 1

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div style={breadcrumbRow}>
            <Link href="/" style={breadcrumbLink}>Home</Link>
            <span>/</span>
            <Link href="/events" style={breadcrumbLink}>Special Events</Link>
            <span>/</span>
            <Link href="/events/slinger-nationals" style={breadcrumbLink}>Slinger Nationals</Link>
            <span>/</span>
            <span>{seasonYear}</span>
          </div>

          <div style={eyebrow}>Slinger Nationals Archive</div>
          <h1 style={pageTitle}>{seasonYear} Slinger Nationals</h1>
          <p style={heroTagline}>
            {seriesEra
              ? `${raceCount}-race Slinger Nationals series season.`
              : 'Annual Slinger Nationals special event.'}
          </p>

          <div style={statRow}>
            <Stat label="Archive Era" value={seriesEra ? 'Series' : 'Annual'} />
            <Stat label="Race Events" value={String(raceCount)} />
            <Stat label="Points Source" value={mrnYears.has(seasonYear) ? 'MRN + TTT' : 'The Third Turn'} />
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <Panel title="Race Results">
          <p style={panelText}>
            The audited race inventory for this year has been preserved. Full feature finishes, DNQs where listed,
            and race-level details will populate here when the Special Events import is connected to the Museum database.
          </p>
          <div style={statusBox}>Database connection pending — source archive complete.</div>
        </Panel>

        <Panel title="Point Standings">
          {mrnYears.has(seasonYear) ? (
            <p style={panelText}>
              Midwest Racing News provides supplemental final Slinger Nationals point standings for {seasonYear}.
              Those published totals will be retained with source attribution rather than reconstructed.
            </p>
          ) : (
            <p style={panelText}>
              Available point standings will be shown exactly as preserved by the historical source. Missing point totals
              will remain blank rather than estimated.
            </p>
          )}
        </Panel>

        <Panel title="Source Attribution">
          <p style={panelText}>
            Primary race-results source: The Third Turn. Supplemental final standings source where identified:
            Midwest Racing News.
          </p>
        </Panel>

        <Link href="/events/slinger-nationals" style={backButton}>← Back to Slinger Nationals</Link>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={panel}>
      <div style={panelHeader}>{title}</div>
      <div style={panelBody}>{children}</div>
    </div>
  )
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const heroSection: CSSProperties = { background: 'linear-gradient(to bottom,#e7d9bf,#eadfc7)', borderBottom: '2px solid #b29364' }
const heroInner: CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 34px' }
const breadcrumbRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '14px', color: '#6b4a22', marginBottom: '20px' }
const breadcrumbLink: CSSProperties = { color: '#7a5827', textDecoration: 'none', fontWeight: 700 }
const eyebrow: CSSProperties = { fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const pageTitle: CSSProperties = { fontSize: '52px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }
const heroTagline: CSSProperties = { fontSize: '22px', fontStyle: 'italic', color: '#6f4d24', margin: 0 }
const statRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '12px', marginTop: '22px', maxWidth: '760px' }
const statCard: CSSProperties = { background: '#f1e5ce', border: '1px solid #b89b6d', padding: '14px' }
const statLabel: CSSProperties = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#7a5827' }
const statValue: CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#3d2b16', marginTop: '4px' }
const contentWrap: CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 44px', display: 'grid', gap: '18px' }
const panel: CSSProperties = { background: '#ddc8a2', border: '2px solid #b29364', padding: '10px' }
const panelHeader: CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#5b3a1b', marginBottom: '8px' }
const panelBody: CSSProperties = { background: '#f1e5ce', border: '1px solid #c2a97d', padding: '14px' }
const panelText: CSSProperties = { fontSize: '16px', lineHeight: 1.65, margin: 0 }
const statusBox: CSSProperties = { marginTop: '12px', padding: '10px 12px', background: '#eadfc7', border: '1px solid #b89b6d', fontWeight: 700, color: '#6b4a22' }
const backButton: CSSProperties = { display: 'inline-block', justifySelf: 'start', background: '#7a5827', color: '#fff8ea', padding: '10px 14px', border: '1px solid #5d3f17', textDecoration: 'none', fontWeight: 700 }
