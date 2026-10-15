import { BOB_PORTRAIT } from '../../../../../../rooms/media-member-of-the-month/bob-bergeron/bobPortrait'

export const dynamic = 'force-static'

export async function GET() {
  const encoded = BOB_PORTRAIT.includes(',') ? BOB_PORTRAIT.split(',', 2)[1] : BOB_PORTRAIT
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
