import type { ReactNode } from 'react'
import EventImageOverrides from './EventImageOverrides'

export default function EventsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EventImageOverrides />
      {children}
    </>
  )
}
