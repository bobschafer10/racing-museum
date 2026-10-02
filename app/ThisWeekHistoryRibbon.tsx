'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ThisWeekHistoryItem } from '@/lib/thisWeekHistory'
import styles from './home.module.css'

type Props = {
  items: ThisWeekHistoryItem[]
  weekLabel: string
}

export default function ThisWeekHistoryRibbon({ items, weekLabel }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || items.length < 2) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const getMeasurements = () => {
      const track = scroller.firstElementChild as HTMLElement | null
      if (!track || track.children.length <= items.length) return null

      const firstCard = track.children[0] as HTMLElement
      const secondCard = track.children[1] as HTMLElement | undefined
      const repeatedFirstCard = track.children[items.length] as HTMLElement

      const step = secondCard
        ? secondCard.offsetLeft - firstCard.offsetLeft
        : firstCard.offsetWidth

      const duplicateStart = repeatedFirstCard.offsetLeft - firstCard.offsetLeft

      return { step, duplicateStart }
    }

    const normalizeLoop = () => {
      const measurements = getMeasurements()
      if (!measurements) return

      const { duplicateStart } = measurements
      if (scroller.scrollLeft >= duplicateStart - 1) {
        scroller.scrollLeft -= duplicateStart
      }
    }

    const advance = () => {
      if (paused || scroller.scrollWidth <= scroller.clientWidth) return

      const measurements = getMeasurements()
      if (!measurements) return

      scroller.scrollBy({
        left: measurements.step,
        behavior: 'smooth',
      })
    }

    scroller.addEventListener('scroll', normalizeLoop, { passive: true })
    const interval = window.setInterval(advance, 5500)

    return () => {
      window.clearInterval(interval)
      scroller.removeEventListener('scroll', normalizeLoop)
    }
  }, [items.length, paused])

  if (!items.length) return null

  const repeated = [...items, ...items]

  const nudge = (direction: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const track = scroller.firstElementChild as HTMLElement | null
    const firstCard = track?.children[0] as HTMLElement | undefined
    const secondCard = track?.children[1] as HTMLElement | undefined
    const repeatedFirstCard = track?.children[items.length] as HTMLElement | undefined

    const step =
      firstCard && secondCard
        ? secondCard.offsetLeft - firstCard.offsetLeft
        : 296

    if (direction < 0 && scroller.scrollLeft <= 1 && firstCard && repeatedFirstCard) {
      const duplicateStart = repeatedFirstCard.offsetLeft - firstCard.offsetLeft
      scroller.scrollLeft = duplicateStart
    }

    scroller.scrollBy({
      left: direction * step,
      behavior: 'smooth',
    })
  }

  return (
    <section className={styles.historyRibbon} aria-labelledby="this-week-history-title">
      <div className={styles.historyRibbonInner}>
        <div className={styles.historyRibbonIntro}>
          <div className={styles.historyRibbonKicker}>From the Museum Archive</div>
          <Link href="/this-week-in-history" className={styles.historyRibbonTitle} id="this-week-history-title">
            This Week in Upper Midwest Auto Racing History
          </Link>
          <div className={styles.historyRibbonWeek}>{weekLabel}</div>
        </div>

        <div className={styles.historyRibbonRail}>
          <button
            type="button"
            className={styles.historyRibbonArrow}
            onClick={() => nudge(-1)}
            aria-label="See earlier history stories"
          >
            ‹
          </button>

          <div
            ref={scrollerRef}
            className={styles.historyRibbonScroller}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            aria-label="Scrolling racing history stories"
          >
            <div className={styles.historyRibbonTrack}>
              {repeated.map((item, index) => (
                <Link
                  key={`${item.race_date}-${item.track_name}-${item.driver_name}-${index}`}
                  href={item.href}
                  className={styles.historyRibbonCard}
                >
                  <span className={styles.historyRibbonDate}>{item.dateLabel}</span>
                  <span className={styles.historyRibbonStory}>{item.story}</span>
                  <span className={styles.historyRibbonCta}>View result →</span>
                </Link>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.historyRibbonArrow}
            onClick={() => nudge(1)}
            aria-label="See later history stories"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  )
}
