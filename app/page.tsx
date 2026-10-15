import React from 'react'
import Link from 'next/link'
import HomeBase from './HomeBase'
import styles from './home.module.css'
import searchStyles from './homeSearchFix.module.css'

export const revalidate = 43200

function BobBergeronRoomFeature() {
  return (
    <section
      aria-labelledby="bob-bergeron-room-title"
      style={{
        margin: '0 0 28px',
        border: '1px solid #8a6b33',
        borderRadius: 6,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #17120d 0%, #0b0d10 58%, #1e1711 100%)',
        boxShadow: '0 10px 30px rgba(0,0,0,.28)',
      }}
    >
      <div
        style={{
          padding: '28px 30px 30px',
          display: 'grid',
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: '#d1a651',
            fontWeight: 700,
          }}
        >
          A New Room in the Museum
        </div>

        <div style={{ display: 'grid', gap: 5 }}>
          <div
            style={{
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              color: '#c8b28a',
            }}
          >
            Room 001 • Media Member of the Month
          </div>

          <h2
            id="bob-bergeron-room-title"
            style={{
              margin: 0,
              fontSize: 38,
              lineHeight: 1.05,
              color: '#f4ead7',
              fontWeight: 800,
            }}
          >
            Bob Bergeron
          </h2>
        </div>

        <p
          style={{
            margin: 0,
            maxWidth: 930,
            color: '#d9d2c6',
            lineHeight: 1.6,
            fontSize: 18,
          }}
        >
          Enter the inaugural Media Member of the Month room, bringing together Bob Bergeron&apos;s racing photography,
          newspaper work, track connections, and the museum&apos;s ongoing effort to identify the people preserved in his images.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 4,
          }}
        >
          <Link
            href="/rooms/media-member-of-the-month/bob-bergeron"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 18px',
              borderRadius: 4,
              background: '#c89b3c',
              color: '#111',
              fontWeight: 800,
              textDecoration: 'none',
              border: '1px solid #c89b3c',
            }}
          >
            Enter the Bob Bergeron Room →
          </Link>

          <Link
            href="/photos?photographer=bob-bergeron&driver=unknown-driver"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 18px',
              borderRadius: 4,
              background: 'transparent',
              color: '#f0dfb8',
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid #8a6b33',
            }}
          >
            Open Unidentified Driver Queue
          </Link>
        </div>
      </div>
    </section>
  )
}

function HallOfFameHomeFeature() {
  return (
    <section className={`${styles.section} hof-home-section`} aria-labelledby="hof-home-title">
      <Link href="/hall-of-fame" className="hof-home-card">
        <div className="hof-home-copy">
          <div className="hof-kicker">A New Room in the Museum</div>
          <h2 id="hof-home-title">Upper Midwest Auto Racing Museum Hall of Fame</h2>
          <p>
            A highly selective Hall honoring the competitors and contributors whose accomplishments,
            influence, and lasting impact helped define auto racing in the Upper Midwest.
          </p>
          <span className="hof-home-cta">Preview the Hall →</span>
        </div>

        <div className="hof-home-door-zone" aria-hidden="true">
          <div className="hof-home-door-sign">Hall of Fame</div>
          <div className="hof-home-door-sub">Legends deserve a place in racing history.</div>
          <div className="hof-tape hof-tape-home">
            Hall of Fame — Coming Soon • Hall of Fame — Coming Soon
          </div>
        </div>
      </Link>
    </section>
  )
}

function polishDriverSearch(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement(node)) return node

  const element = node as React.ReactElement<any>

  if (element.props.className === styles.searchForm) {
    const children = React.Children.toArray(element.props.children)
    const input = children.find(
      (child) => React.isValidElement(child) && child.type === 'input',
    ) as React.ReactElement<any> | undefined
    const button = children.find(
      (child) => React.isValidElement(child) && child.type === 'button',
    ) as React.ReactElement<any> | undefined

    return React.cloneElement(
      element,
      {
        className: `${styles.searchForm} ${searchStyles.form}`,
        'aria-label': 'Search the driver archive',
      },
      <label key="driver-search-label" className={searchStyles.label} htmlFor="home-driver-search">
        Search the Driver Archive
      </label>,
      input
        ? React.cloneElement(input, {
            key: 'driver-search-input',
            id: 'home-driver-search',
            className: `${input.props.className || ''} ${searchStyles.input}`.trim(),
          })
        : null,
      button
        ? React.cloneElement(button, {
            key: 'driver-search-button',
            className: `${button.props.className || ''} ${searchStyles.button}`.trim(),
          })
        : null,
    )
  }

  if (element.props.children == null) return element

  return React.cloneElement(
    element,
    undefined,
    React.Children.map(element.props.children, polishDriverSearch),
  )
}

export default async function Home() {
  const original = polishDriverSearch((await HomeBase()) as React.ReactElement<any>) as React.ReactElement<any>
  const mainChildren = React.Children.toArray(original.props.children)

  const shellIndex = mainChildren.findIndex(
    (child) => React.isValidElement(child) && (child as React.ReactElement<any>).props.className === styles.shell,
  )

  if (shellIndex === -1) return original

  const shell = mainChildren[shellIndex] as React.ReactElement<any>
  const shellChildren = React.Children.toArray(shell.props.children)

  shellChildren.unshift(<BobBergeronRoomFeature key="bob-bergeron-room-feature" />)

  // Research Center, Explore the Museum, then the Hall of Fame entrance.
  shellChildren.splice(2, 0, <HallOfFameHomeFeature key="hall-of-fame-home-feature" />)

  mainChildren[shellIndex] = React.cloneElement(shell, undefined, ...shellChildren)
  return React.cloneElement(original, undefined, ...mainChildren)
}
