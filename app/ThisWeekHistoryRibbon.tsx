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

    let frame = 0
    let previous = performance.now()

    const tick = (now: number) => {
      const elapsed = Math.min(50, now - previous)
      previous = now

      if (!paused && scroller.scrollWidth > scroller.clientWidth) {
        scroller.scrollLeft += elapsed * 0.026

        const halfway = scroller.scrollWidth / 2
        if (scroller.scrollLeft >= halfway) {
          scroller.scrollLeft -= halfway
        }
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [items.length, paused])

  if (!items.length) return null

  const repeated = [...items, ...items]

  const nudge = (direction: number) => {
    scrollerRef.current?.scrollBy({
      left: direction * 380,
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
