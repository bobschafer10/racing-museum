import Link from 'next/link'
import type { CSSProperties } from 'react'

export const dynamic = 'force-dynamic'

const events = [
  {
    slug: 'slinger-nationals',
    title: 'Slinger Nationals',
    venue: 'Slinger Speedway',
    years: '1980–2026',
    races: 88,
    results: 2185,
    status: 'Archive built',
    description:
      'A complete historical event collection spanning the original multi-race Slinger Nationals era and the modern annual 200-lap classic.',
  },
  {
    slug: 'silver-1000',
    title: 'Silver 1000',
    venue: 'Proctor Speedway',
    years: '1973–2025',
    races: 89,
    results: 1065,
    status: 'Archive live — enrichment underway',
    description:
      'One Silver 1000 collection links the Late Model and Modified divisions together by year at Proctor Speedway. Halvor Lines Speedway references are normalized to the Museum’s Proctor Speedway track record.',
  },
  {
    slug: 'wissota-100',
    title: 'WISSOTA 100',
    venue: 'Upper Midwest / Upper Great Plains',
    years: '1986–2025',
    races: 173,
    results: 1513,
    status: 'Archive built',
    description:
      'One Special Event collection ties all documented WISSOTA 100 championship divisions together by year, including Late Model, Modified, Super Stock, Street Stock, Midwest Modified, Mod Four, Pure Stock and Hornet records. Race of Champions and qualifying-night features remain separate.',
  },
  {
    slug: 'legendary-100',
    title: 'Legendary 100',
    venue: 'Cedar Lake Speedway',
    years: '2006–2025',
    races: 128,
    results: 1898,
    status: 'Archive built',
    description:
      'One Legendary 100 collection ties the Late Model, Modified, Midwest Modified, Pro Stock/Super Stock, Street Stock, Pure Stock, Hornet and Limited Late Model divisions together by year.',
  },
  {
    slug: 'usa-nationals',
    title: 'USA Nationals',
    venue: 'Cedar Lake Speedway',
    years: '1988–2026',
    races: 39,
    results: 142,
    status: 'Chronology complete through 2026',
    description:
      'The USA Nationals headline Dirt Late Model event is preserved as a single annual Special Event collection, with available finishing orders tied to each edition.',
  },
  {
    slug: 'clash-at-the-creek',
    title: 'Clash at the Creek',
    venue: '141 Speedway',
    years: '2009–2026',
    races: 19,
    results: 203,
    status: 'Archive built',
    description:
      'The annual Clash at the Creek Modified event is preserved as one Special Event collection with its year-by-year winners and available finishing orders.',
  },
  {
    slug: 'oktoberfest',
    title: 'Oktoberfest',
    venue: 'LaCrosse Fairgrounds Speedway',
    years: '1970–2025',
    races: 56,
    results: 1611,
    status: 'Archive built',
    description:
      'The Oktoberfest headline archive is preserved as one annual Special Event collection with all documented finishing-order records tied to the event history.',
  },
  {
    slug: 'national-short-track-championships',
    title: 'National Short Track Championships',
    venue: 'Rockford Speedway',
    years: '1966–2025',
    races: 60,
    results: 1576,
    status: 'Archive built',
    description:
      'The National Short Track Championships are preserved as one annual Special Event collection, with the headline event chronology and available full finishing orders tied together by year.',
  },
]

