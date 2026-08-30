import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import TrackLogo from './[slug]/TrackLogo'

type TrackRow = {
  slug: string
  track_name: string
  city?: string | null
  state?: string | null
}

type StateCountRow = { state?: string | null }

const primaryStates = [
  { code: 'WI', name: 'Wisconsin', color: '#536b3c' },
  { code: 'MN', name: 'Minnesota', color: '#2f6883' },
  { code: 'MI', name: 'Michigan', color: '#2f6883' },
  { code: 'IL', name: 'Illinois', color: '#b4533d' },
  { code: 'IN', name: 'Indiana', color: '#d89a24' },
]

const otherStateNames: Record<string, string> = {
  IA: 'Iowa', MO: 'Missouri', OH: 'Ohio', TN: 'Tennessee',
  CO: 'Colorado', KS: 'Kansas', ONT: 'Ontario',
}

export default async function TracksPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const params = (await searchParams) ?? {}
  const query = (params.q ?? '').trim()

  const [{ data: countRows }, { data: featuredRows }] = await Promise.all([
    supabase.from('Tracks').select('state').eq('is_published', true).range(0, 999),
    supabase
      .from('Tracks')
      .select('slug,track_name,city,state')
      .eq('is_published', true)
      .ilike('track_name', 'Wisconsin International Raceway')
      .limit(1),
  ])

  const stateCounts = ((countRows ?? []) as StateCountRow[]).reduce<Record<string, number>>(
    (acc, row) => {
      const code = (row.state ?? '').trim().toUpperCase()
      if (code) acc[code] = (acc[code] ?? 0) + 1
      return acc
    },
    {},
  )

  const featuredTrack = ((featuredRows ?? []) as TrackRow[])[0] ?? null
  let searchRows: TrackRow[] = []
  let searchError: { message?: string } | null = null

  if (query) {
    const result = await supabase
      .from('Tracks')
      .select('slug,track_name,city,state')
      .eq('is_published', true)
      .ilike('track_name', `%${query}%`)
      .order('track_name', { ascending: true })
      .range(0, 499)
    searchRows = (result.data ?? []) as TrackRow[]
    searchError = result.error
  }

  const otherStates = Object.entries(otherStateNames)
    .filter(([code]) => (stateCounts[code] ?? 0) > 0)
    .map(([code, name]) => ({ code, name, count: stateCounts[code] ?? 0 }))

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div>
            <div style={eyebrow}>Museum Collection</div>
            <h1 style={pageTitle}>Tracks</h1>
            <p style={pageIntro}>
              Browse race tracks, fairgrounds, speedways, and historic venues from across the
              Upper Midwest archive.
            </p>
            <form action="/tracks" method="get" style={searchForm}>
              <input type="text" name="q" defaultValue={query} placeholder="Search all tracks..." style={searchInput} />
              <button type="submit" style={searchButton}>Search</button>
            </form>
          </div>

          <div style={featureBox}>
            <div style={featureTitle}>Featured Track</div>
            {featuredTrack ? (
              <>
                <div style={featureLogoWrap} className="track-logo-wrap-mobile">
                  <TrackLogo slug={featuredTrack.slug} trackName={featuredTrack.track_name} />
                </div>
                <div style={featureName}>{featuredTrack.track_name}</div>
                <div style={featureMeta}>{featuredTrack.city || ''}{featuredTrack.city && featuredTrack.state ? ', ' : ''}{featuredTrack.state || ''}</div>
                <Link href={`/tracks/${featuredTrack.slug}`} style={featureButton}>Explore Track</Link>
              </>
            ) : <div style={featureMeta}>Featured track coming soon.</div>}
          </div>
        </div>
      </section>

      <section style={stateSection}>
        <div style={sectionHeading}>Select a State</div>
        <div style={sectionSubhead}>Click a state to open its track directory.</div>
        <div style={stateGrid}>
          {primaryStates.map((item) => (
            <Link key={item.code} href={`/tracks/state/${item.code.toLowerCase()}`} style={stateCard}>
              <CheckeredFlagWatermark />
              <div style={stateCardContent}>
                <StateShape code={item.code} color={item.color} />
                <div style={stateName}>{item.name}</div>
                <div style={stateCount}>{stateCounts[item.code] ?? 0} Track{(stateCounts[item.code] ?? 0) === 1 ? '' : 's'}</div>
              </div>
            </Link>
          ))}
        </div>

        {otherStates.length > 0 && (
          <div style={otherWrap}>
            <div style={otherTitle}>Other Tracks in the Archive</div>
            <div style={otherSubhead}>Tracks outside our primary region.</div>
            <div style={otherGrid}>
              {otherStates.map((item) => (
                <Link key={item.code} href={`/tracks/state/${item.code.toLowerCase()}`} style={otherCard}>
                  <CheckeredFlagWatermark compact />
                  <div style={otherCardContent}>
                    <div style={otherName}>{item.name}</div>
                    <div style={otherCount}>{item.count} Track{item.count === 1 ? '' : 's'}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {query && (
        <section style={contentWrap}>
          <div style={resultsHeader}>
            <div>
              <div style={resultsTitle}>Track Search Results</div>
              <div style={resultsLine}>Showing {searchRows.length} result{searchRows.length === 1 ? '' : 's'} for <strong>{query}</strong></div>
            </div>
            <Link href="/tracks" style={backButton}>Clear Search</Link>
          </div>
          {searchError ? <div style={errorBox}>Unable to load tracks right now.</div> : searchRows.length === 0 ? (
            <div style={emptyBox}>No tracks found.</div>
          ) : (
            <div style={gridWrap}>
              {searchRows.map((t) => (
                <Link key={t.slug} href={`/tracks/${t.slug}`} style={trackCard}>
                  <div style={trackLogoWrap} className="track-logo-wrap-mobile"><TrackLogo slug={t.slug} trackName={t.track_name} /></div>
                  <div style={trackNameStyle}>{t.track_name}</div>
                  <div style={trackMetaStyle}>{t.city || ''}{t.city && t.state ? ', ' : ''}{t.state || ''}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function CheckeredFlagWatermark({ compact = false }: { compact?: boolean }) {
  const cols = 7
  const rows = 5
  const size = 10
  return (
    <svg viewBox="0 0 80 58" aria-hidden="true" style={compact ? compactFlagWatermark : flagWatermark}>
      <g transform="translate(5 4) skewY(-7)">
        {Array.from({ length: rows }).flatMap((_, row) =>
          Array.from({ length: cols }).map((__, col) => (
            <rect key={`${row}-${col}`} x={col * size} y={row * size} width={size} height={size} fill={(row + col) % 2 === 0 ? '#3d2b16' : '#f7efdf'} />
          )),
        )}
      </g>
      <path d="M5 4 C28 0 48 8 75 2 L75 48 C51 55 28 44 5 52 Z" fill="none" stroke="#7b603d" strokeWidth="1.2" />
    </svg>
  )
}

// Accurate silhouettes derived from the MIT-licensed state-svg-defs project.
function StateShape({ code, color }: { code: string; color: string }) {
  const common = { fill: color, stroke: '#3d2b16', strokeWidth: 1.15, strokeLinejoin: 'round' as const }

  if (code === 'WI') return (
    <svg viewBox="0 0 67 80" style={stateSvg} aria-label="Wisconsin outline">
      <path {...common} d="M61.6 24.48l-.88 1.36-1.2.48-.24 1.68-1.04 1.28-.08 1.04.72.96 1.52-1.84-.08-.56 1.36-1.84-.56-.56.56.16-.08-1.44.64-.16-.16-.56h-.48zM62.56 22.8l-.32.96h1.04l.08-.88zM25.28 4.08l1.44-.8-.16-.48-2 1.6zM27.04 2l.24-.32-1.28.48 1.04.24V2zM24.48 1.84l-.64-.4-.8.4-1.44 1.12-.96-.4L18.72 4l-3.68 1.12-1.68.16L12.08 4l-1.2 1.52h-.64l-.16 8.16-.72.64h-.72l-2.88 1.6L4 18.8v1.84l1.28.08.8 2.08-1.12 1.76v2.32l-.48.72.48 2.08-.72 2.48 2.16 2 1.92.4 1.04 1.52 1.84.64 1.6 1.44 1.28 2.56 1.52 1.36 2.48.72 1.12 1.28.4 2.72v3.68l.4 1.44 1.12.8-.8 2.16.8 5.12.8 1.2 3.2.8.48 2h29.6l.08-4.08-1.36-3.36-.16-3.36 1.92-6.24-.4-3.28.88-2.32 1.44-1.44-.64-1.76 1.92-6.72-1.12-1.12-1.28.56-1.76 2.64-1.6 1.6-.64.16-.64-.48 1.92-4.8 1.92-1.12.48-1.6-1.28-1.12.4-2.72-2 .16.72-1.68-.08-2.72-.88-.88-2.16-.56.16-1.12-.96-1.04-3.44-.96-2.96-.16-2.72-1.44-9.84-2.64-1.04-2.48-1.52-.4-.24-.72-1.6-.16-1.76-1.36-.24.88-1.52.4 1.76-4zM25.6 2.16v-.32l-.48-.32-.24.32zM23.2 1.44l.24-.32-.24-.24-.32.4zM28.32.88V0l-.64 1.12z" />
    </svg>
  )

  if (code === 'MN') return (
    <svg viewBox="0 0 64 80" style={stateSvg} aria-label="Minnesota outline">
      <path {...common} d="M18.24 4.48 18 3.04 4 2.56l.8 4-.4 1.28v4.32l1.76 5.92L6 24.8l.4.8-.24 3.12 1.44 5.44-.32 3.44-2.24 2.64L6.16 42l1.12.56.64.96-.8 20 20.8.48 21.04-.08-.48-4.4-.8-1.28-2.16-.64L42 53.68l-1.6-.4-.72-1.12-1.52-.4L36.32 50l.48-1.76-.4-1.52.4-.72v-1.52l.64-1.68-.64-1.52-1.04-.08-.24-1.36 1.68-2.32 3.12-2.08v-6.4h.48l.96-1.6 4.4-3.52 4.96-5.6 9.12-4.48-1.68-.24-.96.32-1.6-1.28-4.48.64-1.04-1.68-2.8 2h-2.4l-.8-.4-.32-.96-1.84-.56-.64-1.2-1.52.24-.16.88-.48.24-.96-2.32-1.52-.16.4-.88-2.24-.8-2.16-.24-1.44.4-.4.64-1.92.08-.88-1.2-5.36-1.12-.72-.64v-.96h-.96l-1.04-1.2zM19.6-.8v2.24l.96-.48.32-1.04-.16-.64z" />
    </svg>
  )

  if (code === 'MI') return (
    <svg viewBox="0 0 72 80" style={stateSvg} aria-label="Michigan outline">
      <path {...common} d="M62 59.68v-1.2l-.32 1.2H62zM37.28 27.52l.32-.24-.32-.32-.32.32zM38.4 26.64v-.56l-.56-.32v.88h.56zM39.52 22.96l-.32-.24-.24-.32.56.88v-.32zM41.84 20.96l.32-1.92h-.64l-.56 1.6zM48.32 18.72l-2.24.32.32.24-1.2 1.2v1.36l.64.88.8.24-3.44 1.44-.32 3.12-1.04 2.8.32-2.8-.88 2.56-.32-.8.56-4.08-2 2.88-.88-.24-1.04.88-.32 1.6-1.44.88.32 3.44-2.32 3.12.88 3.12-.88 2 1.44 4.32.88-.32-.64.56.64 2.56.24 3.36-1.44 4.88-2.24 4.24-1.68 1.44h17.28v.56l11.12-.56 2.24-3.36-.32-.88.64-2.08 2-1.36v-1.68l.88-.64-.32-.56 1.36-.24v1.44l.88-.88.88-4.56-2.24-8.8-.88-1.68-1.68-1.12-2.56 1.12-1.12.8h.56l-1.2 2.32-.56-.32-1.12 1.44-2-1.12.64-3.12 1.92-.88.56-2.32 1.44-.8.32-5.12-1.44-2.24.24-.88 1.2.56-.88-2.8-4.56-2.32h-1.44l-.8-1.36-2.32-.56zM18.8 4.48l.32-.88-.88-.24h-.32v-1.2l-2.56 2.32-1.12.32-2.32 1.44-2.8.32L4 9.36l1.44.56.8 1.92L14 14.48l1.92 1.12 2.56.24 3.12 1.12v1.44l2.32 1.52-.56 3.36h1.68l-.64 1.92.88 1.2v-.88l4.24-5.6.88-2.64v2.64l.88-.64.88-1.44h1.68v1.2l-.56-.32-.8 1.44.8.48.8-1.6 1.2-.64.88-1.44 2.48.32.32-.56 2-.32.88-1.04 4 .72 2.16 1.76.64-2 .88.56.56-.32 4.56.32v-.32l-1.44-1.04.24-.56-1.6-.56.48-.32-1.36-2.8-1.76.8-.56-.8-1.36.48-1.76-.48.56-3.2-4.24 1.12h-4.88l-3.92 2.88-.88-.8-.88.48-.88-1.04-1.6.56-1.2-.32-2-3.44-1.2-.8-2.48-.32-1.44.8 1.12-1.36-1.92 1.2-.56 1.04.24-2.56zM25.04.24l-.8-.56-3.52.56-2.48 1.92v.88l1.44.56-.56.64.56.8 1.68-2.56 2-1.36-.56-.56z" />
    </svg>
  )

  if (code === 'IL') return (
    <svg viewBox="0 0 44 80" style={stateSvg} aria-label="Illinois outline">
      <path {...common} d="M37.04.72 12.64.32l1.68 1.76.16 1.36 2.08 1.68-.32 3.12-2.32 3.44-2.24 1.12-2.96.16-.64 2.08 1.04 1.36.24 1.68-2 3.44-2.16 1.12.08 2.16-.96.4-.32 1.12.16 2.96.96 3.36 5.2 5.28.96 4.32.64.4 1.44-.88 2.56 1.28-.4 2.56-1.76 3.52.08 1.36 2.16 2.4 1.76.72 3.76 3.36v1.68l.48 1.6-.48 1.44.96 2.48 1.12.64-.32-.72.4-.16.96 1.2h.4l-.48-1.04 1.68-1.84 4.4 1.84.72-.24-.32-3.52 3.6-1.2-.64-1.68 1.04-1.52-.48-.72h.48l-.48-.8h.48v-1.84l.88-.32-.64-.16.88-.88-.72-.72.56-.88.72.32.96-2.08 1.04-.48-.16-.72 1.44-2.4-.24-2.16-1.36-1.92.8-1.04-.32-1.36.88-.32-.08-27.76-2.64-5.92V.72z" />
    </svg>
  )

  return (
    <svg viewBox="0 0 51 80" style={stateSvg} aria-label="Indiana outline">
      <path {...common} d="M46.24 2.16v-.8L21.2 1.28l-2.4 1.28-2.96.8-1.6-.32-.08-.88-.4.4-.88-.88L12 40.32l-1.12.56.16 1.92-.8 1.44 1.6 2.64-.24 1.36.48 2-2.08 2.96.08 1.28-1.52.48.08.56-1.12 2.08-.24-.32-.48.64-.48-.32-.72 1.12.72 1.04-1.2 1.04.8.32-.88.4v2.4l-1.04.24 1.04 1.04-.88.32 1.84.48.56-.72-.24-1.12.24-.4 1.44.56 1.6-.16v1.12h.64l.48-.96-.08-1.28.48.88 1.92-.4 3.36 1.76.48.8 1.36-2.16 2.56-1.2.48 1.2 1.6.4-.08.48.4.4.48-1.04.88-.32.08-1.84.8-.4-.08-1.28.48.72 1.28-.8-.88-.64 1.36.56.32 1.52 2.72 1.76 1.52-1.12.32-2.48 1.04-1.76.8.32 1.44-.72.8-2.4.96-.16 1.28-1.52-.48-2.64 2.48-.24 1.04.64 3.04-1.68h1.76l.16-1.52-1.12-.32.72-1.12-.72-1.36.72-.56z" />
    </svg>
  )
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const heroSection: CSSProperties = { background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)', borderBottom: '1px solid #b29364' }
const heroInner: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '34px 20px 28px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 430px)', gap: '34px', alignItems: 'start' }
const eyebrow: CSSProperties = { fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }
const pageTitle: CSSProperties = { fontSize: '52px', margin: '0 0 10px', color: '#3d2b16' }
const pageIntro: CSSProperties = { fontSize: '20px', lineHeight: 1.55, maxWidth: '720px', margin: '0 0 22px' }
const searchForm: CSSProperties = { display: 'flex', gap: '10px', flexWrap: 'wrap' }
const searchInput: CSSProperties = { flex: '1 1 300px', minWidth: '220px', padding: '12px 14px', border: '2px solid #b29364', background: '#f6eddc', fontSize: '16px', color: '#2f2417' }
const searchButton: CSSProperties = { padding: '12px 22px', background: '#4b3016', color: '#fff8ea', border: '2px solid #3c260f', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }
const featureBox: CSSProperties = { border: '2px solid #b29364', background: '#efe5d1', padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '9px' }
const featureTitle: CSSProperties = { fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px', color: '#7a5827', textAlign: 'center', borderBottom: '1px solid #b29364', padding: '11px 8px', fontWeight: 700 }
const featureLogoWrap: CSSProperties = { height: '150px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6eddc', overflow: 'hidden', padding: '10px' }
const featureName: CSSProperties = { fontSize: '19px', fontWeight: 700, textAlign: 'center' }
const featureMeta: CSSProperties = { fontSize: '14px', textAlign: 'center', color: '#5a3a1b' }
const featureButton: CSSProperties = { textAlign: 'center', padding: '8px', background: '#4b3016', color: '#fff8ea', textDecoration: 'none', border: '1px solid #3c260f' }
const stateSection: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '22px 20px 20px' }
const sectionHeading: CSSProperties = { fontSize: '16px', textTransform: 'uppercase', color: '#5b3b1b', fontWeight: 700 }
const sectionSubhead: CSSProperties = { fontSize: '14px', margin: '5px 0 15px', color: '#5a4934' }
const stateGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(140px, 1fr))', gap: '16px' }
const stateCard: CSSProperties = { textDecoration: 'none', color: '#2f2417', background: '#f2e8d6', border: '1px solid #c8ad82', borderRadius: '5px', minHeight: '200px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(65,45,20,.08)', position: 'relative', overflow: 'hidden' }
const stateCardContent: CSSProperties = { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }
const flagWatermark: CSSProperties = { position: 'absolute', width: '84%', height: '76%', right: '-8%', top: '4%', opacity: 0.075, transform: 'rotate(-8deg)', pointerEvents: 'none' }
const compactFlagWatermark: CSSProperties = { position: 'absolute', width: '92%', height: '110%', right: '-12%', top: '-8%', opacity: 0.11, transform: 'rotate(-8deg)', pointerEvents: 'none' }
const stateSvg: CSSProperties = { width: '116px', height: '116px', display: 'block', marginBottom: '2px', filter: 'drop-shadow(0 1px 0 rgba(255,255,255,.4))' }
const stateName: CSSProperties = { fontSize: '25px', fontWeight: 700, marginTop: '2px' }
const stateCount: CSSProperties = { fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: 700, marginTop: '8px' }
const otherWrap: CSSProperties = { marginTop: '17px', borderTop: '1px solid #b29364', borderBottom: '1px solid #b29364', padding: '9px 0 13px', textAlign: 'center' }
const otherTitle: CSSProperties = { textTransform: 'uppercase', color: '#6a491d', fontWeight: 700, fontSize: '15px' }
const otherSubhead: CSSProperties = { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#6b5a44', margin: '4px 0 10px' }
const otherGrid: CSSProperties = { display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }
const otherCard: CSSProperties = { minWidth: '105px', padding: '9px 13px', textDecoration: 'none', border: '1px solid #c8ad82', background: '#f2e8d6', color: '#304b36', borderRadius: '4px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(65,45,20,.07)' }
const otherCardContent: CSSProperties = { position: 'relative', zIndex: 1 }
const otherName: CSSProperties = { fontWeight: 700, fontSize: '14px' }
const otherCount: CSSProperties = { color: '#3c3124', fontFamily: 'Arial, sans-serif', fontSize: '12px', marginTop: '2px' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '4px 20px 40px' }
const resultsHeader: CSSProperties = { borderTop: '1px solid #b29364', paddingTop: '18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center' }
const resultsTitle: CSSProperties = { fontSize: '25px', fontWeight: 700, color: '#3d2b16' }
const resultsLine: CSSProperties = { marginTop: '4px', fontSize: '14px', color: '#6a4a1f' }
const backButton: CSSProperties = { textDecoration: 'none', color: '#5a3a1b', border: '1px solid #b29364', background: '#efe4cd', padding: '8px 12px', fontSize: '13px', fontWeight: 700 }
const errorBox: CSSProperties = { padding: '18px', background: '#f2d8d3', border: '1px solid #b36a5e' }
const emptyBox: CSSProperties = { padding: '18px', background: '#f1e5ce', border: '1px solid #c2a97d' }
const gridWrap: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }
const trackCard: CSSProperties = { display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '2px solid #b29364', background: '#ddc8a2', padding: '12px', color: '#2f2417', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: '100%' }
const trackLogoWrap: CSSProperties = { height: '92px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#efe7d6', border: '1px solid #b29364', marginBottom: '12px', overflow: 'hidden', padding: '8px' }
const trackNameStyle: CSSProperties = { textAlign: 'center', fontWeight: 700, color: '#3d2b16', marginBottom: '6px', lineHeight: 1.2 }
const trackMetaStyle: CSSProperties = { textAlign: 'center', fontSize: '14px', color: '#5a3a1b' }
