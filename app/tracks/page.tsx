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

export default async function TracksPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; state?: string }>
}) {
  const params = (await searchParams) ?? {}
  const query = (params.q ?? '').trim()
  const state = (params.state ?? '').trim().toUpperCase()

  let supabaseQuery = supabase
  .from('track_directory_public_view')
  .select('*')
  .order('track_name', { ascending: true })
  .range(0, 4999)

if (state) {
  supabaseQuery = supabaseQuery.eq('state', state)
}

if (query) {
  supabaseQuery = supabaseQuery.ilike('track_name', `%${query}%`)
}

  const { data: tracks, error } = await supabaseQuery
  const trackRows: TrackRow[] = tracks ?? []

const featuredTrack =
  trackRows.length > 0
    ? trackRows[Math.floor(Math.random() * trackRows.length)]
    : null

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
        <input type="hidden" name="state" value={state} />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search tracks"
          style={searchInput}
        />
        <button type="submit" style={searchButton}>
          Search
        </button>
      </form>

      <div style={stateFilterWrap}>
        <Link
          href={query ? `/tracks?q=${encodeURIComponent(query)}` : '/tracks'}
          style={!state ? activeStateFilter : stateFilter}
        >
          All States
        </Link>

        <Link
          href={query ? `/tracks?state=WI&q=${encodeURIComponent(query)}` : '/tracks?state=WI'}
          style={state === 'WI' ? activeStateFilter : stateFilter}
        >
          Wisconsin
        </Link>

        <Link
          href={query ? `/tracks?state=MI&q=${encodeURIComponent(query)}` : '/tracks?state=MI'}
          style={state === 'MI' ? activeStateFilter : stateFilter}
        >
          Michigan
        </Link>

        <Link
          href={query ? `/tracks?state=MN&q=${encodeURIComponent(query)}` : '/tracks?state=MN'}
          style={state === 'MN' ? activeStateFilter : stateFilter}
        >
          Minnesota
        </Link>

        <Link
          href={query ? `/tracks?state=IL&q=${encodeURIComponent(query)}` : '/tracks?state=IL'}
          style={state === 'IL' ? activeStateFilter : stateFilter}
        >
          Illinois
        </Link>
      </div>

      <div style={resultsLine}>
        {query && state ? (
          <>
            Showing {trackRows.length} track{trackRows.length === 1 ? '' : 's'} for{' '}
            <strong>{query}</strong> in <strong>{state}</strong>
          </>
        ) : query ? (
          <>
            Showing {trackRows.length} result{trackRows.length === 1 ? '' : 's'} for{' '}
            <strong>{query}</strong>
          </>
        ) : state ? (
          <>
            Showing {trackRows.length} track{trackRows.length === 1 ? '' : 's'} in{' '}
            <strong>{state}</strong>
          </>
        ) : (
          <>
            Showing {trackRows.length} track{trackRows.length === 1 ? '' : 's'} in directory
          </>
        )}
      </div>
    </div>

    <div style={featureBox}>
      <div style={featureTitle}>Featured Track</div>

      {featuredTrack && (
  <>
    <div style={featureLogoWrap} className="track-logo-wrap-mobile">
  <TrackLogo
    slug={featuredTrack.slug}
    trackName={featuredTrack.track_name}
  />
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
      )}
    </div>
  </div>
</section>

      <section style={contentWrap}>
        {error ? (
          <div style={errorBox}>Unable to load tracks right now.</div>
        ) : trackRows.length === 0 ? (
          <div style={emptyBox}>No tracks found.</div>
        ) : (
          <div style={gridWrap}>
            {trackRows.map((t) => (
              <Link
                key={t.slug}
                href={`/tracks/${t.slug}`}
                style={trackCard}
              >
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
      </section>
    </main>
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
  borderBottom: '2px solid #b29364',
}

const heroInner: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '34px 20px 28px',
  display: 'grid',
  gridTemplateColumns: '1fr 420px',
  gap: '28px',
  alignItems: 'start',
}

const featureLogoWrap: CSSProperties = {
  height: '120px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#efe7d6',
  border: '1px solid #b29364',
  overflow: 'hidden',
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
  lineHeight: 1.6,
  maxWidth: '820px',
  margin: '0 0 20px',
}

const searchForm: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '12px',
}

const searchInput: CSSProperties = {
  minWidth: '320px',
  padding: '12px 14px',
  border: '2px solid #b29364',
  background: '#f6eddc',
  fontSize: '16px',
  color: '#2f2417',
}

const searchButton: CSSProperties = {
  padding: '12px 18px',
  background: '#7a5827',
  color: '#fff8ea',
  border: '2px solid #5d3f17',
  cursor: 'pointer',
  fontSize: '16px',
}

const resultsLine: CSSProperties = {
  fontSize: '16px',
  color: '#6a4a1f',
}

const featureBox: CSSProperties = {
  border: '2px solid #b29364',
  background: '#ddc8a2',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const featureTitle: CSSProperties = {
  fontSize: '14px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#7a5827',
}

const featureName: CSSProperties = {
  fontSize: '18px',
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
  background: '#7a5827',
  color: '#fff8ea',
  textDecoration: 'none',
  border: '1px solid #5d3f17',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '26px 20px 40px',
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

const stateFilterWrap: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '14px',
}

const stateFilter: CSSProperties = {
  display: 'inline-block',
  padding: '8px 12px',
  border: '1px solid #b29364',
  background: '#efe4cd',
  color: '#5a3a1b',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 600,
}

const activeStateFilter: CSSProperties = {
  display: 'inline-block',
  padding: '8px 12px',
  border: '1px solid #7a5827',
  background: '#d9c29a',
  color: '#3d2b16',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 700,
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
  height: '90px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#efe7d6',
  border: '1px solid #b29364',
  marginBottom: '12px',
  overflow: 'hidden',
  padding: '12px',
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
