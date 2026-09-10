import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from './search.module.css'

export const revalidate = 0

type SearchParams = Promise<Record<string, string | string[] | undefined>>

type ArchiveSearchResult = {
  document_type: 'newspaper' | 'yearbook' | 'program'
  document_slug: string
  document_title: string
  publication_year: number | null
  issue_date: string | null
  page_label: string
  storage_path: string
  avg_confidence: number | null
  snippet: string | null
  rank: number
}

const SOURCE_OPTIONS = new Set(['newspaper', 'yearbook', 'program'])

export default async function DigitalArchiveSearchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const query = readParam(params.q).trim()
  const sourceParam = readParam(params.source)
  const source = SOURCE_OPTIONS.has(sourceParam) ? sourceParam : ''
  const yearParam = readParam(params.year)
  const parsedYear = /^\d{4}$/.test(yearParam) ? Number(yearParam) : null

  let results: ArchiveSearchResult[] = []
  let searchError = ''

  if (query) {
    const { data, error } = await supabase.rpc('search_museum_archive_with_snippets', {
      search_query: query,
      source_filter: source || null,
      year_filter: parsedYear,
      result_limit: 100,
    })

    if (error) {
      console.error('DIGITAL ARCHIVE SEARCH ERROR:', error)
      searchError = 'The archive search could not be completed. Please try again.'
    } else {
      results = (data || []) as ArchiveSearchResult[]
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.breadcrumbs}>
            <Link href="/">Home</Link><span>›</span><Link href="/media">Media Archive</Link><span>›</span><span>Search</span>
          </div>
          <div className={styles.eyebrow}>Museum Digital Archive</div>
          <h1 className={styles.title}>SEARCH THE ARCHIVE</h1>
          <p className={styles.lede}>
            Search OCR text across digitized racing newspapers, yearbooks, and race programs in one place.
            Results point to the original scanned page so the source can be reviewed directly.
          </p>

          <form className={styles.searchForm} action="/media/search" method="get">
            <label className={styles.queryField}>
              <span>Search words or phrase</span>
              <input
                name="q"
                defaultValue={query}
                placeholder='Try “Dick Trickle”, “Slinger”, or “ARTGO 1985”'
                autoFocus={!query}
              />
            </label>

            <label>
              <span>Source</span>
              <select name="source" defaultValue={source}>
                <option value="">All sources</option>
                <option value="newspaper">Newspapers</option>
                <option value="yearbook">Yearbooks</option>
                <option value="program">Programs</option>
              </select>
            </label>

            <label>
              <span>Year</span>
              <input
                name="year"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                defaultValue={parsedYear ?? ''}
                placeholder="All years"
              />
            </label>

            <button type="submit">Search Archive</button>
          </form>

          <div className={styles.searchTips}>
            Search supports normal words, quoted phrases, OR, and exclusions such as <code>Trickle -ASA</code>.
          </div>
        </div>
      </section>

      <section className={styles.content}>
        {!query ? (
          <div className={styles.welcomeGrid}>
            <ArchiveTypeCard
              title="Racing Newspapers"
              text="Search weekly reporting, race coverage, results, columns, advertisements, and period news."
              href="/media/search?source=newspaper"
            />
            <ArchiveTypeCard
              title="Yearbooks"
              text="Search season reviews, driver profiles, championship records, schedules, and historical summaries."
              href="/media/search?source=yearbook"
            />
            <ArchiveTypeCard
              title="Race Programs"
              text="Search race-night programs, entry lists, special-event material, advertising, and local racing history."
              href="/media/search?source=program"
            />
          </div>
        ) : (
          <>
            <div className={styles.resultsHeader}>
              <div>
                <div className={styles.kicker}>Search Results</div>
                <h2>{results.length === 100 ? '100+' : results.length} matching pages</h2>
              </div>
              <div className={styles.resultSummary}>
                <strong>“{query}”</strong>
                {source ? ` • ${sourceLabel(source)}` : ' • All sources'}
                {parsedYear ? ` • ${parsedYear}` : ''}
              </div>
            </div>

            {searchError ? <div className={styles.notice}>{searchError}</div> : null}

            {!searchError && results.length === 0 ? (
              <div className={styles.notice}>
                No OCR matches were found. Try fewer words, remove the year filter, or search all source types.
              </div>
            ) : null}

            <div className={styles.resultsList}>
              {results.map((result, index) => {
                const scanUrl = getScanUrl(result.storage_path)
                const archiveUrl = getArchiveUrl(result)
                const title = getDisplayTitle(result)

                return (
                  <article className={styles.resultCard} key={`${result.storage_path}-${index}`}>
                    <div className={styles.resultTopline}>
                      <span className={`${styles.badge} ${styles[result.document_type]}`}>
                        {sourceLabel(result.document_type)}
                      </span>
                      <span>{formatResultDate(result)}</span>
                      <span>{formatPageLabel(result.page_label)}</span>
                      {result.avg_confidence != null ? (
                        <span>{Math.round(Number(result.avg_confidence) * 100)}% OCR confidence</span>
                      ) : null}
                    </div>

                    <h3 className={styles.resultTitle}>{title}</h3>

                    {result.snippet ? (
                      <p className={styles.snippet}>{renderSnippet(result.snippet)}</p>
                    ) : null}

                    <div className={styles.resultActions}>
                      <a href={scanUrl} target="_blank" rel="noreferrer" className={styles.primaryAction}>
                        View Scanned Page ↗
                      </a>
                      <Link href={archiveUrl} className={styles.secondaryAction}>
                        Open {result.document_type === 'newspaper' ? 'Issue' : 'Publication'} →
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}

        <div className={styles.footerLinks}>
          <Link href="/media/newspapers">Browse Newspapers<span>Publication and year archive →</span></Link>
          <Link href="/media/race-programs">Browse Programs & Yearbooks<span>Printed racing archive →</span></Link>
          <Link href="/media">Media Archive<span>Return to archive home →</span></Link>
        </div>
      </section>
    </main>
  )
}

function ArchiveTypeCard({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Link href={href} className={styles.typeCard}>
      <div className={styles.kicker}>OCR Search</div>
      <h2>{title}</h2>
      <p>{text}</p>
      <span>Search this collection →</span>
    </Link>
  )
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function sourceLabel(source: string) {
  if (source === 'newspaper') return 'Newspaper'
  if (source === 'yearbook') return 'Yearbook'
  if (source === 'program') return 'Program'
  return source
}

function getDisplayTitle(result: ArchiveSearchResult) {
  if (result.document_type !== 'newspaper') return result.document_title
  return result.document_slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatResultDate(result: ArchiveSearchResult) {
  if (result.issue_date) {
    const [year, month, day] = result.issue_date.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  return result.publication_year ? String(result.publication_year) : 'Year unknown'
}

function formatPageLabel(label: string) {
  if (label === 'front-cover.jpg') return 'Front cover'
  if (label === 'back-cover.jpg') return 'Back cover'
  return label.replace(/\.(jpg|jpeg|png|webp)$/i, '').replace(/^0+/, 'Page ')
}

function getArchiveUrl(result: ArchiveSearchResult) {
  if (result.document_type === 'newspaper' && result.issue_date) {
    return `/media/newspapers/${result.document_slug}/${result.issue_date}`
  }
  return `/media/race-programs/${result.document_slug}`
}

function getScanUrl(storagePath: string) {
  return supabase.storage.from('media').getPublicUrl(storagePath).data.publicUrl
}

function renderSnippet(snippet: string) {
  return snippet.split(/(⟦[^⟧]+⟧)/g).map((part, index) => {
    if (part.startsWith('⟦') && part.endsWith('⟧')) {
      return <mark key={index}>{part.slice(1, -1)}</mark>
    }
    return part
  })
}
