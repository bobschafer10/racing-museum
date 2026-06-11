import Link from 'next/link'
import type { CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import SeriesLogo from './[slug]/SeriesLogo'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type SeriesRow = {
  slug: string
  series_name: string
  region?: string | null
  years_active?: string | null
  first_year?: number | null
  last_year?: number | null
  logo_url?: string | null
}

export default async function SeriesPage() {
  const { data: seriesRows, error } = await supabase
    .from('Series')
    .select('slug, series_name, region, years_active, first_year, last_year, logo_url, is_published')
    .eq('is_published', true)
    .order('series_name', { ascending: true })
    .limit(200)

  const rows: SeriesRow[] = seriesRows ?? []

  const featuredSeries =
    rows.length > 0 ? rows[Math.floor(Math.random() * rows.length)] : null

  const firstSeriesYear =
  rows
    .flatMap((s) => {
      const values = [
        s.first_year,
        s.last_year,
        s.years_active,
      ]

      return values
        .map((value) => String(value ?? '').match(/\d{4}/)?.[0])
        .filter(Boolean)
        .map(Number)
    })
    .filter((y): y is number => Number.isFinite(y))
    .sort((a, b) => a - b)[0] ?? 'TBD'
  const activeSeriesCount = rows.filter(
    (s) => !s.last_year || s.last_year >= 2020
  ).length

  return (
    <main style={pageStyle}>
      <section style={heroSection}>
        <div style={heroWatermark}>SERIES</div>

        <div style={heroInner}>
          <div style={heroGrid}>
            <div>
              <div style={eyebrow}>Museum Collection</div>
              <h1 style={pageTitle}>Series</h1>

              <p style={heroTagline}>
                Preserving the organizations, tours, and weekly divisions that shaped Midwestern racing.
              </p>

              <p style={pageIntro}>
                Browse racing series from across the Upper Midwest archive, including touring groups,
                weekly divisions, sanctioning bodies, and historic organizations.
              </p>

              <div style={archiveStatsRow}>
                <div style={archiveStatCard}>
                  <div style={archiveStatLabel}>Series Archived</div>
                  <div style={archiveStatValue}>{rows.length}</div>
                </div>

                <div style={archiveStatCard}>
                  <div style={archiveStatLabel}>Earliest Record</div>
                  <div style={archiveStatValue}>{firstSeriesYear}</div>
                </div>

                <div style={archiveStatCard}>
                  <div style={archiveStatLabel}>Modern / Active</div>
                  <div style={archiveStatValue}>{activeSeriesCount}</div>
                </div>
              </div>
            </div>

            {featuredSeries ? (
              <div style={featuredCard}>
                <div style={featuredLabel}>Featured Series</div>

                <div style={featuredLogoWrap}>
                  <SeriesLogo
                    slug={featuredSeries.slug}
                    seriesName={featuredSeries.series_name}
                  />
                </div>

                <div style={featuredBody}>
                  <div style={featuredName}>{featuredSeries.series_name}</div>

                  <div style={featuredMeta}>
                    {featuredSeries.region || 'Upper Midwest Archive'}
                    {featuredSeries.years_active ? ` • ${featuredSeries.years_active}` : ''}
                  </div>

                  <p style={featuredText}>
                    Explore season history, associated tracks, race records, and related archive material.
                  </p>

                  <Link
                    href={`/series/${featuredSeries.slug}`}
                    style={featuredButton}
                  >
                    Explore Series
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div style={archiveDivider}>Series Collection</div>

      <section style={contentWrap}>
        {error ? (
          <div style={errorBox}>Unable to load series right now.</div>
        ) : rows.length === 0 ? (
          <div style={emptyBox}>No series available yet.</div>
        ) : (
          <div style={gridWrap}>
            {rows.map((s) => (
              <Link key={s.slug} href={`/series/${s.slug}`} style={seriesCard}>
                <div style={seriesLogoWrap}>
                  <SeriesLogo slug={s.slug} seriesName={s.series_name} />
                </div>

                <div style={seriesNameStyle}>{s.series_name}</div>

                {(s.region || s.years_active) && (
                  <div style={seriesMetaStyle}>
                    {s.region || 'Region TBD'}
                    {s.region && s.years_active ? ' • ' : ''}
                    {s.years_active || ''}
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
  position: 'relative',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at 78% 18%, rgba(122,88,39,0.12), transparent 28%), linear-gradient(to bottom, #e7d9bf, #eadfc7)',
  borderBottom: '2px solid #b29364',
}

const heroWatermark: CSSProperties = {
  position: 'absolute',
  right: '-48px',
  top: '-24px',
  fontSize: '220px',
  fontWeight: 700,
  lineHeight: 1,
  color: 'rgba(90, 62, 29, 0.045)',
  pointerEvents: 'none',
  userSelect: 'none',
}

const heroInner: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '34px 20px 42px',
}

const heroGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.15fr) 380px',
  gap: '42px',
  alignItems: 'center',
}

const eyebrow: CSSProperties = {
  fontSize: '15px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '8px',
}

const pageTitle: CSSProperties = {
  fontSize: '56px',
  margin: '0 0 10px',
  color: '#3d2b16',
  lineHeight: 1.05,
}

const heroTagline: CSSProperties = {
  margin: '0 0 18px',
  fontSize: '24px',
  lineHeight: 1.4,
  fontStyle: 'italic',
  color: '#6f4d24',
  maxWidth: '760px',
}

const pageIntro: CSSProperties = {
  fontSize: '20px',
  lineHeight: 1.6,
  maxWidth: '820px',
  margin: 0,
}

const archiveStatsRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '14px',
  marginTop: '24px',
  maxWidth: '760px',
}

const archiveStatCard: CSSProperties = {
  background: 'rgba(239, 225, 199, 0.92)',
  border: '1px solid #b89b6d',
  padding: '18px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
}

const archiveStatLabel: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  marginBottom: '6px',
}

const archiveStatValue: CSSProperties = {
  fontSize: '36px',
  fontWeight: 700,
  color: '#3d2b16',
  lineHeight: 1.1,
}

const featuredCard: CSSProperties = {
  border: '1px solid #b29364',
  background: '#f4e8d0',
  boxShadow: '0 14px 28px rgba(40, 28, 14, 0.14)',
  transform: 'rotate(-1deg)',
  overflow: 'hidden',
}

const featuredLabel: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#7a5827',
  padding: '10px 14px 0',
}

const featuredLogoWrap: CSSProperties = {
  height: '170px',
  margin: '8px 14px 0',
  background: '#efe7d6',
  border: '1px solid #b29364',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const featuredBody: CSSProperties = {
  padding: '14px 16px 16px',
}

const featuredName: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#3d2b16',
  lineHeight: 1.1,
  marginBottom: '6px',
}

const featuredMeta: CSSProperties = {
  fontSize: '14px',
  color: '#6a4a1f',
  fontWeight: 700,
  marginBottom: '8px',
}

const featuredText: CSSProperties = {
  fontSize: '14px',
  lineHeight: 1.5,
  color: '#5a4630',
  margin: '0 0 12px',
}

const featuredButton: CSSProperties = {
  display: 'inline-block',
  background: '#7a5827',
  color: '#fff8ea',
  padding: '9px 12px',
  border: '1px solid #5d3f17',
  textDecoration: 'none',
  fontWeight: 700,
}

const archiveDivider: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '18px 20px 0',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#6b4a22',
  borderTop: '2px solid rgba(122,88,39,0.25)',
}

const contentWrap: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '28px 20px 40px',
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '16px',
}

const seriesCard: CSSProperties = {
  display: 'block',
  textDecoration: 'none',
  border: '2px solid #b29364',
  background: '#ddc8a2',
  padding: '10px',
  color: '#2f2417',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

const seriesLogoWrap: CSSProperties = {
  height: '160px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#efe7d6',
  border: '1px solid #b29364',
  marginBottom: '12px',
  overflow: 'hidden',
}

const seriesNameStyle: CSSProperties = {
  textAlign: 'center',
  fontWeight: 700,
  color: '#3d2b16',
  marginBottom: '4px',
  lineHeight: 1.2,
}

const seriesMetaStyle: CSSProperties = {
  textAlign: 'center',
  fontSize: '14px',
  color: '#5a3a1b',
}