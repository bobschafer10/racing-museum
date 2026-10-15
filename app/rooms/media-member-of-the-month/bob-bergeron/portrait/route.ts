export const dynamic = 'force-static'

export async function GET(request: Request) {
  return Response.redirect(
    new URL('/photos/master/unknown-track/unknown-year/unknown-track_unknown-year_bob-bergeron_bob-bergeron_photo_444.jpg', request.url),
    307,
  )
}
