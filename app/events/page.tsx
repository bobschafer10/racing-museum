import Link from 'next/link'
import OriginalEventsPage from './EventsPageOriginal'
import imageFixes from './events-image-corrections.module.css'

export const revalidate = 300

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function EventsPage({ searchParams }: { searchParams?: SearchParams }) {
  return (
    <div className={imageFixes.scope}>
      <div style={{background:'#0b0f12',borderBottom:'1px solid #343a3e',padding:'10px 22px',textAlign:'center',fontFamily:'Arial,Helvetica,sans-serif'}}>
        <Link href="/events/paul-bunyan-stampede" style={{color:'#f5f2e9',textDecoration:'none',fontSize:'12px',fontWeight:900,letterSpacing:'.08em',textTransform:'uppercase'}}>
          New Archive Addition — Paul Bunyan Stampede • Bemidji Speedway • October 3–4, 2026 →
        </Link>
      </div>
      <OriginalEventsPage searchParams={searchParams} />
    </div>
  )
}
