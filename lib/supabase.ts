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
  // Collapse identical concurrent public reads into one upstream request. This
  // prevents a page/build burst from sending the same Supabase query dozens of
  // times before the first response has had a chance to populate the cache.
  // eslint-disable-next-line no-var
  var __umarmSupabaseReadInFlight: Map<string, Promise<CachedResponse>> | undefined
}

const readCache = globalThis.__umarmSupabaseReadCache ?? new Map<string, CachedResponse>()
globalThis.__umarmSupabaseReadCache = readCache

const readInFlight = globalThis.__umarmSupabaseReadInFlight ?? new Map<string, Promise<CachedResponse>>()
globalThis.__umarmSupabaseReadInFlight = readInFlight

const REQUEST_TIMEOUT_MS = 8_000
const OCR_SEARCH_TIMEOUT_MS = 20_000
const PUBLIC_READ_REVALIDATE_SECONDS = 43_200
const PUBLIC_READ_REVALIDATE_MS = PUBLIC_READ_REVALIDATE_SECONDS * 1_000
const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1_000
const MAX_CACHE_BODY_BYTES = 250_000
const MAX_CACHE_ENTRIES = 750
const IS_RENDER = process.env.RENDER === 'true'

const homepageStatsFallback = {
  drivers_count: 32081,
  tracks_count: 275,
  events_count: 156706,
  results_count: 387088,
  photos_count: 33369,
}

function requestDetails(input: RequestInfo | URL, init?: RequestInit) {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : null
  const url = request?.url || String(input)
  const method = (init?.method || request?.method || 'GET').toUpperCase()
  const headers = new Headers(request?.headers || init?.headers)
  const accept = headers.get('accept') || ''
  const key = [
    method,
    url,
    accept,
    headers.get('range') || '',
    headers.get('prefer') || '',
  ].join('|')

  return { url, method, key, accept }
}

function responseFromSnapshot(snapshot: CachedResponse) {
  return new Response(snapshot.body, {
    status: snapshot.status,
    statusText: snapshot.statusText,
    headers: snapshot.headers,
  })
}

function cachedResponse(key: string, maxAgeMs = MAX_STALE_MS) {
  const cached = readCache.get(key)
  if (!cached) return null

  const ageMs = Date.now() - cached.savedAt
  if (ageMs > MAX_STALE_MS) {
    readCache.delete(key)
    return null
  }
  if (ageMs > maxAgeMs) return null

  return responseFromSnapshot(cached)
}

function rememberCachedResponse(key: string, snapshot: CachedResponse) {
  if (readCache.has(key)) readCache.delete(key)
  readCache.set(key, snapshot)

  while (readCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = readCache.keys().next().value as string | undefined
    if (!oldestKey) break
    readCache.delete(oldestKey)
  }
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

function renderQuarantineResponse(url: string, method: string, accept: string) {
  const seeded = seededHomepageStats(url)
  if (seeded) return seeded

  const wantsObject = accept.includes('application/vnd.pgrst.object')
  return new Response(method === 'HEAD' ? null : wantsObject ? '{}' : '[]', {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Range': '*/0',
      'X-UMARM-Data-Source': 'render-quarantine',
    },
  })
}

const resilientFetch: typeof fetch = async (input, init) => {
  const { url, method, key, accept } = requestDetails(input, init)
  const isPublicRestRead = method === 'GET' && url.includes('/rest/v1/')
  const isOcrSearchRpc = method === 'POST' && url.includes('/rest/v1/rpc/search_museum_ocr')
  const timeoutMs = isOcrSearchRpc ? OCR_SEARCH_TIMEOUT_MS : REQUEST_TIMEOUT_MS

  // The museum's authoritative public deployment is Vercel. A legacy Render
  // deployment is still connected to this repository and has been generating
  // extremely high Supabase traffic during builds/crawler visits. On Render only,
  // never fan public REST/RPC reads into the production database. The Render web
  // endpoint is redirected to the canonical Vercel site by proxy.ts.
  if (IS_RENDER && url.includes('/rest/v1/')) {
    return renderQuarantineResponse(url, method, accept)
  }

  const timeoutSignal = !init?.signal && typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(timeoutMs)
    : init?.signal

  // Public museum data is refreshed in 12-hour windows. Reusing successful
  // public REST reads across that window prevents crawlers and page refreshes
  // from repeatedly executing identical archive queries while still allowing
  // two scheduled refresh cycles per day. Explicit caller cache settings are preserved.
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

  if (isPublicRestRead) {
    // Do not rely only on the hosting platform's fetch cache. Keep a process-level
    // 12-hour cache as well so Render/Vercel workers do not repeatedly ask
    // Supabase for identical public data during page regeneration or crawler bursts.
    const fresh = cachedResponse(key, PUBLIC_READ_REVALIDATE_MS)
    if (fresh) return fresh

    // If the same URL is already being fetched, wait for that request instead of
    // starting another one. This is especially important for newspaper pagination,
    // where many pages can request the same 1,000-row slice at the same time.
    const existingRequest = readInFlight.get(key)
    if (existingRequest) {
      try {
        return responseFromSnapshot(await existingRequest)
      } catch (error) {
        const stale = cachedResponse(key)
        if (stale) return stale

        const seeded = seededHomepageStats(url)
        if (seeded) return seeded

        throw error
      }
    }

    const requestPromise = (async (): Promise<CachedResponse> => {
      const response = await fetch(input, fetchInit)
      const body = await response.text()
      const snapshot: CachedResponse = {
        body,
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        savedAt: Date.now(),
      }

      if (response.ok && body.length <= MAX_CACHE_BODY_BYTES) {
        rememberCachedResponse(key, snapshot)
      }

      return snapshot
    })()

    readInFlight.set(key, requestPromise)

    try {
      const snapshot = await requestPromise

      if (snapshot.status >= 500) {
        const stale = cachedResponse(key)
        if (stale) {
          console.warn(`[UMARM] Supabase REST ${snapshot.status}; serving last-known-good response for ${url}`)
          return stale
        }

        const seeded = seededHomepageStats(url)
        if (seeded) {
          console.warn(`[UMARM] Supabase REST ${snapshot.status}; serving seeded homepage stats`)
          return seeded
        }
      }

      return responseFromSnapshot(snapshot)
    } catch (error) {
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

      throw error
    } finally {
      // Only delete our own promise. A future request may already have installed
      // a replacement after this one completed.
      if (readInFlight.get(key) === requestPromise) readInFlight.delete(key)
    }
  }

  try {
    return await fetch(input, fetchInit)
  } catch (error) {
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