export default function EventsPage() {
  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={watermark}>EVENTS</div>
        <div style={heroInner}>
          <div style={eyebrow}>Museum Collection</div>
          <h1 style={title}>Special Events</h1>
          <p style={tagline}>Marquee races, annual classics, and historic event weekends preserved as complete collections.</p>
          <p style={intro}>
            Special Events brings together year-by-year race histories that do not fit neatly into a touring-series archive. Multi-division annual events appear once here, with all documented divisions and results tied to that single event collection.
          </p>
          <div style={statsRow}>
            <div style={statCard}><div style={statLabel}>Collections Published</div><div style={statValue}>8</div></div>
            <div style={statCard}><div style={statLabel}>Race Events Archived</div><div style={statValue}>652</div></div>
            <div style={statCard}><div style={statLabel}>Result Rows Archived</div><div style={statValue}>10,193</div></div>
          </div>
        </div>
      </section>

      <div style={divider}>Special Event Collection</div>

      <section style={contentWrap}>
        <div style={grid}>
          {events.map((event) => {
            const body = (
              <>
                <div style={cardTop}>
                  <div style={cardEyebrow}>{event.status}</div>
                  <div style={cardTitle}>{event.title}</div>
                  <div style={cardMeta}>{event.venue} • {event.years}</div>
                </div>
                <div style={cardBody}>
                  <p style={cardText}>{event.description}</p>
                  <div style={miniStats}>
                    <span><strong>{event.races}</strong> race events</span>
                    <span><strong>{event.results.toLocaleString()}</strong> result rows</span>
                  </div>
                  <div style={cardButton}>Explore Event →</div>
                </div>
              </>
            )

            return <Link key={event.title} href={`/events/${event.slug}`} style={card}>{body}</Link>
          })}
        </div>
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const heroSection: CSSProperties = { position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at 80% 20%, rgba(122,88,39,.14), transparent 30%), linear-gradient(to bottom,#e7d9bf,#eadfc7)', borderBottom: '2px solid #b29364' }
const watermark: CSSProperties = { position: 'absolute', right: '-30px', top: '-24px', fontSize: '190px', fontWeight: 700, color: 'rgba(90,62,29,.045)', lineHeight: 1 }
const heroInner: CSSProperties = { position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '42px 20px 46px' }
const eyebrow: CSSProperties = { fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }
const title: CSSProperties = { fontSize: '56px', margin: '0 0 10px', color: '#3d2b16', lineHeight: 1.05 }
const tagline: CSSProperties = { margin: '0 0 18px', fontSize: '24px', lineHeight: 1.4, fontStyle: 'italic', color: '#6f4d24', maxWidth: '850px' }
const intro: CSSProperties = { fontSize: '19px', lineHeight: 1.65, maxWidth: '900px', margin: 0 }
const statsRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '14px', marginTop: '26px', maxWidth: '800px' }
const statCard: CSSProperties = { background: 'rgba(239,225,199,.92)', border: '1px solid #b89b6d', padding: '18px' }
const statLabel: CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '6px' }
const statValue: CSSProperties = { fontSize: '34px', fontWeight: 700, color: '#3d2b16' }
const divider: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '18px 20px 0', fontSize: '20px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#6b4a22', borderTop: '2px solid rgba(122,88,39,.25)' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '28px 20px 46px' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '18px' }
const card: CSSProperties = { display: 'block', textDecoration: 'none', color: '#2f2417', border: '2px solid #b29364', background: '#f2e4c8', boxShadow: '0 5px 14px rgba(0,0,0,.08)' }
const cardTop: CSSProperties = { padding: '18px 18px 14px', background: '#ddc8a2', borderBottom: '1px solid #b29364' }
const cardEyebrow: CSSProperties = { fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '7px' }
const cardTitle: CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#3d2b16', marginBottom: '6px' }
const cardMeta: CSSProperties = { fontSize: '14px', fontWeight: 700, color: '#6a4a1f' }
const cardBody: CSSProperties = { padding: '18px' }
const cardText: CSSProperties = { margin: '0 0 16px', lineHeight: 1.55, fontSize: '15px' }
const miniStats: CSSProperties = { display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '14px', color: '#5a3a1b', marginBottom: '16px' }
const cardButton: CSSProperties = { display: 'inline-block', background: '#7a5827', color: '#fff8ea', padding: '9px 12px', border: '1px solid #5d3f17', fontWeight: 700 }
