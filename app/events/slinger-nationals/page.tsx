import Link from 'next/link'
import type { CSSProperties } from 'react'

export const dynamic = 'force-dynamic'

const mrnYears = [1981, 1982, 1983, 1987, 1999]

const eras = [
  { label: '1980', value: '3 races', note: 'Opening season of the Slinger Nationals series format.' },
  { label: '1981–1982', value: '4 races/year', note: 'Multi-race Nationals series seasons.' },
  { label: '1983–1998', value: 'Generally 3/year', note: 'Historic series-era structure.' },
  { label: '1999', value: '2 races', note: 'Final multi-race Nationals season.' },
  { label: '2000–2026', value: '1 race/year', note: 'Modern annual Slinger Nationals event.' },
]

export default function SlingerNationalsPage() {
  return (
    <main style={pageStyle}>
      <section style={hero}>
        <div style={watermark}>SLINGER</div>
        <div style={heroInner}>
          <Link href="/events" style={backLink}>← Special Events</Link>
          <div style={eyebrow}>Special Event Archive</div>
          <h1 style={title}>Slinger Nationals</h1>
          <p style={tagline}>
            From the original multi-race Nationals series to the modern annual classic at Slinger Speedway.
          </p>
          <p style={intro}>
            This archive currently spans 1980 through 2026 and preserves race winners, full feature finishes, DNQs where available, and surviving historical point standings.
          </p>
          <div style={statsGrid}>
            <Stat label="Years Covered" value="47" />
            <Stat label="Race Events" value="88" />
            <Stat label="Result Rows" value="2,185" />
            <Stat label="Race Errors" value="0" />
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={twoCol}>
          <div>
            <h2 style={sectionTitle}>Archive Structure</h2>
            <div style={eraGrid}>
              {eras.map((era) => (
                <div key={era.label} style={eraCard}>
                  <div style={eraYear}>{era.label}</div>
                  <div style={eraValue}>{era.value}</div>
                  <div style={eraNote}>{era.note}</div>
                </div>
              ))}
            </div>
          </div>

          <aside style={sourceCard}>
            <div style={sourceLabel}>Historical Sources</div>
            <h2 style={sourceTitle}>Point Standings</h2>
            <p style={sourceText}>
              The Third Turn is the primary race-results source. Surviving Slinger Nationals point standings are supplemented by Midwest Racing News where that publication preserved clearer final totals.
            </p>
            <div style={sourceSubhead}>Midwest Racing News supplements</div>
            <div style={yearPills}>
              {mrnYears.map((year) => <span key={year} style={pill}>{year}</span>)}
            </div>
            <p style={sourceFoot}>
              Missing point totals are left blank rather than reconstructed. Weekly Slinger Speedway track points are not treated as Slinger Nationals standings.
            </p>
          </aside>
        </div>

        <section style={statusSection}>
          <div style={statusHeader}>Current Archive Status</div>
          <div style={statusGrid}>
            <Status title="Race inventory" value="Complete through 2026" />
            <Status title="Feature results" value="2,185 cleaned rows" />
            <Status title="DNQs" value="Preserved where listed" />
            <Status title="Source conflicts" value="Reviewed and cleaned" />
            <Status title="Point standings" value="Partial by surviving source" />
            <Status title="Museum database" value="Import pending" />
          </div>
        </section>

        <section style={yearSection}>
          <div style={sectionTitle}>Year-by-Year Archive</div>
          <p style={yearIntro}>
            Individual race pages will become active as the audited Slinger Nationals archive is connected to the Museum database. The historical inventory itself is complete from 1980 through 2026.
          </p>
          <div style={yearGrid}>
            {Array.from({ length: 47 }, (_, i) => 2026 - i).map((year) => (
              <div key={year} style={yearCard}>
                <div style={yearNumber}>{year}</div>
                <div style={yearStatus}>{year < 2000 ? 'Series era' : 'Annual event'}</div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={statCard}><div style={statLabel}>{label}</div><div style={statValue}>{value}</div></div>
}

function Status({ title, value }: { title: string; value: string }) {
  return <div style={statusCard}><div style={statusTitle}>{title}</div><div style={statusValue}>{value}</div></div>
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const hero: CSSProperties = { position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at 78% 18%, rgba(122,88,39,.16), transparent 30%), linear-gradient(to bottom,#e7d9bf,#eadfc7)', borderBottom: '2px solid #b29364' }
const watermark: CSSProperties = { position: 'absolute', right: '-35px', top: '-20px', fontSize: '185px', fontWeight: 700, color: 'rgba(90,62,29,.045)', lineHeight: 1 }
const heroInner: CSSProperties = { position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '30px 20px 42px' }
const backLink: CSSProperties = { color: '#6a4a1f', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: '22px' }
const eyebrow: CSSProperties = { fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const title: CSSProperties = { margin: '0 0 10px', fontSize: '58px', color: '#3d2b16', lineHeight: 1.03 }
const tagline: CSSProperties = { margin: '0 0 16px', fontSize: '24px', lineHeight: 1.4, fontStyle: 'italic', color: '#6f4d24', maxWidth: '880px' }
const intro: CSSProperties = { margin: 0, fontSize: '18px', lineHeight: 1.65, maxWidth: '900px' }
const statsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '12px', marginTop: '24px', maxWidth: '900px' }
const statCard: CSSProperties = { background: 'rgba(239,225,199,.94)', border: '1px solid #b89b6d', padding: '15px 16px' }
const statLabel: CSSProperties = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const statValue: CSSProperties = { fontSize: '29px', fontWeight: 700, marginTop: '5px', color: '#3d2b16' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '34px 20px 50px' }
const twoCol: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(300px,.75fr)', gap: '26px', alignItems: 'start' }
const sectionTitle: CSSProperties = { fontSize: '26px', margin: '0 0 16px', color: '#3d2b16' }
const eraGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '12px' }
const eraCard: CSSProperties = { border: '1px solid #b29364', background: '#f1e3c8', padding: '15px' }
const eraYear: CSSProperties = { fontSize: '19px', fontWeight: 700, color: '#3d2b16' }
const eraValue: CSSProperties = { fontSize: '14px', fontWeight: 700, color: '#7a5827', margin: '5px 0 7px' }
const eraNote: CSSProperties = { fontSize: '14px', lineHeight: 1.45, color: '#5a4630' }
const sourceCard: CSSProperties = { background: '#ddc8a2', border: '2px solid #b29364', padding: '20px', boxShadow: '0 5px 14px rgba(0,0,0,.08)' }
const sourceLabel: CSSProperties = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const sourceTitle: CSSProperties = { fontSize: '28px', margin: '6px 0 10px', color: '#3d2b16' }
const sourceText: CSSProperties = { fontSize: '15px', lineHeight: 1.55, margin: '0 0 15px' }
const sourceSubhead: CSSProperties = { fontWeight: 700, marginBottom: '9px', color: '#5d3f17' }
const yearPills: CSSProperties = { display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '14px' }
const pill: CSSProperties = { background: '#7a5827', color: '#fff8ea', padding: '5px 9px', fontSize: '13px', fontWeight: 700 }
const sourceFoot: CSSProperties = { fontSize: '13px', lineHeight: 1.45, color: '#5a4630', margin: 0 }
const statusSection: CSSProperties = { marginTop: '34px', borderTop: '2px solid rgba(122,88,39,.28)', paddingTop: '22px' }
const statusHeader: CSSProperties = { fontSize: '21px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b4a22', marginBottom: '14px' }
const statusGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '10px' }
const statusCard: CSSProperties = { background: '#f2e4c8', border: '1px solid #b89b6d', padding: '14px' }
const statusTitle: CSSProperties = { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#7a5827' }
const statusValue: CSSProperties = { fontSize: '17px', fontWeight: 700, marginTop: '5px', color: '#3d2b16' }
const yearSection: CSSProperties = { marginTop: '36px' }
const yearIntro: CSSProperties = { maxWidth: '900px', fontSize: '15px', lineHeight: 1.55, margin: '-6px 0 18px', color: '#5a4630' }
const yearGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(105px,1fr))', gap: '8px' }
const yearCard: CSSProperties = { background: '#f1e3c8', border: '1px solid #b29364', padding: '11px 9px', textAlign: 'center' }
const yearNumber: CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#3d2b16' }
const yearStatus: CSSProperties = { fontSize: '11px', color: '#7a5827', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '.5px' }
