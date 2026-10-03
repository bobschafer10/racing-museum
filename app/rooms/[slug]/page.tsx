import PublishedMuseumRoom from '../_components/PublishedMuseumRoom'

export const revalidate = 300

export default async function MuseumRoomBySlug({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <PublishedMuseumRoom slug={slug} roomPath={`/rooms/${slug}`} />
}
