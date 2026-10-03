import OriginalEventsPage from './EventsPageOriginal'
import imageFixes from './events-image-corrections.module.css'

export const revalidate = 300

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function EventsPage({ searchParams }: { searchParams?: SearchParams }) {
  return (
    <div className={imageFixes.scope}>
      <OriginalEventsPage searchParams={searchParams} />
    </div>
  )
}
