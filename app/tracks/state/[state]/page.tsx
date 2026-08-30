import Link from 'next/link'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TrackLogo from '../../[slug]/TrackLogo'

type TrackRow = {
  slug: string
  track_name: string
  city?: string | null
  state?: string | null
}

const stateNames: Record<string, string> = {
  WI: 'Wisconsin', MN: 'Minnesota', MI: 'Michigan', IL: 'Illinois', IN: 'Indiana',
  IA: 'Iowa', MO: 'Missouri', OH: 'Ohio', TN: 'Tennessee', CO: 'Colorado', KS: 'Kansas', ONT: 'Ontario',
}

export default async function StateTracksPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: rawState } = await params
  const state = rawState.toUpperCase()
  const stateName = stateNames[state]
  if (!stateName) notFound()

  const { data, error } = await supabase
    .from('Tracks')
    .select('slug,track_name,city,state')
    .eq('is_published', true)
    .eq('state', state)
    .order('track_name', { ascending: true })
    .range(0, 999)

  const tracks = (data ?? []) as TrackRow[]

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroInner}>
          <div>
            <div style={eyebrow}>Track Directory</div>
            <h1 style={pageTitle}>{stateName} Tracks</h1>
            <p style={pageIntro}>Browse race tracks, speedways, fairgrounds, and historic racing venues in {stateName}.</p>
          </div>
          <Link href="/tracks" style={backButton}>← Back to Track Map</Link>
        </div>
      </section>

      <section style={contentWrap}>
        <div style={resultsLine}>{tracks.length} Track{tracks.length === 1 ? '' : 's'} in {stateName}</div>
        {error ? (
          <div style={errorBox}>Unable to load tracks right now.</div>
        ) : tracks.length === 0 ? (
          <div style={emptyBox}>No tracks found.</div>
        ) : (
          <div style={gridWrap}>
            {tracks.map((t) => (
              <Link key={t.slug} href={`/tracks/${t.slug}`} style={trackCard}>
                <div style={trackLogoWrap} className="track-logo-wrap-mobile">
                  <TrackLogo slug={t.slug} trackName={t.track_name} />
                </div>
                <div style={trackNameStyle}>{t.track_name}</div>
                <div style={trackMetaStyle}>{t.city || ''}{t.city && t.state ? ', ' : ''}{t.state || ''}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = { background: '#eadfc7', minHeight: '100vh', color: '#2f2417', fontFamily: 'Georgia, serif' }
const heroSection: CSSProperties = { background: 'linear-gradient(to bottom, #e7d9bf, #eadfc7)', borderBottom: '1px solid #b29364' }
const heroInner: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '34px 20px 26px', display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'end' }
const eyebrow: CSSProperties = { fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7a5827', marginBottom: '8px' }
const pageTitle: CSSProperties = { fontSize: '46px', margin: '0 0 8px', color: '#3d2b16' }
const pageIntro: CSSProperties = { fontSize: '18px', lineHeight: 1.5, margin: 0, maxWidth: '760px' }
const backButton: CSSProperties = { textDecoration: 'none', color: '#5a3a1b', border: '1px solid #b29364', background: '#efe4cd', padding: '10px 14px', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap' }
const contentWrap: CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 42px' }
const resultsLine: CSSProperties = { fontSize: '15px', color: '#6a4a1f', marginBottom: '16px' }
const errorBox: CSSProperties = { padding: '18px', background: '#f2d8d3', border: '1px solid #b36a5e' }
const emptyBox: CSSProperties = { padding: '18px', background: '#f1e5ce', border: '1px solid #c2a97d' }
const gridWrap: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }
const trackCard: CSSProperties = { display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '2px solid #b29364', background: '#ddc8a2', padding: '12px', color: '#2f2417', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: '100%' }
const trackLogoWrap: CSSProperties = { height: '100px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#efe7d6', border: '1px solid #b29364', marginBottom: '12px', overflow: 'hidden', padding: '8px' }
const trackNameStyle: CSSProperties = { textAlign: 'center', fontWeight: 700, color: '#3d2b16', marginBottom: '6px', lineHeight: 1.2, fontSize: '17px' }
const trackMetaStyle: CSSProperties = { textAlign: 'center', fontSize: '14px', color: '#5a3a1b' }
