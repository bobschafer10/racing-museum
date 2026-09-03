import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SERIES_ID = 166

type ResultRow = {
  id: number
  finishing_position: number | null
  driver_name: string
  car_number: string | null
  starting_position: string | null
  laps: string | null
  status: string | null
  result_section: string | null
}

type EventRow = {
  id: number
  race_date: string | null
  winner_name: string | null
  source_url: string | null
  SeriesEventResults: ResultRow[]
}

export default async function Jmck63Page() {
  const { data, error } = await supabase
    .from('SeriesEvents')
    .select(`
      id,
      race_date,
      winner_name,
      source_url,
      SeriesEventResults (
        id,
        finishing_position,
        driver_name,
        car_number,
        starting_position,
        laps,
        status,
        result_section
      )
    `)
    .eq('series_id', SERIES_ID)
    .order('race_date', { ascending: false })

  const events = (data ?? []) as EventRow[]
  const resultCount = events.reduce((sum, event) => sum + event.SeriesEventResults.length, 0)

  return (
    <main style={pageStyle}>
      <section style={hero}>
        <div style={watermark}>JMcK</div>
        <div style={heroInner}>
          <Link href="/events" style={backLink}>← Special Events</Link>
          <div style={eyebrow}>Special Event Archive</div>
          <h1 style={title}>JMcK 63</h1>
          <p style={tagline}>The annual John McKarns memorial invitational at LaCrosse Fairgrounds Speedway.</p>
          <p style={intro}>
            Contested from 2010 through 2018 during Oktoberfest Race Weekend, the JMcK 63 used three 21-lap segments with the overall winner determined by cumulative finishing points. The event belongs in the Museum’s Special Events collection rather than the touring-series archive.
          </p>
          <div style={statsGrid}>
            <Stat label="Years" value="2010–2018" />
            <Stat label="Editions" value={String(events.length || 9)} />
            <Stat label="Result Rows" value={String(resultCount)} />
            <Stat label="Format" value="3 × 21 laps" />
          </div>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={sourceCard}>
          <div style={sourceLabel}>Archive Notes</div>
          <p style={sourceText}>
            JMcK was John McKarns’ abbreviated signature. The invitational was created in his honor and brought together weekly Late Model winners, Big 8 contenders, former Oktoberfest champions and other regional standouts.
          </p>
          <p style={sourceText}>
            Winner chronology is verified for all nine editions. Full finishing orders are shown only where a reliable source has been preserved; missing fields are left blank rather than reconstructed.
          </p>
        </div>

        <h2 style={sectionTitle}>Year-by-Year Results</h2>
        {error ? (
          <div style={statusBox}>Unable to load the live JMcK 63 archive.</div>
        ) : (
          <div style={eventStack}>
            {events.map((event) => {
              const rows = [...event.SeriesEventResults].sort(
                (a, b) => (a.finishing_position ?? 9999) - (b.finishing_position ?? 9999),
              )
              const year = event.race_date?.slice(0, 4) ?? 'Year unknown'

              return (
                <article key={event.id} style={eventCard}>
                  <div style={eventHeader}>
                    <div>
                      <div style={eventYear}>{year}</div>
                      <div style={eventDate}>{formatDate(event.race_date)}</div>
                    </div>
                    <div style={winnerBlock}>
                      <span style={winnerLabel}>Overall Winner</span>
                      <strong style={winnerName}>{event.winner_name ?? 'Not listed'}</strong>
                    </div>
                  </div>

                  {rows.length > 0 ? (
                    <div>
                      <div style={resultsHeader}>
                        <span>Pos.</span>
                        <span>Driver</span>
                        <span>Car</span>
                        <span>Start</span>
                        <span>Status</span>
                      </div>
                      {rows.map((row) => (
                        <div key={row.id} style={resultsRow}>
                          <strong>{row.finishing_position ?? '—'}</strong>
                          <strong>{row.driver_name}</strong>
                          <span>{row.car_number ?? '—'}</span>
                          <span>{row.starting_position ?? '—'}</span>
                          <span>{row.status ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={winnerOnly}>Winner chronology verified; full finishing order not yet preserved in the Museum archive.</div>
                  )}
                </article>
              )
            })}
          </div>
        )}

        <Link href="/events" style={backButton}>← Back to Special Events</Link>
      </section>
    </main>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Date not listed'
  const [year, month, day] = value.split('-')
  return `${Number(month)}/${Number(day)}/${year}`
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={statCard}><div style={statLabel}>{label}</div><div style={statValue}>{value}</div></div>
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const hero: CSSProperties = { position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at 80% 20%, rgba(122,88,39,.14), transparent 30%), linear-gradient(to bottom,#e7d9bf,#eadfc7)', borderBottom: '2px solid #b29364' }
const watermark: CSSProperties = { position: 'absolute', right: '-25px', top: '-22px', fontSize: '190px', fontWeight: 700, color: 'rgba(90,62,29,.045)', lineHeight: 1 }
const heroInner: CSSProperties = { position: 'relative', zIndex: 2, maxWidth: '1100px', margin: '0 auto', padding: '30px 20px 42px' }
const backLink: CSSProperties = { color: '#6a4a1f', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginBottom: '22px' }
const eyebrow: CSSProperties = { fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const title: CSSProperties = { margin: '0 0 10px', fontSize: '58px', color: '#3d2b16', lineHeight: 1.03 }
const tagline: CSSProperties = { margin: '0 0 16px', fontSize: '24px', lineHeight: 1.4, fontStyle: 'italic', color: '#6f4d24', maxWidth: '880px' }
const intro: CSSProperties = { margin: 0, fontSize: '18px', lineHeight: 1.65, maxWidth: '900px' }
const statsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginTop: '24px', maxWidth: '900px' }
const statCard: CSSProperties = { background: 'rgba(239,225,199,.94)', border: '1px solid #b89b6d', padding: '15px 16px' }
const statLabel: CSSProperties = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827' }
const statValue: CSSProperties = { fontSize: '27px', fontWeight: 700, marginTop: '5px', color: '#3d2b16' }
const contentWrap: CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '34px 20px 50px' }
const sourceCard: CSSProperties = { background: '#ddc8a2', border: '2px solid #b29364', padding: '18px 20px', marginBottom: '30px' }
const sourceLabel: CSSProperties = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, color: '#7a5827', marginBottom: '8px' }
const sourceText: CSSProperties = { fontSize: '15px', lineHeight: 1.55, margin: '0 0 8px' }
const sectionTitle: CSSProperties = { fontSize: '28px', margin: '0 0 16px', color: '#3d2b16' }
const statusBox: CSSProperties = { padding: '12px', background: '#f1e3c8', border: '1px solid #b29364', fontWeight: 700 }
const eventStack: CSSProperties = { display: 'grid', gap: '16px' }
const eventCard: CSSProperties = { background: '#f1e3c8', border: '2px solid #b29364', padding: '16px' }
const eventHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'end', marginBottom: '12px' }
const eventYear: CSSProperties = { fontSize: '30px', fontWeight: 700, color: '#3d2b16' }
const eventDate: CSSProperties = { fontSize: '13px', color: '#7a5827', fontWeight: 700 }
const winnerBlock: CSSProperties = { display: 'grid', textAlign: 'right', gap: '3px' }
const winnerLabel: CSSProperties = { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.8px', color: '#7a5827', fontWeight: 700 }
const winnerName: CSSProperties = { fontSize: '20px', color: '#3d2b16' }
const resultsHeader: CSSProperties = { display: 'grid', gridTemplateColumns: '60px minmax(180px,1fr) 75px 75px minmax(90px,130px)', gap: '8px', padding: '7px 0', borderBottom: '2px solid #b29364', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.6px', color: '#7a5827', fontWeight: 700 }
const resultsRow: CSSProperties = { display: 'grid', gridTemplateColumns: '60px minmax(180px,1fr) 75px 75px minmax(90px,130px)', gap: '8px', padding: '8px 0', borderBottom: '1px solid #ccb48a', fontSize: '14px' }
const winnerOnly: CSSProperties = { padding: '10px 12px', background: '#eadfc7', border: '1px solid #c2a97d', color: '#5a4630', fontSize: '14px' }
const backButton: CSSProperties = { display: 'inline-block', marginTop: '24px', background: '#7a5827', color: '#fff8ea', padding: '9px 12px', border: '1px solid #5d3f17', textDecoration: 'none', fontWeight: 700 }
