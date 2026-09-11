import React from 'react'
import Link from 'next/link'
import HomeBase from './HomeBase'
import styles from './home.module.css'

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

export default async function Home() {
  const original = (await HomeBase()) as React.ReactElement<any>
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
