import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SERIES_IDS = [95, 96, 98, 99, 100, 101, 102, 103]
const FIRST_YEAR = 1986
const LAST_YEAR = 2025

const divisionNames: Record<number, string> = {
  95: 'Late Model',
  96: 'Modified',
  98: 'Super Stock',
  99: 'Street Stock',
  100: 'Midwest Modified',
  101: 'Mod Four',
  102: 'Pure Stock',
  103: 'Hornet',
}

type EventRow = { series_id: number | null; race_date: string | null }

export default async function Wissota100Page() {
  const { data: eventRows } = await supabase
    .from('SeriesEvents')
    .select('series_id,race_date')
    .in('series_id', SERIES_IDS)
    .order('race_date', { ascending: false })

  const events = (eventRows ?? []) as EventRow[]
  const yearMap = new Map<number, Set<number>>()
  for (const event of events) {
    if (!event.race_date || !event.series_id) continue
    const year = Number(event.race_date.slice(0, 4))
    if (!yearMap.has(year)) yearMap.set(year, new Set())
    yearMap.get(year)!.add(event.series_id)
  }

  const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => LAST_YEAR - i)

  return (
    <main style={pageStyle}>
      <section style={hero}>
        <div style={watermark}>100</div>
        <div style={heroInner}>
          <Link href="/events" style={backLink}>← Special Events</Link>
          <div style={eyebrow}>Special Event Archive</div>
          <h1 style={title}>WISSOTA 100</h1>
          <p style={tagline}>The year-by-year championship archive of one of WISSOTA racing’s signature annual events.</p>
          <p style={intro}>
            The Museum links each documented WISSOTA 100 championship division together by year. Late Models and Modifieds form the earliest archive, with Super Stocks, Street Stocks, Midwest Modifieds, Mod Fours, Pure Stocks and Hornets added where documented. Race of Champions events and qualifying-night features remain separate from this collection.
          </p>
          <div style={statsGrid}>
            <Stat label="Years" value="1986–2025" />
            <Stat label="Division Events" value="173" />
            <Stat label="Result Rows" value="1,513" />
            <Stat label="2020" value="COVID" />
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={statusBox}>
          <strong>Archive standard:</strong> finishing orders are shown only to the depth preserved by surviving sources. A full field is used when available; otherwise top-10, top-four, or winner-only records are retained rather than reconstructed. The 1987 edition was rained out and the 2020 edition was cancelled during COVID.
        </div>

        <h2 style={sectionTitle}>Year-by-Year Archive</h2>
        <div style={yearGrid}>
          {years.map((year) => {
            const divisions = yearMap.get(year)
            const cancelled = year === 1987 || year === 2020
            const labels = divisions ? Array.from(divisions).sort((a,b) => a-b).map(id => divisionNames[id]).filter(Boolean) : []
            return (
              <Link key={year} href={`/events/wissota-100/${year}`} style={yearCard}>
                <div style={yearNumber}>{year}</div>
                <div style={yearStatus}>
                  {cancelled ? (year === 2020 ? 'COVID — No Event' : 'Rained Out') : labels.length ? `${labels.length} Division${labels.length === 1 ? '' : 's'}` : 'No Record'}
                </div>
              </Link>
            )
          })}
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
const watermark: CSSProperties = { position: 'absolute', right: '-10px', top: '-34px', fontSize: '210px', fontWeight: 700, color: 'rgba(90,62,29,.045)', lineHeight: 1 }
const heroInner: CSSProperties = { position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '30px 20px 42px' }
const backLink: CSSProperties = { color: '#6a4a1f', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: '22px' }
const eyebrow: CSSProperties = { fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const title: CSSProperties = { margin: '0 0 10px', fontSize: '58px', color: '#3d2b16', lineHeight: 1.03 }
const tagline: CSSProperties = { margin: '0 0 16px', fontSize: '24px', lineHeight: 1.4, fontStyle: 'italic', color: '#6f4d24', maxWidth: '900px' }
const intro: CSSProperties = { margin: 0, fontSize: '18px', lineHeight: 1.65, maxWidth: '940px' }
const statsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '12px', marginTop: '24px', maxWidth: '900px' }
const statCard: CSSProperties = { background: 'rgba(239,225,199,.94)', border: '1px solid #b89b6d', padding: '15px 16px' }
const statLabel: CSSProperties = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const statValue: CSSProperties = { fontSize: '26px', fontWeight: 700, marginTop: '5px', color: '#3d2b16' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '34px 20px 50px' }
const statusBox: CSSProperties = { background: '#f1e3c8', border: '1px solid #b29364', padding: '15px', lineHeight: 1.55, marginBottom: '28px' }
const sectionTitle: CSSProperties = { fontSize: '26px', margin: '0 0 16px', color: '#3d2b16' }
const yearGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(125px,1fr))', gap: '8px' }
const yearCard: CSSProperties = { display: 'block', background: '#f1e3c8', border: '1px solid #b29364', padding: '11px 9px', textAlign: 'center', textDecoration: 'none', color: '#2f2417' }
const yearNumber: CSSProperties = { fontSize: '20px', fontWeight: 700, color: '#3d2b16' }
const yearStatus: CSSProperties = { fontSize: '11px', color: '#7a5827', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '.5px' }
