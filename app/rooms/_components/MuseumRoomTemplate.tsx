'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './museum-room-template.module.css'

export type RoomResult = {
  position: number | null
  driver: string
  carNumber?: string | null
}

export type RoomYear = {
  id: string | number
  year: number
  winner: string
  dateLabel?: string
  image?: string | null
  imageAlt?: string
  imageCredit?: string | null
  cropPosition?: string
  preservedCount?: number
  topThree?: RoomResult[]
  raceStoryHref?: string | null
  winnerProfileHref?: string | null
}

export type RoomArtifact = {
  eyebrow: string
  title: string
  note: string
  image: string
  href: string
}

export type RoomStat = { value: string; label: string }

export type MuseumRoomTemplateProps = {
  roomNumber: string
  roomPath: string
  title: string
  titlePrefix?: string | null
  yearsLabel?: string | null
  lede: string
  logo?: string | null
  heroImage?: string | null
  watermarkImage?: string | null
  stats: RoomStat[]
  story: {
    kicker: string
    title: string
    body: string[]
    image?: string | null
    imageAlt?: string
    imageCredit?: string | null
  }
  yearTitle: string
  yearIntro: string
  years: RoomYear[]
  artifacts: RoomArtifact[]
  legacy: {
    kicker: string
    title: string
    body: string
  }
}

function downstreamLink(href: string, roomPath: string, year: number) {
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}returnTo=${encodeURIComponent(`${roomPath}#year-${year}`)}&returnLabel=${encodeURIComponent('Return to Museum Room')}`
}

export default function MuseumRoomTemplate({
  roomNumber,
  roomPath,
  title,
  titlePrefix,
  yearsLabel,
  lede,
  logo,
  heroImage,
  watermarkImage,
  stats,
  story,
  yearTitle,
  yearIntro,
  years,
  artifacts,
  legacy,
}: MuseumRoomTemplateProps) {
  const [selected, setSelected] = useState<RoomYear | null>(null)

  useEffect(() => {
    if (!selected) return
    const prior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prior
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selected])

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
      >
        <div className={styles.heroShade} />
        {watermarkImage ? (
          <img className={styles.watermark} src={watermarkImage} alt="" aria-hidden="true" />
        ) : null}
        <div className={styles.heroInner}>
          <div className={styles.topline}>
            <Link href="/rooms">Museum Rooms</Link>
            <span>Room {roomNumber}</span>
          </div>
          {logo ? <img className={styles.logo} src={logo} alt={titlePrefix || title} /> : null}
          {titlePrefix ? <div className={styles.titlePrefix}>{titlePrefix}</div> : null}
          <h1>{title}</h1>
          {yearsLabel ? <div className={styles.yearsLabel}>{yearsLabel}</div> : null}
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

      <nav className={styles.nav} aria-label={`${title} room sections`}>
        <a href="#story">The Story</a>
        <a href="#winner-wall">Winner Wall</a>
        <a href="#display-case">Display Case</a>
        <a href="#legacy">Legacy</a>
      </nav>

      <div className={styles.shell}>
        <section className={`${styles.story} ${story.image ? '' : styles.storyWithoutImage}`} id="story">
          <div className={styles.storyCopy}>
            <div className={styles.kicker}>{story.kicker}</div>
            <h2>{story.title}</h2>
            {story.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          {story.image ? (
            <figure className={styles.storyImage}>
              <img src={story.image} alt={story.imageAlt || story.title} />
              {story.imageCredit ? <figcaption>{story.imageCredit}</figcaption> : null}
            </figure>
          ) : null}
        </section>

        <section className={styles.yearSection} id="winner-wall">
          <header className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>The Record</div>
              <h2>{yearTitle}</h2>
            </div>
            <p>{yearIntro}</p>
          </header>

          <div className={styles.yearGrid}>
            {years.map((entry) => (
              <button
                type="button"
                className={styles.yearTile}
                id={`year-${entry.year}`}
                key={entry.id}
                onClick={() => setSelected(entry)}
                aria-label={`Open ${entry.year} ${entry.winner} exhibit`}
              >
                <span className={styles.yearVisual}>
                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt={entry.imageAlt || `${entry.winner}, ${entry.year}`}
                      style={{ objectPosition: entry.cropPosition || 'center center' }}
                    />
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
                  <small>{entry.image ? 'Open exhibit' : 'Record preserved'}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.displayCase} id="display-case">
          <header className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>Primary Sources</div>
              <h2>The Display Case</h2>
            </div>
            <p>Four representative artifacts lead into the deeper archive without turning the Room itself into a database grid.</p>
          </header>
          <div className={styles.artifactGrid}>
            {artifacts.slice(0, 4).map((artifact) => (
              <Link className={styles.artifact} href={artifact.href} key={`${artifact.href}-${artifact.title}`}>
                <span className={styles.artifactImage}><img src={artifact.image} alt={artifact.title} /></span>
                <span className={styles.artifactCopy}>
                  <small>{artifact.eyebrow}</small>
                  <strong>{artifact.title}</strong>
                  <p>{artifact.note}</p>
                  <b>Open artifact →</b>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.legacy} id="legacy">
          <div className={styles.kicker}>{legacy.kicker}</div>
          <h2>{legacy.title}</h2>
          <p>{legacy.body}</p>
          <Link href="/rooms">← Back to Museum Rooms</Link>
        </section>
      </div>

      {selected ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setSelected(null)} role="presentation">
          <article
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-year-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className={styles.modalClose} type="button" onClick={() => setSelected(null)} aria-label="Close exhibit">×</button>
            <div className={styles.modalVisual}>
              {selected.image ? (
                <img
                  src={selected.image}
                  alt={selected.imageAlt || `${selected.winner}, ${selected.year}`}
                  style={{ objectPosition: selected.cropPosition || 'center center' }}
                />
              ) : (
                <div className={styles.modalPlaque}><b>{selected.year}</b><span>Oktoberfest</span></div>
              )}
            </div>
            <div className={styles.modalBody}>
              <div className={styles.kicker}>{selected.dateLabel || selected.year}</div>
              <h2 id="room-year-title">{selected.year} • {selected.winner}</h2>
              {selected.imageCredit ? <p className={styles.credit}>{selected.imageCredit}</p> : null}
              {selected.preservedCount != null ? (
                <p className={styles.depth}>{selected.preservedCount} finishing positions preserved in the museum database.</p>
              ) : null}
              {selected.topThree?.length ? (
                <div className={styles.topThree}>
                  {selected.topThree.map((row) => (
                    <div key={`${row.position}-${row.driver}`}>
                      <b>{row.position}</b>
                      <span>{row.driver}</span>
                      {row.carNumber ? <small>#{row.carNumber}</small> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className={styles.modalLinks}>
                {selected.raceStoryHref ? (
                  <Link href={downstreamLink(selected.raceStoryHref, roomPath, selected.year)}>Read the race story →</Link>
                ) : null}
                {selected.winnerProfileHref ? (
                  <Link href={downstreamLink(selected.winnerProfileHref, roomPath, selected.year)}>Winner profile →</Link>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  )
}
