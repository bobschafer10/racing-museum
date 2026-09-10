import { createClient } from '@supabase/supabase-js'

type CachedResponse = {
  body: string
  status: number
  statusText: string
  headers: [string, string][]
  savedAt: number
}

declare global {
  // Keep the last successful public REST responses in memory so a temporary
  // Supabase API/PostgREST outage does not blank the museum website.
  // eslint-disable-next-line no-var
  var __umarmSupabaseReadCache: Map<string, CachedResponse> | undefined
}

const readCache = globalThis.__umarmSupabaseReadCache ?? new Map<string, CachedResponse>()
globalThis.__umarmSupabaseReadCache = readCache

const REQUEST_TIMEOUT_MS = 8_000
const PUBLIC_READ_REVALIDATE_SECONDS = 60
const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1_000
const MAX_CACHE_BODY_BYTES = 2_000_000

const homepageStatsFallback = {
  drivers_count: 31907,
  tracks_count: 275,
  events_count: 156706,
  results_count: 387088,
  photos_count: 0,
}

function requestDetails(input: RequestInfo | URL, init?: RequestInit) {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : null
  const url = request?.url || String(input)
  const method = (init?.method || request?.method || 'GET').toUpperCase()
  const headers = new Headers(request?.headers || init?.headers)
  const key = [
    method,
    url,
    headers.get('accept') || '',
    headers.get('range') || '',
    headers.get('prefer') || '',
  ].join('|')

  return { url, method, key }
}

function cachedResponse(key: string) {
  const cached = readCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.savedAt > MAX_STALE_MS) {
    readCache.delete(key)
    return null
  }

  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: cached.headers,
  })
}

function seededHomepageStats(url: string) {
  if (!url.includes('/rest/v1/homepage_stats_view')) return null

  return new Response(JSON.stringify(homepageStatsFallback), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-UMARM-Data-Source': 'seeded-fallback',
    },
  })
}

const resilientFetch: typeof fetch = async (input, init) => {
  const { url, method, key } = requestDetails(input, init)
  const isPublicRestRead = method === 'GET' && url.includes('/rest/v1/')

  const timeoutSignal = !init?.signal && typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : init?.signal

  // Public museum data does not need to hit PostgREST on every visitor request.
  // A short shared Next.js data-cache window dramatically reduces repeated work
  // from crawlers and page refreshes while keeping newly imported data visible
  // within about a minute. Explicit caller cache settings are preserved.
  const fetchInit = {
    ...init,
    signal: timeoutSignal,
  } as RequestInit & { next?: { revalidate?: number } }

  if (isPublicRestRead && !init?.cache) {
    fetchInit.next = {
      ...(fetchInit.next || {}),
      revalidate: PUBLIC_READ_REVALIDATE_SECONDS,
    }
  } else if (!isPublicRestRead && !init?.cache) {
    fetchInit.cache = 'no-store'
  }

  try {
    const response = await fetch(input, fetchInit)

    if (isPublicRestRead && response.ok) {
      const clone = response.clone()
      const body = await clone.text()

      if (body.length <= MAX_CACHE_BODY_BYTES) {
        readCache.set(key, {
          body,
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          savedAt: Date.now(),
        })
      }
    }

    if (isPublicRestRead && response.status >= 500) {
      const stale = cachedResponse(key)
      if (stale) {
        console.warn(`[UMARM] Supabase REST ${response.status}; serving last-known-good response for ${url}`)
        return stale
      }

      const seeded = seededHomepageStats(url)
      if (seeded) {
        console.warn(`[UMARM] Supabase REST ${response.status}; serving seeded homepage stats`)
        return seeded
      }
    }

    return response
  } catch (error) {
    if (isPublicRestRead) {
      const stale = cachedResponse(key)
      if (stale) {
        console.warn(`[UMARM] Supabase REST unavailable; serving last-known-good response for ${url}`)
        return stale
      }

      const seeded = seededHomepageStats(url)
      if (seeded) {
        console.warn('[UMARM] Supabase REST unavailable; serving seeded homepage stats')
        return seeded
      }
    }

    throw error
  }
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: resilientFetch,
    },
  },
)
