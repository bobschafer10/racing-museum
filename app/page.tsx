import React from 'react'
import Link from 'next/link'
import HomeBase from './HomeBase'
import styles from './home.module.css'
import searchStyles from './homeSearchFix.module.css'

export const revalidate = 300

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

  // Research Center, Explore the Museum, then the Hall of Fame entrance.
  shellChildren.splice(2, 0, <HallOfFameHomeFeature key="hall-of-fame-home-feature" />)

  mainChildren[shellIndex] = React.cloneElement(shell, undefined, ...shellChildren)
  return React.cloneElement(original, undefined, ...mainChildren)
}
