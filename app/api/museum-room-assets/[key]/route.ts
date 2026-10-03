const ROOM_ASSETS: Record<string, string> = {
  'oktoberfest-room001-winner-sprite': '/rooms/oktoberfest/room001-winner-sprite.jpg',
  'oktoberfest-larry-wehrs-watermark': '/rooms/oktoberfest/larry-wehrs-watermark.jpg',
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params
  const path = ROOM_ASSETS[key]

  if (!path) {
    return new Response('Museum asset not found', { status: 404 })
  }

  return Response.redirect(new URL(path, request.url), 307)
}
