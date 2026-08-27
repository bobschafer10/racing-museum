import type { ReactNode } from 'react'

type CareerProfile = {
  summary?: string
  headlineChampionships: number
  championships: string[]
  seriesSuccess: string[]
  majorVictories: string[]
  note?: string
}

const CAREER_PROFILES: Record<string, CareerProfile> = {
  'dick-trickle': {
    summary: 'One of the most accomplished short-track stock car drivers in American racing history, with major success across ARTGO, ASA, national touring series, and marquee events beyond the museum’s core reporting area.',
    headlineChampionships: 10,
    championships: [
      '7× ARTGO Challenge Series Champion — 1977, 1979, 1980, 1983, 1984, 1985, 1987',
      '2× ASA National Tour Champion — 1984, 1985',
      '1982 World Series of Asphalt Super Late Model Champion',
    ],
    seriesSuccess: [
      '68 ARTGO Challenge Series wins',
      '32 ASA National Tour wins',
      '16 World Series of Asphalt Super Late Model wins',
      '6 ALL PRO Super Series wins',
      '6 NASCAR All-American Challenge wins',
      '2 NASCAR Southwest Tour wins',
    ],
    majorVictories: [
      '1983 World Crown 300 — Gresham Motorsports Park, Georgia',
      'Multiple major ASA, ARTGO, ALL PRO and national touring victories',
      'Career accomplishments span Wisconsin, the Midwest, the Southeast, Canada and national events',
    ],
    note: 'ARTGO events are already part of the museum’s complete ARTGO series archive and are referenced here rather than duplicated.',
  },
  'kevin-adams': {
    headlineChampionships: 4,
    championships: [
      'WISSOTA Modified Champion — 2008',
      'WISSOTA Modified Champion — 2011',
      'WISSOTA Modified Champion — 2014',
      'WISSOTA Modified Champion — 2015',
    ],
    seriesSuccess: [
      'Extensive WISSOTA Modified and Midwest Modified success',
      'Multiple Florida Modified Winternationals and Sunshine State victories',
      'Recorded wins in Wisconsin, Minnesota and Florida',
    ],
    majorVictories: [
      'Modified Winternationals victories at East Bay Raceway Park',
      'Sunshine State Modified / B-Mod Tour victories in Florida',
      'Minnesota Modified Nationals victory at Ogilvie Raceway',
    ],
  },
  'tom-reffner': {
    headlineChampionships: 2,
    championships: [
      'ARTGO Challenge Series Champion — 1975',
      'ARTGO Challenge Series Champion — 1978',
    ],
    seriesSuccess: [
      '15 recorded ARTGO Challenge Series wins in the museum archive',
      '68 ARTGO top-five finishes',
      'Major 1975 feature-win season with victories across the Midwest',
    ],
    majorVictories: [
      '1976 World Cup 400 — I-70 Speedway, Missouri',
      '1978 NASCAR Late Model Sportsman National Championship race win — Colorado Springs',
      '1975 outside-Wisconsin wins at I-70, Elko, Grundy County and Ohio tracks',
    ],
    note: 'The museum recognizes Reffner as the 1975 ARTGO champion even though the inaugural ARTGO season consisted of one race.',
  },
  'miles-melius': {
    headlineChampionships: 2,
    championships: [
      'Badger Midget Auto Racing Association Champion — 1949',
      'Badger Midget Auto Racing Association Champion — 1950',
    ],
    seriesSuccess: [
      'Extensive Midget, Late Model and Modified success across the Upper Midwest',
      'Museum-recorded victories in Wisconsin, Minnesota, Illinois and Michigan',
    ],
    majorVictories: [
      'Wins at Austin Fairgrounds, Rockford Speedway, Waukegan Speedway and Escanaba Speedway',
      'Known 1951 IMCA Stock Car Series top-five finish remains under event-level research',
    ],
  },
  'pete-parker': {
    headlineChampionships: 1,
    championships: [
      '1988 UMP Gold Series / Summer Nationals Champion',
    ],
    seriesSuccess: [
      'National Dirt Racing Association race winner',
      'Strong national and regional dirt Late Model record',
      'Top-five finishes in multiple major dirt Late Model events',
    ],
    majorVictories: [
      '1981 NDRA victory — Tri-City Speedway, Illinois',
      '1981 feature victory — Oskaloosa, Iowa',
      '1983 Silver 1000 winner — Proctor Speedway, Minnesota',
    ],
  },
  'rod-snellenberger': {
    headlineChampionships: 2,
    championships: [
      '2008 IMCA Stock Car National Champion',
      '2013 Badger Stock Car Tour Champion',
    ],
    seriesSuccess: [
      'Long-running IMCA Stock Car career with national and regional success',
      'Museum-recorded Badger Stock Car Tour championship already linked to series history',
    ],
    majorVictories: [
      '2026 Clash on the Coast victory — Northwest Florida Speedway',
      'Major IMCA Stock Car accomplishments across Wisconsin and beyond',
    ],
  },
  'bill-johnson-jr': {
    headlineChampionships: 0,
    championships: [],
    seriesSuccess: [
      'Extensive early Midget and Modified history already represented in museum results',
      'Outside-Wisconsin results include Illinois and Upper Michigan competition',
    ],
    majorVictories: [
      '1958 Rockford Speedway Midget victories',
      'Additional Rockford and regional results already preserved in museum race history',
    ],
    note: 'Most known broader career results for Johnson are already represented by existing museum race records.',
  },
  'terry-van-roy': {
    headlineChampionships: 0,
    championships: [],
    seriesSuccess: [
      'Career appears to be overwhelmingly Wisconsin-based based on the current museum and Third Turn audit',
    ],
    majorVictories: [],
    note: 'No verified outside-area accomplishment is being added at this time. This section can expand if additional documentation surfaces.',
  },
  'curt-myers': {
    headlineChampionships: 3,
    championships: [
      '2000 WISSOTA Street Stock Champion',
      '2015 FastLane Motorsports Northland Super Stock Series Champion',
      '2025 FastLane Motorsports Northland Super Stock Series Champion',
    ],
    seriesSuccess: [
      'Extensive WISSOTA and Northland Super Stock success',
      'Many Minnesota victories already preserved in museum race results',
    ],
    majorVictories: [
      'Wins at Proctor, Grand Rapids, Granite City, North Central and Princeton in Minnesota',
    ],
  },
  'benji-lacrosse': {
    headlineChampionships: 2,
    championships: [
      '2006 IMCA Modified National Champion',
      '2006 IMCA Modified North Central Region Champion',
    ],
    seriesSuccess: [
      'Major IMCA Modified championship and national-event résumé',
      'Repeated top-five finishes in marquee Iowa Modified events',
    ],
    majorVictories: [
      '2005 IMCA Super Nationals Modified winner — Boone Speedway',
      '2011 Night of 1,000 Stars winner — Hancock County Speedway',
      '2013 Night of 10,000 Stars winner — Hancock County Speedway',
      'Night of 10,000 Stars runner-up — 2014 and 2015',
    ],
  },
}

