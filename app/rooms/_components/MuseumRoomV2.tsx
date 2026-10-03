'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import styles from './museum-room-v2.module.css'

export type MuseumRoomResult = {
  position: number | null
  driver: string
  carNumber?: string | null
}

export type MuseumRoomYear = {
  id: number | string
  year: number
  dateLabel?: string
  winner: string
  image?: string | null
  imageAlt?: string
  imageCrop?: {
    size: string
    position: string
  }
  imageCredit?: string
  preservedCount?: number
  topThree?: MuseumRoomResult[]
  raceStoryHref?: string | null
  winnerProfileHref?: string | null
}

export type MuseumRoomArtifact = {
  eyebrow: string
  title: string
  note: string
  image: string
  href: string
}

export type MuseumRoomStat = {
  value: string
  label: string
}

type MuseumRoomV2Props = {
  roomNumber: string
  roomPath: string
  title: string
  titlePrefix?: string
  yearsLabel: string
  lede: string
  heroImage: string
  logo?: string | null
  stats: MuseumRoomStat[]
  origin: {
    kicker: string
    title: string
    body: string[]
    image: string
    imageAlt: string
    imageCredit?: string
    links?: Array<{ label: string; href: string }>
  }
  yearEyebrow: string
  yearTitle: string
  yearIntro: string
  years: MuseumRoomYear[]
  artifacts: MuseumRoomArtifact[]
  artifactIntro: string
  archiveLinks: Array<{ label: string; href: string }>
  legacy: {
    kicker: string
    title: string
    body: string
    links?: Array<{ label: string; href: string }>
  }
}

function roomLink(href: string, roomPath: string, year: number) {
  const separator = href.includes('?') ? '&' : '?'
  const returnTo = encodeURIComponent(`${roomPath}#year-${year}`)
  const returnLabel = encodeURIComponent('Return to Museum Room')
  return `${href}${separator}returnTo=${returnTo}&returnLabel=${returnLabel}`
}

