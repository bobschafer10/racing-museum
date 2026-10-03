'use client'

import { useEffect } from 'react'

const ROOM_PATH = '/rooms/oktoberfest-larry-wehrs'
const ROOM_LABEL = 'Return to Oktoberfest Museum Room'

// Best available MRN/CFRN race-story page for each Larry Wehrs-era Oktoberfest.
// 1970 currently uses the preserved MRN event page until a post-race MRN/CFRN recap is identified.
const raceStoryLinks: Record<number, string> = {
  1970: '/media/newspapers/midwest-racing-news/1970-10-01?sourcePage=4&q=Oktoberfest',
  1971: '/media/newspapers/midwest-racing-news/1971-10-07?sourcePage=1&q=Oktoberfest',
  1972: '/media/newspapers/checkered-flag-racing-news/1972-12-15?sourcePage=2&q=Oktoberfest',
  1973: '/media/newspapers/midwest-racing-news/1973-12-13?sourcePage=19&q=Oktoberfest',
  1974: '/media/newspapers/checkered-flag-racing-news/1974-12-11?sourcePage=7&q=Oktoberfest',
  1975: '/media/newspapers/checkered-flag-racing-news/1975-12-10?sourcePage=2&q=Oktoberfest',
  1976: '/media/newspapers/midwest-racing-news/1976-10-07?sourcePage=5&q=Oktoberfest',
  1977: '/media/newspapers/midwest-racing-news/1977-10-06?sourcePage=1&q=Oktoberfest',
  1978: '/media/newspapers/midwest-racing-news/1978-10-05?sourcePage=2&q=Oktoberfest',
  1979: '/media/newspapers/midwest-racing-news/1979-10-04?sourcePage=1&q=Oktoberfest',
  1980: '/media/newspapers/midwest-racing-news/1980-12-11?sourcePage=19&q=Oktoberfest',
  1981: '/media/newspapers/midwest-racing-news/1981-12-10?sourcePage=24&q=Oktoberfest',
  1982: '/media/newspapers/midwest-racing-news/1982-10-07?sourcePage=1&q=Oktoberfest',
  1983: '/media/newspapers/midwest-racing-news/1983-10-20?sourcePage=5&q=Oktoberfest',
  1984: '/media/newspapers/midwest-racing-news/1984-10-18?sourcePage=9&q=Oktoberfest',
  1985: '/media/newspapers/midwest-racing-news/1985-11-14?sourcePage=5&q=Oktoberfest',
  1986: '/media/newspapers/midwest-racing-news/1986-10-16?sourcePage=3&q=Oktoberfest',
}

function addRoomReturn(href: string, year: number) {
  const url = new URL(href, window.location.origin)
  url.searchParams.set('returnTo', `${ROOM_PATH}#year-${year}`)
  url.searchParams.set('returnLabel', ROOM_LABEL)
  return `${url.pathname}${url.search}${url.hash}`
}

export default function RoomPolish() {
  useEffect(() => {
    const yearSection = document.querySelector('#year-by-year')
    if (!yearSection) return

    const cards = Array.from(
      yearSection.querySelectorAll<HTMLElement>('article[id^="year-"]'),
    )

    for (const card of cards) {
      const year = Number(card.id.replace('year-', ''))
      if (!Number.isFinite(year)) continue

      const links = Array.from(card.querySelectorAll<HTMLAnchorElement>('a'))
      const fullRaceResult = links.find((link) =>
        link.textContent?.toLowerCase().includes('full race result'),
      )
      const winnerProfile = links.find((link) =>
        link.textContent?.toLowerCase().includes('winner profile'),
      )
      const periodCoverage = links.find((link) =>
        link.textContent?.toLowerCase().includes('period coverage'),
      )

      const storyHref = raceStoryLinks[year]
      if (fullRaceResult && storyHref) {
        fullRaceResult.setAttribute('href', addRoomReturn(storyHref, year))
        fullRaceResult.textContent = 'Full Race Result →'
        fullRaceResult.setAttribute(
          'aria-label',
          `Open the ${year} Oktoberfest MRN/CFRN race story`,
        )
      }

      if (winnerProfile) {
        const winnerHref = winnerProfile.getAttribute('href')
        if (winnerHref) {
          winnerProfile.setAttribute('href', addRoomReturn(winnerHref, year))
          winnerProfile.setAttribute(
            'aria-label',
            `Open the ${year} Oktoberfest winner profile`,
          )
        }
      }

      periodCoverage?.remove()
    }
  }, [])

  return null
}
