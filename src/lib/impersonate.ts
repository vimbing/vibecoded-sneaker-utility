import type { HarEntry, HarHeader } from '@/types/har'

export interface BrowserProfile {
  name: string
  group: string
  headers: Record<string, string>
}

export const BROWSER_PROFILES: BrowserProfile[] = [
  // Chrome Windows
  {
    name: 'Chrome 143 / Win',
    group: 'Chrome',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua-mobile': '?0',
    },
  },
  {
    name: 'Chrome 143 / Mac',
    group: 'Chrome',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-mobile': '?0',
    },
  },
  {
    name: 'Chrome 142 / Win',
    group: 'Chrome',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Google Chrome";v="142", "Chromium";v="142", "Not A(Brand";v="24"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua-mobile': '?0',
    },
  },
  {
    name: 'Chrome 143 / Android',
    group: 'Chrome',
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-platform': '"Android"',
      'sec-ch-ua-mobile': '?1',
    },
  },
  // Firefox
  {
    name: 'Firefox 139 / Win',
    group: 'Firefox',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0',
    },
  },
  {
    name: 'Firefox 139 / Mac',
    group: 'Firefox',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0',
    },
  },
  // Safari
  {
    name: 'Safari 18.4 / Mac',
    group: 'Safari',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',
    },
  },
  {
    name: 'Safari / iPhone',
    group: 'Safari',
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
    },
  },
  // Edge
  {
    name: 'Edge 143 / Win',
    group: 'Edge',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
      'sec-ch-ua': '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua-mobile': '?0',
    },
  },
]

const IMPERSONATE_HEADERS = new Set([
  'user-agent',
  'sec-ch-ua',
  'sec-ch-ua-platform',
  'sec-ch-ua-mobile',
  'sec-ch-ua-full-version-list',
])

export function applyImpersonation(entry: HarEntry, profile: BrowserProfile | null): HarEntry {
  if (!profile) return entry

  const profileHeaders = profile.headers
  const newHeaders: HarHeader[] = []

  for (const h of entry.request.headers) {
    const lower = h.name.toLowerCase()
    if (IMPERSONATE_HEADERS.has(lower)) {
      if (lower in profileHeaders) {
        newHeaders.push({ name: h.name, value: profileHeaders[lower] })
      }
      // If the profile doesn't have this header (e.g. Firefox has no sec-ch-ua), drop it
    } else {
      newHeaders.push(h)
    }
  }

  // Add any profile headers that weren't in the original request
  const existingLower = new Set(newHeaders.map((h) => h.name.toLowerCase()))
  for (const [name, value] of Object.entries(profileHeaders)) {
    if (!existingLower.has(name)) {
      newHeaders.push({ name, value })
    }
  }

  return {
    ...entry,
    request: {
      ...entry.request,
      headers: newHeaders,
    },
  }
}