export function getDriverCareerProfile(slug: string) {
  return CAREER_PROFILES[slug] ?? null
}

export function DriverCareerAccomplishments({ slug }: { slug: string }) {
  const profile = getDriverCareerProfile(slug)
  if (!profile) return null

  const hasChampionships = profile.championships.length > 0
  const hasVictories = profile.majorVictories.length > 0

  return (
    <section style={{ margin: '4px 0 28px', border: '1px solid #b29364', background: '#efe2c8', boxShadow: '0 6px 18px rgba(73, 48, 21, 0.08)' }}>
      <div style={{ padding: '18px 20px 8px' }}>
        <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a632b', fontWeight: 700 }}>Documented Career History</div>
        <h2 style={{ fontSize: '30px', margin: '5px 0 8px', color: '#3d2b16' }}>Career Accomplishments</h2>
        {profile.summary && (
          <p style={{ margin: '0 0 10px', maxWidth: '980px', fontSize: '16px', lineHeight: 1.65, color: '#4a351e' }}>{profile.summary}</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', padding: '10px 16px 16px' }}>
        {hasChampionships && (
          <CareerCard title="Championships" icon="★">
            <CareerList items={profile.championships} />
          </CareerCard>
        )}

        <CareerCard title="Major Series Success" icon="◆">
          <CareerList items={profile.seriesSuccess} />
        </CareerCard>

        {hasVictories && (
          <CareerCard title="Selected Major Victories" icon="🏁">
            <CareerList items={profile.majorVictories} />
          </CareerCard>
        )}
      </div>

      {profile.note && (
        <div style={{ margin: '0 16px 16px', padding: '10px 12px', borderTop: '1px solid #c8aa79', fontSize: '13px', lineHeight: 1.55, color: '#6a5337', fontStyle: 'italic' }}>
          {profile.note}
        </div>
      )}
    </section>
  )
}

function CareerCard({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid #c2a97d', background: '#f5ead7', padding: '15px 16px', minHeight: '170px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 700, color: '#5b3a1b', marginBottom: '10px' }}>
        <span style={{ color: '#8a632b' }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function CareerList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '19px', color: '#3f2d18', fontSize: '14px', lineHeight: 1.55 }}>
      {items.map((item) => <li key={item} style={{ marginBottom: '6px' }}>{item}</li>)}
    </ul>
  )
}