export default function MuseumRoomV2({
  roomNumber,
  roomPath,
  title,
  titlePrefix,
  yearsLabel,
  lede,
  heroImage,
  logo,
  stats,
  origin,
  yearEyebrow,
  yearTitle,
  yearIntro,
  years,
  artifacts,
  artifactIntro,
  archiveLinks,
  legacy,
}: MuseumRoomV2Props) {
  const [selectedYear, setSelectedYear] = useState<MuseumRoomYear | null>(null)

  const groups = useMemo(() => {
    const midpoint = Math.ceil(years.length / 2)
    return [years.slice(0, midpoint), years.slice(midpoint)]
  }, [years])

  useEffect(() => {
    if (!selectedYear) return
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedYear(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = priorOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedYear])

  return (
    <main className={styles.page}>
      <section className={styles.hero} style={{ backgroundImage: `url(${heroImage})` }}>
        <div className={styles.heroShade} />
        <div className={styles.heroInner}>
          <div className={styles.heroTopline}>
            <Link href="/rooms">Museum Rooms</Link>
            <span>Room {roomNumber}</span>
          </div>

          {logo ? <img src={logo} alt="" className={styles.logo} /> : null}
          {titlePrefix ? <div className={styles.titlePrefix}>{titlePrefix}</div> : null}
          <h1>{title}</h1>
          <div className={styles.yearsLabel}>{yearsLabel}</div>
          <p className={styles.lede}>{lede}</p>

          <div className={styles.stats}>
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className={styles.roomNav} aria-label={`${title} room sections`}>
        <a href="#story">The Story</a>
        <a href="#winner-wall">Winners Wall</a>
        <a href="#artifacts">Artifacts</a>
        <a href="#legacy">Legacy</a>
      </nav>

      <div className={styles.shell}>
        <section className={styles.story} id="story">
          <div className={styles.storyCopy}>
            <div className={styles.kicker}>{origin.kicker}</div>
            <h2>{origin.title}</h2>
            {origin.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {origin.links?.length ? (
              <div className={styles.inlineLinks}>
                {origin.links.map((link) => (
                  <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>
                    {link.label} ↗
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <figure className={styles.storyImage}>
            <img src={origin.image} alt={origin.imageAlt} />
            {origin.imageCredit ? <figcaption>{origin.imageCredit}</figcaption> : null}
          </figure>
        </section>

        <section className={styles.yearSection} id="winner-wall">
          <header className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>{yearEyebrow}</div>
              <h2>{yearTitle}</h2>
            </div>
            <p>{yearIntro}</p>
          </header>

          <div className={styles.wallGroups}>
            {groups.map((group, groupIndex) => (
              <div className={styles.wallGroup} key={groupIndex}>
                <div className={styles.wallGroupLabel}>
                  {group[0]?.year}–{group[group.length - 1]?.year}
                </div>
                <div className={styles.yearGrid}>
                  {group.map((entry) => (
                    <button
                      type="button"
                      className={styles.yearTile}
                      id={`year-${entry.year}`}
                      key={entry.id}
                      onClick={() => setSelectedYear(entry)}
                      aria-label={`Open ${entry.year} ${entry.winner} exhibit`}
                    >
                      <span className={styles.yearVisual}>
                        {entry.image ? (
                          entry.imageCrop ? (
                            <span
                              className={styles.yearCrop}
                              role="img"
                              aria-label={entry.imageAlt || `${entry.winner}, ${entry.year}`}
                              style={{
                                backgroundImage: `url(${entry.image})`,
                                backgroundSize: entry.imageCrop.size,
                                backgroundPosition: entry.imageCrop.position,
                              }}
                            />
                          ) : (
                            <img src={entry.image} alt={entry.imageAlt || `${entry.winner}, ${entry.year}`} />
                          )
                        ) : (
                          <span className={styles.yearPlaque}>
                            <b>{entry.year}</b>
                            <small>Oktoberfest</small>
                          </span>
                        )}
                        <span className={styles.yearShade} />
                        <span className={styles.yearNumber}>{entry.year}</span>
                      </span>
                      <span className={styles.yearCopy}>
                        <strong>{entry.winner}</strong>
                        <small>Open exhibit</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.artifactSection} id="artifacts">
          <header className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>Original Material</div>
              <h2>The Display Case</h2>
            </div>
            <p>{artifactIntro}</p>
          </header>

          <div className={styles.artifactGrid}>
            {artifacts.slice(0, 4).map((artifact) => (
              <Link href={artifact.href} className={styles.artifactCard} key={artifact.href}>
                <span className={styles.artifactImage}>
                  <img src={artifact.image} alt={artifact.title} />
                </span>
                <span className={styles.artifactBody}>
                  <small>{artifact.eyebrow}</small>
                  <strong>{artifact.title}</strong>
                  <p>{artifact.note}</p>
                  <b>Open artifact →</b>
                </span>
              </Link>
            ))}
          </div>

          <div className={styles.archiveRail}>
            <span>Continue into the archive</span>
            <div>
              {archiveLinks.map((link) => (
                <Link href={link.href} key={link.href}>{link.label} →</Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.legacy} id="legacy">
          <div>
            <div className={styles.kicker}>{legacy.kicker}</div>
            <h2>{legacy.title}</h2>
            <p>{legacy.body}</p>
          </div>
          {legacy.links?.length ? (
            <div className={styles.legacyLinks}>
              {legacy.links.map((link) => (
                <Link href={link.href} key={link.href}>{link.label} →</Link>
              ))}
            </div>
          ) : null}
        </section>

        <footer className={styles.footer}>
          <Link href="/rooms">← Back to Museum Rooms</Link>
          <span>Room {roomNumber}</span>
        </footer>
      </div>

      {selectedYear ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setSelectedYear(null)}>
          <article
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="museum-year-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className={styles.modalClose} onClick={() => setSelectedYear(null)} aria-label="Close exhibit">
              ×
            </button>

            <div className={styles.modalVisual}>
              {selectedYear.image ? (
                selectedYear.imageCrop ? (
                  <div
                    className={styles.modalCrop}
                    role="img"
                    aria-label={selectedYear.imageAlt || `${selectedYear.winner}, ${selectedYear.year}`}
                    style={{
                      backgroundImage: `url(${selectedYear.image})`,
                      backgroundSize: selectedYear.imageCrop.size,
                      backgroundPosition: selectedYear.imageCrop.position,
                    }}
                  />
                ) : (
                  <img src={selectedYear.image} alt={selectedYear.imageAlt || `${selectedYear.winner}, ${selectedYear.year}`} />
                )
              ) : (
                <div className={styles.modalPlaque}>
                  <strong>{selectedYear.year}</strong>
                  <span>Oktoberfest Champion</span>
                </div>
              )}
              {selectedYear.imageCredit ? <small>{selectedYear.imageCredit}</small> : null}
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalYear}>{selectedYear.year}</div>
              <h3 id="museum-year-title">{selectedYear.winner}</h3>
              {selectedYear.dateLabel ? <p className={styles.modalDate}>{selectedYear.dateLabel}</p> : null}

              {selectedYear.topThree?.length ? (
                <div className={styles.finishBlock}>
                  <span>Preserved top finishers</span>
                  {selectedYear.topThree.map((row) => (
                    <div key={`${row.position}-${row.driver}`}>
                      <b>{row.position || '—'}</b>
                      <strong>{row.driver}</strong>
                      <small>{row.carNumber ? `#${row.carNumber}` : ''}</small>
                    </div>
                  ))}
                  {selectedYear.preservedCount ? (
                    <em>{selectedYear.preservedCount} finishing positions preserved in the museum database</em>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.modalActions}>
                {selectedYear.raceStoryHref ? (
                  <Link href={roomLink(selectedYear.raceStoryHref, roomPath, selectedYear.year)} className={styles.primaryAction}>
                    Read the Full Race Story →
                  </Link>
                ) : null}
                {selectedYear.winnerProfileHref ? (
                  <Link href={roomLink(selectedYear.winnerProfileHref, roomPath, selectedYear.year)} className={styles.secondaryAction}>
                    Winner Profile →
                  </Link>
                ) : null}
              </div>

              <p className={styles.returnNote}>Both links return the visitor to this year in the Museum Room.</p>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  )
}
