import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SERIES_ID = 93
const FIRST_YEAR = 1973
const LAST_YEAR = 2025

export default async function Silver1000Page() {
  const [{ data: seasons }, { data: events }] = await Promise.all([
    supabase.from('SeriesSeasons').select('year,races').eq('series_id', SERIES_ID).order('year', { ascending: false }),
    supabase.from('SeriesEvents').select('id,race_date,winner_name').eq('series_id', SERIES_ID),
  ])

  const years = seasons ?? []
  const eventCount = events?.length ?? 52

  return (
    <main style={pageStyle}>
      <section style={hero}>
        <div style={watermark}>1000</div>
        <div style={heroInner}>
          <Link href="/events" style={backLink}>← Special Events</Link>
          <div style={eyebrow}>Special Event Archive</div>
          <h1 style={title}>Silver 1000</h1>
          <p style={tagline}>The historic Late Model classic at Proctor Speedway in Proctor, Minnesota.</p>
          <p style={intro}>
            Historical sources sometimes call the venue Halvor Lines Speedway. In the Museum archive, those events are normalized to Proctor Speedway.
          </p>
          <div style={statsGrid}>
            <Stat label="Years" value={`${FIRST_YEAR}–${LAST_YEAR}`} />
            <Stat label="Editions" value="53" />
            <Stat label="Races Held" value={String(eventCount)} />
            <Stat label="2020" value="Cancelled" />
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={statusBox}>
          <strong>Archive status:</strong> winner history and event inventory are connected to the Museum database. Full finishing orders are being expanded from surviving historical sources; incomplete early years are shown only to the depth actually documented.
        </div>

        <h2 style={sectionTitle}>Year-by-Year Archive</h2>
        <div style={yearGrid}>
          {(years.length ? years : Array.from({ length: 53 }, (_, i) => ({ year: LAST_YEAR - i, races: LAST_YEAR - i === 2020 ? 0 : 1 }))).map((row) => (
            <Link key={row.year} href={`/events/silver-1000/${row.year}`} style={yearCard}>
              <div style={yearNumber}>{row.year}</div>
              <div style={yearStatus}>{row.races === 0 ? 'Cancelled' : 'Late Model'}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={statCard}><div style={statLabel}>{label}</div><div style={statValue}>{value}</div></div>
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const hero: CSSProperties = { position: 'relative', overflow: 'hidden', background: 'linear-gradient(to bottom,#e7d9bf,#eadfc7)', borderBottom: '2px solid #b29364' }
const watermark: CSSProperties = { position: 'absolute', right: '-15px', top: '-30px', fontSize: '190px', fontWeight: 700, color: 'rgba(90,62,29,.045)', lineHeight: 1 }
const heroInner: CSSProperties = { position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '30px 20px 42px' }
const backLink: CSSProperties = { color: '#6a4a1f', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: '22px' }
const eyebrow: CSSProperties = { fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const title: CSSProperties = { margin: '0 0 10px', fontSize: '58px', color: '#3d2b16', lineHeight: 1.03 }
const tagline: CSSProperties = { margin: '0 0 16px', fontSize: '24px', lineHeight: 1.4, fontStyle: 'italic', color: '#6f4d24', maxWidth: '880px' }
const intro: CSSProperties = { margin: 0, fontSize: '18px', lineHeight: 1.65, maxWidth: '900px' }
const statsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '12px', marginTop: '24px', maxWidth: '900px' }
const statCard: CSSProperties = { background: 'rgba(239,225,199,.94)', border: '1px solid #b89b6d', padding: '15px 16px' }
const statLabel: CSSProperties = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const statValue: CSSProperties = { fontSize: '26px', fontWeight: 700, marginTop: '5px', color: '#3d2b16' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '34px 20px 50px' }
const statusBox: CSSProperties = { background: '#f1e3c8', border: '1px solid #b29364', padding: '15px', lineHeight: 1.55, marginBottom: '28px' }
const sectionTitle: CSSProperties = { fontSize: '26px', margin: '0 0 16px', color: '#3d2b16' }
const yearGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(105px,1fr))', gap: '8px' }
const yearCard: CSSProperties = { display: 'block', background: '#f1e3c8', border: '1px solid #b29364', padding: '11px 9px', textAlign: 'center', textDecoration: 'none', color: '#2f2417' }
const yearNumber: CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#3d2b16' }
const yearStatus: CSSProperties = { fontSize: '11px', color: '#7a5827', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '.5px' }
