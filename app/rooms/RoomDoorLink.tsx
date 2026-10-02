'use client'

import type { MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './rooms.module.css'

export default function RoomDoorLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()
  const [entering, setEntering] = useState(false)

  function enterRoom(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }

    event.preventDefault()
    if (entering) return
    setEntering(true)

    window.setTimeout(() => {
      router.push(href)
    }, 820)
  }

  return (
    <>
      <a href={href} className={className} onClick={enterRoom}>
        {children}
      </a>

      {entering ? (
        <div className={styles.doorTransition} aria-hidden="true">
          <div className={styles.doorReveal}>
            <div className={styles.doorRevealShade} />
            <img
              src="/logos/series/oktoberfest-race-weekend.jpg"
              alt=""
              className={styles.doorRevealLogo}
            />
            <div className={styles.doorRevealCopy}>
              <span>Museum Room 001</span>
              <strong>Oktoberfest Race Weekend</strong>
              <small>The Larry Wehrs Years • 1970–1986</small>
            </div>
          </div>
          <div className={[styles.doorPanel, styles.doorPanelLeft].join(' ')}>
            <div className={styles.doorInset} />
          </div>
          <div className={[styles.doorPanel, styles.doorPanelRight].join(' ')}>
            <div className={styles.doorInset} />
          </div>
        </div>
      ) : null}
    </>
  )
}
