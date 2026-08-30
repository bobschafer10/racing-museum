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

type StateCountRow = {
  state?: string | null
}

const primaryStates = [
  { code: 'WI', name: 'Wisconsin', color: '#536b3c' },
  { code: 'MN', name: 'Minnesota', color: '#2f6883' },
  { code: 'MI', name: 'Michigan', color: '#2f6883' },
  { code: 'IL', name: 'Illinois', color: '#b4533d' },
  { code: 'IN', name: 'Indiana', color: '#d89a24' },
]

const otherStateNames: Record<string, string> = {
  IA: 'Iowa',
  MO: 'Missouri',
  OH: 'Ohio',
  TN: 'Tennessee',
  CO: 'Colorado',
  KS: 'Kansas',
  ONT: 'Ontario',
}

export default async function TracksPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; state?: string }>
}) {
  const params = (await searchParams) ?? {}
  const query = (params.q ?? '').trim()
  const state = (params.state ?? '').trim().toUpperCase()
  const hasSelection = Boolean(state || query)

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

  let trackRows: TrackRow[] = []
  let error: { message?: string } | null = null

  if (hasSelection) {
    let tracksQuery = supabase
      .from('Tracks')
      .select('slug,track_name,city,state')
      .eq('is_published', true)
      .order('track_name', { ascending: true })
      .range(0, 999)

    if (state) tracksQuery = tracksQuery.eq('state', state)
    if (query) tracksQuery = tracksQuery.ilike('track_name', `%${query}%`)

    const result = await tracksQuery
    trackRows = (result.data ?? []) as TrackRow[]
    error = result.error
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
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search all tracks..."
                style={searchInput}
              />
              <button type="submit" style={searchButton}>
                Search
              </button>
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
                {(featuredTrack.city || featuredTrack.state) && (
                  <div style={featureMeta}>
                    {featuredTrack.city || ''}
                    {featuredTrack.city && featuredTrack.state ? ', ' : ''}
                    {featuredTrack.state || ''}
                  </div>
                )}
                <Link href={`/tracks/${featuredTrack.slug}`} style={featureButton}>
                  Explore Track
                </Link>
              </>
            ) : (
              <div style={featurePlaceholder}>Featured track coming soon.</div>
            )}
          </div>
        </div>
      </section>

      <section style={stateSection}>
        <div style={sectionHeading}>Select a State</div>
        <div style={sectionSubhead}>Click a state to explore its race tracks and venues.</div>

        <div style={stateGrid}>
          {primaryStates.map((item) => (
            <Link key={item.code} href={`/tracks?state=${item.code}`} style={stateCard}>
              <StateShape code={item.code} color={item.color} />
              <div style={stateName}>{item.name}</div>
              <div style={stateCount}>
                {stateCounts[item.code] ?? 0} Track{(stateCounts[item.code] ?? 0) === 1 ? '' : 's'}
              </div>
            </Link>
          ))}
        </div>

        {otherStates.length > 0 && (
          <div style={otherWrap}>
            <div style={otherTitle}>⌖ &nbsp; Other Tracks in the Archive</div>
            <div style={otherSubhead}>Tracks outside our primary region.</div>
            <div style={otherGrid}>
              {otherStates.map((item) => (
                <Link key={item.code} href={`/tracks?state=${item.code}`} style={otherCard}>
                  <div style={otherName}>{item.name}</div>
                  <div style={otherCount}>
                    {item.count} Track{item.count === 1 ? '' : 's'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section style={contentWrap}>
        {!hasSelection ? (
          <div style={browsePrompt}>
            Select a state above or search by track name. Track logos load only after you choose a
            state or run a search, keeping this page fast as the archive grows.
          </div>
        ) : error ? (
          <div style={errorBox}>Unable to load tracks right now.</div>
        ) : (
          <>
            <div style={resultsHeader}>
              <div>
                <div style={resultsTitle}>
                  {state ? `${stateLabel(state)} Tracks` : 'Track Search Results'}
                </div>
                <div style={resultsLine}>
                  {query && state ? (
                    <>
                      Showing {trackRows.length} track{trackRows.length === 1 ? '' : 's'} for{' '}
                      <strong>{query}</strong> in <strong>{stateLabel(state)}</strong>
                    </>
                  ) : query ? (
                    <>
                      Showing {trackRows.length} result{trackRows.length === 1 ? '' : 's'} for{' '}
                      <strong>{query}</strong>
                    </>
                  ) : (
                    <>
                      Showing {trackRows.length} track{trackRows.length === 1 ? '' : 's'} in{' '}
                      <strong>{stateLabel(state)}</strong>
                    </>
                  )}
                </div>
              </div>
              <Link href="/tracks" style={backButton}>
                Choose Another State
              </Link>
            </div>

            {trackRows.length === 0 ? (
              <div style={emptyBox}>No tracks found.</div>
            ) : (
              <div style={gridWrap}>
                {trackRows.map((t) => (
                  <Link key={t.slug} href={`/tracks/${t.slug}`} style={trackCard}>
                    <div style={trackLogoWrap} className="track-logo-wrap-mobile">
                      <TrackLogo slug={t.slug} trackName={t.track_name} />
                    </div>
                    <div style={trackNameStyle}>{t.track_name}</div>
                    {(t.city || t.state) && (
                      <div style={trackMetaStyle}>
                        {t.city || ''}
                        {t.city && t.state ? ', ' : ''}
                        {t.state || ''}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function stateLabel(code: string) {
  return primaryStates.find((item) => item.code === code)?.name ?? otherStateNames[code] ?? code
}

function StateShape({ code, color }: { code: string; color: string }) {
  const common = { fill: color, stroke: '#3d2b16', strokeWidth: 1.5, strokeLinejoin: 'round' as const }

  if (code === 'WI') {
    return (
      <svg viewBox="0 0 100 100" style={stateSvg} aria-hidden="true">
        <path {...common} d="M31 8 L54 10 L60 17 L71 18 L76 26 L70 33 L78 43 L72 55 L68 63 L61 72 L59 88 L42 90 L34 81 L27 73 L25 60 L18 50 L23 41 L21 30 L27 22 Z" />
        <path {...common} d="M74 31 L84 27 L82 36 L76 42 Z" />
      </svg>
    )
  }

  if (code === 'MN') {
    return (
      <svg viewBox="0 0 100 100" style={stateSvg} aria-hidden="true">
        <path {...common} d="M28 8 L57 8 L57 16 L73 15 L79 21 L70 28 L73 36 L67 44 L68 56 L62 63 L61 74 L68 87 L28 87 Z" />
      </svg>
    )
  }

  if (code === 'MI') {
    return (
      <svg viewBox="0 0 100 100" style={stateSvg} aria-hidden="true">
        <path {...common} d="M14 28 L24 17 L37 12 L50 15 L58 12 L71 18 L77 25 L68 30 L57 28 L48 33 L34 31 L27 35 Z" />
        <path {...common} d="M57 39 L70 35 L79 42 L81 55 L76 67 L68 77 L63 89 L51 86 L46 76 L49 66 L45 57 L50 47 Z" />
      </svg>
    )
  }

  if (code === 'IL') {
    return (
      <svg viewBox="0 0 100 100" style={stateSvg} aria-hidden="true">
        <path {...common} d="M38 8 L62 8 L63 20 L60 31 L66 42 L59 53 L61 64 L55 74 L50 90 L42 83 L38 70 L32 62 L36 51 L31 40 L36 29 Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 100 100" style={stateSvg} aria-hidden="true">
      <path {...common} d="M34 8 L67 8 L66 26 L68 42 L65 58 L67 73 L60 84 L49 91 L39 86 L35 70 L36 54 L33 38 Z" />
    </svg>
  )
}

const pageStyle: CSSProperties = {
  background: '#eadfc7',
  minHeight: '100vh',
  color: '#2f2417',
  fontFamily: 'Georgia, serif',
}

const heroSection: CSSProperties = {
  background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '1px solid #b29364',
}

const heroInner: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '34px 20px 28px',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 430px)',
  gap: '34px',
  alignItems: 'start',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const pageTitle: CSSProperties = {
  fontSize: '52px',
  margin: '0 0 10px',
  color: '#3d2b16',
}

const pageIntro: CSSProperties = {
  fontSize: '20px',
  lineHeight: 1.55,
  maxWidth: '720px',
  margin: '0 0 22px',
}

const searchForm: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
}

const searchInput: CSSProperties = {
  flex: '1 1 300px',
  minWidth: '220px',
  padding: '12px 14px',
  border: '2px solid #b29364',
  background: '#f6eddc',
  fontSize: '16px',
  color: '#2f2417',
}

const searchButton: CSSProperties = {
  padding: '12px 22px',
  background: '#4b3016',
  color: '#fff8ea',
  border: '2px solid #3c260f',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 700,
}

const featureBox: CSSProperties = {
  border: '2px solid #b29364',
  background: '#efe5d1',
  padding: '0 14px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '9px',
}

const featureTitle: CSSProperties = {
  fontSize: '15px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#7a5827',
  textAlign: 'center',
  borderBottom: '1px solid #b29364',
  padding: '11px 8px',
  fontWeight: 700,
}

const featureLogoWrap: CSSProperties = {
  height: '150px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f6eddc',
  overflow: 'hidden',
  padding: '10px',
}

const featureName: CSSProperties = {
  fontSize: '19px',
  fontWeight: 700,
  textAlign: 'center',
}

const featureMeta: CSSProperties = {
  fontSize: '14px',
  textAlign: 'center',
  color: '#5a3a1b',
}

const featureButton: CSSProperties = {
  textAlign: 'center',
  padding: '8px',
  background: '#4b3016',
  color: '#fff8ea',
  textDecoration: 'none',
  border: '1px solid #3c260f',
}

const featurePlaceholder: CSSProperties = {
  textAlign: 'center',
  padding: '34px 10px',
  color: '#6a4a1f',
}

const stateSection: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '20px 20px 18px',
}

const sectionHeading: CSSProperties = {
  textTransform: 'uppercase',
  fontWeight: 700,
  fontSize: '16px',
  color: '#5b3d1b',
  marginBottom: '5px',
}

const sectionSubhead: CSSProperties = {
  fontSize: '15px',
  color: '#5c4a35',
  marginBottom: '14px',
}

const stateGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(150px, 1fr))',
  gap: '20px',
}

const stateCard: CSSProperties = {
  minWidth: 0,
  textDecoration: 'none',
  color: '#2f2417',
  background: '#f0e6d3',
  border: '1px solid #c6ad82',
  borderRadius: '5px',
  padding: '12px 10px 14px',
  textAlign: 'center',
  boxShadow: '0 2px 7px rgba(68,46,18,0.08)',
}

const stateSvg: CSSProperties = {
  width: '100%',
  maxWidth: '145px',
  height: '135px',
  display: 'block',
  margin: '0 auto 4px',
}

const stateName: CSSProperties = {
  fontSize: '25px',
  fontWeight: 700,
  color: '#2f2417',
  lineHeight: 1.1,
}

const stateCount: CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  fontWeight: 700,
  marginTop: '8px',
}

const otherWrap: CSSProperties = {
  marginTop: '16px',
  borderTop: '1px solid #b29364',
  borderBottom: '1px solid #b29364',
  padding: '8px 0 14px',
  textAlign: 'center',
}

const otherTitle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#6a4a1f',
}

const otherSubhead: CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
  marginTop: '3px',
  color: '#5c4a35',
}

const otherGrid: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '12px',
  marginTop: '10px',
}

const otherCard: CSSProperties = {
  textDecoration: 'none',
  color: '#2f2417',
  border: '1px solid #c6ad82',
  background: '#f0e6d3',
  padding: '8px 18px',
  minWidth: '115px',
  borderRadius: '4px',
}

const otherName: CSSProperties = {
  fontWeight: 700,
  color: '#3f6548',
}

const otherCount: CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
  marginTop: '3px',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '10px 20px 42px',
}

const browsePrompt: CSSProperties = {
  padding: '15px 18px',
  background: '#e7d8bb',
  border: '1px solid #c2a97d',
  textAlign: 'center',
  color: '#5b4328',
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
}

const resultsHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'end',
  gap: '16px',
  flexWrap: 'wrap',
  borderTop: '1px solid #b29364',
  paddingTop: '18px',
  marginBottom: '18px',
}

const resultsTitle: CSSProperties = {
  fontSize: '25px',
  fontWeight: 700,
  color: '#3d2b16',
}

const resultsLine: CSSProperties = {
  fontSize: '14px',
  marginTop: '4px',
  color: '#6a4a1f',
  fontFamily: 'Arial, sans-serif',
}

const backButton: CSSProperties = {
  textDecoration: 'none',
  background: '#efe4cd',
  color: '#5a3a1b',
  border: '1px solid #b29364',
  padding: '8px 12px',
  fontSize: '13px',
  fontWeight: 700,
}

const errorBox: CSSProperties = {
  padding: '18px',
  background: '#f2d8d3',
  border: '1px solid #b36a5e',
}

const emptyBox: CSSProperties = {
  padding: '18px',
  background: '#f1e5ce',
  border: '1px solid #c2a97d',
}

const gridWrap: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '16px',
}

const trackCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  textDecoration: 'none',
  border: '2px solid #b29364',
  background: '#ddc8a2',
  padding: '12px',
  color: '#2f2417',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  height: '100%',
}

const trackLogoWrap: CSSProperties = {
  height: '92px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#efe7d6',
  border: '1px solid #b29364',
  marginBottom: '12px',
  overflow: 'hidden',
  padding: '8px',
}

const trackNameStyle: CSSProperties = {
  textAlign: 'center',
  fontWeight: 700,
  color: '#3d2b16',
  marginBottom: '6px',
  lineHeight: 1.2,
}

const trackMetaStyle: CSSProperties = {
  textAlign: 'center',
  fontSize: '14px',
  color: '#5a3a1b',
}
