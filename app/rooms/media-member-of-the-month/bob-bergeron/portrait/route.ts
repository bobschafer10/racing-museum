import { BOB_PORTRAIT } from '../bobPortrait'

export const dynamic = 'force-static'

export async function GET() {
  const encoded = BOB_PORTRAIT.includes(',') ? BOB_PORTRAIT.split(',', 2)[1] : BOB_PORTRAIT
  const bytes = Buffer.from(encoded, 'base64')

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
