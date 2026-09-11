import Link from 'next/link'
import { getRacePrograms, type RaceProgram } from '@/lib/race-programs'
import { getNewspaperIssues, type NewspaperIssue } from '@/lib/newspapers'
import { supabase } from '@/lib/supabase'
import styles from './media-archive.module.css'

export const revalidate = 300

type FeaturedArtifact = {
  key: string
  href: string
  title: string
  meta: string
  image: string
  badge: string
  source: 'program' | 'newspaper' | 'photo'
  familyKey: string
  trackKey?: string
  decade?: number
  contain?: boolean
}

const FEATURED_PHOTO_TRACKS = [
  { slug: 'milwaukee-mile-wi', name: 'Milwaukee Mile' },
  { slug: 'rockford-speedway-il', name: 'Rockford Speedway' },
  { slug: 'slinger-speedway-wi', name: 'Slinger Speedway' },
  { slug: 'wisconsin-international-raceway-wi', name: 'Wisconsin International Raceway' },
]

export default async function MediaArchivePage() {
  const [programs, issues, photoCountResponse, photographerCountResponse, heroPhotoResponse] =
    await Promise.all([
      getRacePrograms(),
      getNewspaperIssues(),
      supabase.from('photos').select('photo_id', { count: 'exact', head: true }),
      supabase
        .from('photographer_directory_view')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('track_hero_photo_variants_view')
        .select('slug,image_url')
        .in(
          'slug',
          FEATURED_PHOTO_TRACKS.map((track) => track.slug),
        )
        .eq('photo_rank', 1),
    ])

  const photoCount = photoCountResponse.count || 0
  const photographerCount = photographerCountResponse.count || 0
  const programCount = programs.length
  const issueCount = issues.length
  const preservedPages =
    programs.reduce((sum, program) => sum + (program.images?.length || 0), 0) +
    issues.reduce((sum, issue) => sum + (issue.pages?.length || 0), 0)

  const heroPhotos = new Map<string, string>(
    (heroPhotoResponse.data || [])
      .filter((row: any) => Boolean(row.slug && row.image_url))
      .map((row: any) => [String(row.slug), String(row.image_url)]),
  )

  const heroImage =
    heroPhotos.get('milwaukee-mile-wi') ||
    heroPhotos.get('rockford-speedway-il') ||
    heroPhotos.get('slinger-speedway-wi') ||
    ''

  const programCover = [...programs]
    .reverse()
    .find((program) => Boolean(program.coverImage))?.coverImage

  const newspaperCover = [...issues]
    .reverse()
    .find((issue) => Boolean(issue.coverImage))?.coverImage

  const collections = [
    {
      key: 'photos',
      href: '/photos',
      kicker: 'Museum Photo Collection',
      title: 'Photo Archive',
      text: 'Browse racing photography tied directly to drivers, tracks, years, and photographers throughout the museum.',
      metric: `${photoCount.toLocaleString()} photographs`,
      image: heroPhotos.get('slinger-speedway-wi') || heroImage,
      contain: false,
      action: 'Browse photos →',
    },
    {
      key: 'programs',
      href: '/media/race-programs',
      kicker: 'Printed Racing History',
      title: 'Race Programs & Yearbooks',
      text: 'Original race-night programs, yearbooks, souvenir publications, and special-event books preserved page by page.',
      metric: `${programCount.toLocaleString()} publications`,
      image: programCover || heroImage,
      contain: true,
      action: 'Browse programs →',
    },
    {
      key: 'newspapers',
      href: '/media/newspapers',
      kicker: 'OCR / Newspaper Archive',
      title: 'Racing Newspapers',
      text: 'Digitized issues and original racing coverage that document results, personalities, controversies, and weekly race life.',
      metric: `${issueCount.toLocaleString()} issues`,
      image: newspaperCover || heroImage,
      contain: true,
      action: 'Browse newspapers →',
    },
    {
      key: 'photographers',
      href: '/photographers',
      kicker: 'Through the Lens',
      title: 'Photographer Archive',
      text: 'Follow the photographers whose collections preserve the cars, people, tracks, and moments behind the statistics.',
      metric: `${photographerCount.toLocaleString()} photographers`,
      image: heroPhotos.get('rockford-speedway-il') || heroImage,
      contain: false,
      action: 'Browse photographers →',
    },
  ]

  const dailySeed = hashString(new Date().toISOString().slice(0, 10))
  const programArtifacts = programs
    .filter((program) => Boolean(program.coverImage))
    .map(programToArtifact)
  const issueArtifacts = issues
    .filter((issue) => Boolean(issue.coverImage))
    .map(issueToArtifact)
  const photoArtifacts = FEATURED_PHOTO_TRACKS.flatMap((track) => {
    const image = heroPhotos.get(track.slug)
    if (!image) return []

    return [
      {
        key: `photo-${track.slug}`,
        href: `/photos?track=${encodeURIComponent(track.slug)}`,
        title: track.name,
        meta: 'Museum photograph • Track archive',
        image,
        badge: 'Photograph',
        source: 'photo' as const,
        familyKey: 'photograph',
        trackKey: track.slug,
        contain: false,
      },
    ]
  })

  const issuePicks = pickDiverseIssues(issueArtifacts, 2, dailySeed)
  const issueDecades = new Set(
    issuePicks
      .map((artifact) => artifact.decade)
      .filter((decade): decade is number => typeof decade === 'number'),
  )
  const programPicks = pickDiversePrograms(programArtifacts, 2, dailySeed + 101, issueDecades)
  const usedTrackKeys = new Set(
    programPicks
      .map((artifact) => artifact.trackKey)
      .filter((trackKey): trackKey is string => Boolean(trackKey)),
  )
  const photoPick =
    rotate(photoArtifacts, dailySeed + 211).find(
      (artifact) => !artifact.trackKey || !usedTrackKeys.has(artifact.trackKey),
    ) || rotate(photoArtifacts, dailySeed + 211)[0]

  const featuredArtifacts = fillFeaturedArtifacts(
    [
      programPicks[0],
      issuePicks[0],
      programPicks[1],
      photoPick,
      issuePicks[1],
    ].filter((artifact): artifact is FeaturedArtifact => Boolean(artifact)),
    [...programArtifacts, ...issueArtifacts, ...photoArtifacts],
    dailySeed + 313,
  )

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div
          className={styles.heroBackground}
          style={heroImage ? { backgroundImage: `url("${heroImage}")` } : undefined}
        />
        <div className={styles.heroShade} />
        <div className={styles.heroTexture} />

        <div className={styles.heroInner}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.eyebrow}>Upper Midwest Media Archive</div>
              <h1 className={styles.title}>MEDIA ARCHIVE</h1>
              <div className={styles.subtitle}>EXPLORE THE MATERIAL THAT SURROUNDED RACE NIGHT</div>
              <p className={styles.intro}>
                Racing history is more than finishing positions. Explore photographs, race programs,
                yearbooks, newspapers, and the photographers who preserved the people and places of
                Upper Midwest auto racing.
              </p>
            </div>

            <div className={styles.heroScript}>
              History Lives
              <br />
              Beyond Results
              <span />
            </div>
          </div>

          <div className={styles.stats}>
            <Stat value={photoCount.toLocaleString()} label="Racing photographs" />
            <Stat value={programCount.toLocaleString()} label="Programs & yearbooks" />
            <Stat value={issueCount.toLocaleString()} label="Newspaper issues" />
            <Stat value={preservedPages.toLocaleString()} label="Printed pages preserved" />
            <Stat value={photographerCount.toLocaleString()} label="Photographers indexed" />
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>Browse the Collection</div>
              <h2 className={styles.sectionTitle}>EXPLORE MEDIA HISTORY</h2>
            </div>
            <div className={styles.sectionNote}>
              Every artifact is another doorway back into the drivers, tracks, series, and events
              documented throughout the museum.
            </div>
          </div>

          <div className={styles.collectionGrid}>
            {collections.map((collection) => (
              <Link key={collection.key} href={collection.href} className={styles.collectionCard}>
                {collection.image ? (
                  <img
                    src={collection.image}
                    alt=""
                    className={`${styles.collectionImage} ${
                      collection.contain ? styles.collectionImageContain : ''
                    }`}
                  />
                ) : null}
                <div className={styles.collectionShade} />
                <div className={styles.collectionBody}>
                  <div className={styles.cardKicker}>{collection.kicker}</div>
                  <h3 className={styles.collectionTitle}>{collection.title}</h3>
                  <p className={styles.collectionText}>{collection.text}</p>
                  <div className={styles.collectionFooter}>
                    <span className={styles.collectionMetric}>{collection.metric}</span>
                    <span className={styles.collectionAction}>{collection.action}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {featuredArtifacts.length > 0 ? (
          <section className={`${styles.section} ${styles.artifactSection}`}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>Museum Highlights</div>
                <h2 className={styles.sectionTitle}>FEATURED ARTIFACTS</h2>
              </div>
              <div className={styles.artifactHeaderNote}>
                <div className={styles.sectionNote}>
                  A rotating look at programs, newspapers, photographs, and other racing history
                  preserved in the digital archive.
                </div>
                <div className={styles.rotationNote}>Diversity-balanced selection • refreshes daily</div>
              </div>
            </div>

            <div className={styles.artifactGrid}>
              {featuredArtifacts.map((artifact) => (
                <Link key={artifact.key} href={artifact.href} className={styles.artifactCard}>
                  <div className={styles.artifactImageWrap}>
                    <div className={styles.artifactBadge}>{artifact.badge}</div>
                    <img
                      src={artifact.image}
                      alt=""
                      className={`${styles.artifactImage} ${
                        artifact.contain ? styles.artifactImageContain : ''
                      }`}
                    />
                  </div>
                  <div className={styles.artifactBody}>
                    <div className={styles.artifactMeta}>{artifact.meta}</div>
                    <div className={styles.artifactTitle}>{artifact.title}</div>
                    <div className={styles.artifactAction}>Explore artifact →</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>Research Pathways</div>
              <h2 className={styles.sectionTitle}>GO DEEPER INTO THE ARCHIVE</h2>
            </div>
          </div>

          <div className={styles.pathwayGrid}>
            <Link href="/photos" className={styles.pathway}>
              <div className={styles.miniLabel}>01 • Photography</div>
              <div className={styles.pathwayTitle}>Search the Complete Photo Archive</div>
              <p className={styles.pathwayText}>
                Move beyond featured images and browse the museum's full connected racing-photo collection.
              </p>
              <span className={styles.pathwayLink}>Browse photos →</span>
            </Link>

            <Link href="/media/posters" className={styles.pathway}>
              <div className={styles.miniLabel}>02 • Visual Ephemera</div>
              <div className={styles.pathwayTitle}>Special Event Posters</div>
              <p className={styles.pathwayText}>
                Promotional posters and race-night artwork are the next visual-media collection being organized.
              </p>
              <span className={styles.pathwayLink}>View collection →</span>
            </Link>

            <Link href="/stats/feature-winners" className={`${styles.pathway} ${styles.pathwayAccent}`}>
              <div className={styles.miniLabel}>03 • Research Center</div>
              <div className={styles.pathwayTitle}>Connect Media to Museum Research</div>
              <p className={styles.pathwayText}>
                Follow preserved media back into driver histories, track records, feature winners, and race results.
              </p>
              <span className={styles.pathwayLink}>Open Research Center →</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}

function programToArtifact(program: RaceProgram): FeaturedArtifact {
  const year = numericYear(program.year)
  const typeLabel = titleCase(program.type || 'Race program')
  const trackKey =
    program.track_slug ||
    slugKey(program.track) ||
    program.series_slug ||
    slugKey(program.series) ||
    slugKey(program.title) ||
    program.slug

  return {
    key: `program-${program.slug}`,
    href: `/media/race-programs/${program.slug}`,
    title: program.title,
    meta: `${year || 'Year unknown'} • ${typeLabel}`,
    image: program.coverImage as string,
    badge: typeLabel,
    source: 'program',
    familyKey: 'program',
    trackKey,
    decade: year ? Math.floor(year / 10) * 10 : undefined,
    contain: true,
  }
}

function issueToArtifact(issue: NewspaperIssue): FeaturedArtifact {
  return {
    key: `issue-${issue.publicationSlug}-${issue.slug}`,
    href: `/media/newspapers/${issue.publicationSlug}/${issue.slug}`,
    title: issue.publication,
    meta: `${formatIssueDate(issue.issueDate)} • Newspaper`,
    image: issue.coverImage,
    badge: issue.publication,
    source: 'newspaper',
    familyKey: issue.publicationSlug,
    decade: issue.year ? Math.floor(issue.year / 10) * 10 : undefined,
    contain: true,
  }
}

function pickDiversePrograms(
  artifacts: FeaturedArtifact[],
  count: number,
  seed: number,
  blockedDecades: Set<number>,
) {
  const candidates = rotate(artifacts, seed)
  const selected: FeaturedArtifact[] = []
  const usedTracks = new Set<string>()
  const usedDecades = new Set(blockedDecades)

  const passes = [
    (artifact: FeaturedArtifact) =>
      Boolean(artifact.trackKey) &&
      !usedTracks.has(artifact.trackKey as string) &&
      typeof artifact.decade === 'number' &&
      !usedDecades.has(artifact.decade),
    (artifact: FeaturedArtifact) =>
      Boolean(artifact.trackKey) && !usedTracks.has(artifact.trackKey as string),
    (_artifact: FeaturedArtifact) => true,
  ]

  for (const pass of passes) {
    for (const artifact of candidates) {
      if (selected.length >= count) break
      if (selected.some((item) => item.key === artifact.key) || !pass(artifact)) continue

      selected.push(artifact)
      if (artifact.trackKey) usedTracks.add(artifact.trackKey)
      if (typeof artifact.decade === 'number') usedDecades.add(artifact.decade)
    }

    if (selected.length >= count) break
  }

  return selected
}

function pickDiverseIssues(artifacts: FeaturedArtifact[], count: number, seed: number) {
  const candidates = rotate(artifacts, seed)
  const selected: FeaturedArtifact[] = []
  const publicationCounts = new Map<string, number>()

  for (const family of rotate(Array.from(new Set(candidates.map((artifact) => artifact.familyKey))), seed + 17)) {
    if (selected.length >= count) break
    const artifact = candidates.find((candidate) => candidate.familyKey === family)
    if (!artifact) continue

    selected.push(artifact)
    publicationCounts.set(family, 1)
  }

  for (const artifact of candidates) {
    if (selected.length >= count) break
    if (selected.some((item) => item.key === artifact.key)) continue

    const familyCount = publicationCounts.get(artifact.familyKey) || 0
    if (familyCount >= 2) continue

    selected.push(artifact)
    publicationCounts.set(artifact.familyKey, familyCount + 1)
  }

  return selected
}

function fillFeaturedArtifacts(
  initial: FeaturedArtifact[],
  candidates: FeaturedArtifact[],
  seed: number,
) {
  const selected = [...initial]
  const orderedCandidates = rotate(candidates, seed)
  const usedKeys = new Set(selected.map((artifact) => artifact.key))
  const usedTracks = new Set(
    selected
      .map((artifact) => artifact.trackKey)
      .filter((trackKey): trackKey is string => Boolean(trackKey)),
  )
  const usedDecades = new Set(
    selected
      .map((artifact) => artifact.decade)
      .filter((decade): decade is number => typeof decade === 'number'),
  )
  const sourceCounts = countBy(selected, (artifact) => artifact.source)
  const familyCounts = countBy(
    selected.filter((artifact) => artifact.source === 'newspaper'),
    (artifact) => artifact.familyKey,
  )

  const addCandidate = (artifact: FeaturedArtifact, preferNewDecade: boolean) => {
    if (usedKeys.has(artifact.key)) return false
    if (artifact.trackKey && usedTracks.has(artifact.trackKey)) return false
    if ((sourceCounts.get(artifact.source) || 0) >= sourceLimit(artifact.source)) return false
    if (
      artifact.source === 'newspaper' &&
      (familyCounts.get(artifact.familyKey) || 0) >= 2
    ) {
      return false
    }
    if (
      preferNewDecade &&
      typeof artifact.decade === 'number' &&
      usedDecades.has(artifact.decade)
    ) {
      return false
    }

    selected.push(artifact)
    usedKeys.add(artifact.key)
    if (artifact.trackKey) usedTracks.add(artifact.trackKey)
    if (typeof artifact.decade === 'number') usedDecades.add(artifact.decade)
    sourceCounts.set(artifact.source, (sourceCounts.get(artifact.source) || 0) + 1)
    if (artifact.source === 'newspaper') {
      familyCounts.set(artifact.familyKey, (familyCounts.get(artifact.familyKey) || 0) + 1)
    }
    return true
  }

  for (const preferNewDecade of [true, false]) {
    for (const artifact of orderedCandidates) {
      if (selected.length >= 6) break
      addCandidate(artifact, preferNewDecade)
    }
    if (selected.length >= 6) break
  }

  if (selected.length < 6) {
    for (const artifact of orderedCandidates) {
      if (selected.length >= 6) break
      if (usedKeys.has(artifact.key)) continue

      selected.push(artifact)
      usedKeys.add(artifact.key)
    }
  }

  return selected.slice(0, 6)
}

function sourceLimit(source: FeaturedArtifact['source']) {
  if (source === 'photo') return 1
  return 3
}

function countBy<T>(items: T[], keyFor: (item: T) => string) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = keyFor(item)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

function rotate<T>(items: T[], seed: number) {
  if (items.length === 0) return []
  const offset = Math.abs(seed) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function numericYear(value: number | string | null | undefined) {
  const year = Number(value)
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null
  return year
}

function slugKey(value?: string | null) {
  if (!value) return null
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatIssueDate(value?: string | null) {
  if (!value) return 'Date unknown'
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
