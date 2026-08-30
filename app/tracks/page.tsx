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
              <StateShape code={item.code} color={item.color} />
              <div style={stateName}>{item.name}</div>
              <div style={stateCount}>{stateCounts[item.code] ?? 0} Track{(stateCounts[item.code] ?? 0) === 1 ? '' : 's'}</div>
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
                  <div style={otherName}>{item.name}</div>
                  <div style={otherCount}>{item.count} Track{item.count === 1 ? '' : 's'}</div>
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

function StateShape({ code, color }: { code: string; color: string }) {
  const common = { fill: color, stroke: '#3d2b16', strokeWidth: 1.6, strokeLinejoin: 'round' as const }
  if (code === 'WI') return (
    <svg viewBox="0 0 120 100" style={stateSvg} aria-label="Wisconsin outline">
      <path {...common} d="M31 11 L46 8 L52 12 L61 11 L67 16 L80 15 L88 21 L91 28 L85 34 L80 35 L82 42 L78 50 L75 58 L72 66 L67 73 L64 86 L52 90 L43 86 L38 78 L32 72 L30 61 L23 54 L18 44 L21 35 L19 28 L24 20 Z" />
      <path {...common} d="M82 34 L91 29 L96 31 L93 38 L88 45 L84 42 Z" />
    </svg>
  )
  if (code === 'MN') return (
    <svg viewBox="0 0 120 100" style={stateSvg} aria-label="Minnesota outline">
      <path {...common} d="M30 9 L58 9 L58 14 L69 14 L73 19 L82 19 L86 24 L78 30 L76 38 L72 42 L73 50 L69 57 L68 66 L72 75 L79 85 L31 85 Z" />
    </svg>
  )
  if (code === 'MI') return (
    <svg viewBox="0 0 120 100" style={stateSvg} aria-label="Michigan outline">
      <path {...common} d="M14 29 L21 22 L30 19 L38 13 L47 15 L54 13 L62 16 L69 15 L78 20 L84 27 L78 31 L68 30 L60 34 L52 32 L44 35 L35 32 L29 36 L22 34 Z" />
      <path {...common} d="M67 40 L76 37 L85 42 L90 50 L89 59 L84 65 L82 73 L75 79 L71 88 L62 84 L58 76 L60 68 L55 61 L57 52 L61 45 Z" />
    </svg>
  )
  if (code === 'IL') return (
    <svg viewBox="0 0 120 100" style={stateSvg} aria-label="Illinois outline">
      <path {...common} d="M49 8 L68 8 L69 18 L66 28 L70 36 L67 44 L71 52 L67 61 L62 67 L61 76 L55 88 L48 82 L45 72 L39 65 L41 56 L36 48 L39 40 L37 31 L42 24 L44 15 Z" />
    </svg>
  )
  return (
    <svg viewBox="0 0 120 100" style={stateSvg} aria-label="Indiana outline">
      <path {...common} d="M45 8 L71 8 L70 23 L72 36 L70 48 L71 60 L68 72 L61 84 L53 89 L46 84 L43 72 L44 60 L42 49 L44 37 L42 25 Z" />
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
const stateCard: CSSProperties = { textDecoration: 'none', color: '#2f2417', background: '#f2e8d6', border: '1px solid #c8ad82', borderRadius: '5px', minHeight: '200px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(65,45,20,.08)' }
const stateSvg: CSSProperties = { width: '112px', height: '112px', display: 'block', marginBottom: '4px' }
const stateName: CSSProperties = { fontSize: '25px', fontWeight: 700, marginTop: '2px' }
const stateCount: CSSProperties = { fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: 700, marginTop: '8px' }
const otherWrap: CSSProperties = { marginTop: '17px', borderTop: '1px solid #b29364', borderBottom: '1px solid #b29364', padding: '9px 0 13px', textAlign: 'center' }
const otherTitle: CSSProperties = { textTransform: 'uppercase', color: '#6a491d', fontWeight: 700, fontSize: '15px' }
const otherSubhead: CSSProperties = { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#6b5a44', margin: '4px 0 10px' }
const otherGrid: CSSProperties = { display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }
const otherCard: CSSProperties = { minWidth: '105px', padding: '8px 12px', textDecoration: 'none', border: '1px solid #c8ad82', background: '#f2e8d6', color: '#304b36', borderRadius: '4px' }
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
