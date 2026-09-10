import Link from 'next/link'
import { getRacePrograms } from '@/lib/race-programs'
import { getNewspaperIssues } from '@/lib/newspapers'
import { supabase } from '@/lib/supabase'
import styles from './media-archive.module.css'

export const revalidate = 300

type FeaturedArtifact = {
  key: string
  href: string
  title: string
  meta: string
  image: string
}

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
        .in('slug', [
          'milwaukee-mile-wi',
          'rockford-speedway-il',
          'slinger-speedway-wi',
          'wisconsin-international-raceway-wi',
        ])
        .eq('photo_rank', 1),
    ])

  const photoCount = photoCountResponse.count || 0
  const photographerCount = photographerCountResponse.count || 0
  const programCount = programs.length
  const issueCount = issues.length
  const preservedPages =
    programs.reduce((sum, program) => sum + (program.images?.length || 0), 0) +
    issues.reduce((sum, issue) => sum + (issue.pages?.length || 0), 0)

  const heroPhotos = new Map(
    (heroPhotoResponse.data || []).map((row: any) => [row.slug, row.image_url]),
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

  const featuredArtifacts: FeaturedArtifact[] = [
    ...[...programs]
      .reverse()
      .filter((program) => Boolean(program.coverImage))
      .slice(0, 3)
      .map((program) => ({
        key: `program-${program.slug}`,
        href: `/media/race-programs/${program.slug}`,
        title: program.title,
        meta: `${program.year || 'Year unknown'} • Race program`,
        image: program.coverImage as string,
      })),
    ...[...issues]
      .reverse()
      .filter((issue) => Boolean(issue.coverImage))
      .slice(0, 3)
      .map((issue) => ({
        key: `issue-${issue.publicationSlug}-${issue.slug}`,
        href: `/media/newspapers/${issue.publicationSlug}/${issue.slug}`,
        title: issue.publication,
        meta: `${formatIssueDate(issue.issueDate)} • Newspaper`,
        image: issue.coverImage,
      })),
  ]

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
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>Museum Highlights</div>
                <h2 className={styles.sectionTitle}>FEATURED ARTIFACTS</h2>
              </div>
              <div className={styles.sectionNote}>
                A rotating look at preserved publications already available in the digital archive.
              </div>
            </div>

            <div className={styles.artifactGrid}>
              {featuredArtifacts.map((artifact) => (
                <Link key={artifact.key} href={artifact.href} className={styles.artifactCard}>
                  <div className={styles.artifactImageWrap}>
                    <img src={artifact.image} alt="" className={styles.artifactImage} />
                  </div>
                  <div className={styles.artifactBody}>
                    <div className={styles.artifactMeta}>{artifact.meta}</div>
                    <div className={styles.artifactTitle}>{artifact.title}</div>
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

function formatIssueDate(value?: string | null) {
  if (!value) return 'Date unknown'
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
