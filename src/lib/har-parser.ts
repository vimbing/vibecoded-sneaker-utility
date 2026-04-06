import { unzipSync, strFromU8 } from 'fflate'
import type { HarEntry, HarFile, HarHeader, HarTimings } from '@/types/har'

export interface ParseResult {
  entries: HarEntry[]
  hosts: string[]
}

export function parseFile(text: string): ParseResult {
  const parsed = JSON.parse(text)

  // Detect format: HAR has log.entries, proxy format is a top-level array
  if (parsed?.log?.entries && Array.isArray(parsed.log.entries)) {
    return parseHar(parsed as HarFile)
  }

  if (Array.isArray(parsed)) {
    return parseProxyCapture(parsed)
  }

  throw new Error('Unknown format: expected HAR file or proxy capture JSON array')
}

export function parseChlzFile(buffer: ArrayBuffer): ParseResult {
  const data = new Uint8Array(buffer)
  const files = unzipSync(data)

  // Collect entry indices from filenames like "0-meta.json", "1-meta.json", etc.
  const metaFiles = Object.keys(files)
    .filter((name) => name.endsWith('-meta.json'))
    .sort((a, b) => {
      const ai = parseInt(a.split('-')[0])
      const bi = parseInt(b.split('-')[0])
      return ai - bi
    })

  const proxyEntries: ProxyEntry[] = metaFiles.map((metaName) => {
    const idx = metaName.split('-')[0]
    const meta = JSON.parse(strFromU8(files[metaName])) as ProxyEntry

    // Attach request body from N-req.json or N-req.dat
    const reqJsonKey = `${idx}-req.json`
    const reqDatKey = `${idx}-req.dat`
    if (files[reqJsonKey] && files[reqJsonKey].length > 0) {
      const text = strFromU8(files[reqJsonKey])
      if (!meta.request.body) meta.request.body = { text, charset: null }
      else meta.request.body.text = text
    } else if (files[reqDatKey] && files[reqDatKey].length > 0) {
      const text = strFromU8(files[reqDatKey])
      if (!meta.request.body) meta.request.body = { text, charset: null }
      else meta.request.body.text = text
    }

    // Attach response body from N-res.json or N-res.dat
    const resJsonKey = `${idx}-res.json`
    const resDatKey = `${idx}-res.dat`
    if (files[resJsonKey] && files[resJsonKey].length > 0) {
      const text = strFromU8(files[resJsonKey])
      if (!meta.response.body) meta.response.body = { text, charset: null }
      else meta.response.body.text = text
    } else if (files[resDatKey] && files[resDatKey].length > 0) {
      const text = strFromU8(files[resDatKey])
      if (!meta.response.body) meta.response.body = { text, charset: null }
      else meta.response.body.text = text
    }

    return meta
  })

  return parseProxyCapture(proxyEntries)
}

function extractHosts(entries: HarEntry[]): string[] {
  const hostSet = new Set<string>()
  for (const entry of entries) {
    try {
      hostSet.add(new URL(entry.request.url).host)
    } catch { /* skip */ }
  }
  return Array.from(hostSet).sort()
}

function parseHar(har: HarFile): ParseResult {
  if (!Array.isArray(har.log.entries)) {
    throw new Error('Invalid HAR file: missing log.entries')
  }

  const entries = har.log.entries.slice().sort(
    (a, b) => new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime()
  )

  return { entries, hosts: extractHosts(entries) }
}

// --- Proxy capture format (Proxyman / Charles-style JSON array) ---

interface ProxyEntry {
  status?: string
  method: string
  protocolVersion?: string
  scheme: string
  host: string
  actualPort?: number
  path: string
  query?: string | null
  remoteAddress?: string
  times?: {
    start?: string
    requestBegin?: string
    requestComplete?: string
    responseBegin?: string
    end?: string
  }
  durations?: {
    dns?: number
    connect?: number
    ssl?: number
  }
  totalSize?: string | number
  request: {
    sizes?: { body?: string | number; headers?: number }
    mimeType?: string
    header: {
      firstLine?: string
      headers: Array<{ name: string; value: string }>
    }
    body?: {
      text?: string
      charset?: string | null
    }
  }
  response: {
    sizes?: { body?: string | number; headers?: number }
    mimeType?: string
    contentEncoding?: string | null
    header: {
      firstLine?: string
      headers: Array<{ name: string; value: string }>
    }
    body?: {
      text?: string
      charset?: string | null
    }
  }
}

function parseStatusFromFirstLine(firstLine?: string): { status: number; statusText: string } {
  if (!firstLine) return { status: 0, statusText: '' }
  // e.g. "HTTP/1.1 400 Bad Request"
  const match = firstLine.match(/HTTP\/[\d.]+ (\d+)\s*(.*)/)
  if (match) {
    return { status: parseInt(match[1], 10), statusText: match[2] || '' }
  }
  return { status: 0, statusText: '' }
}

function proxyToHarEntry(p: ProxyEntry): HarEntry {
  const port = p.actualPort && p.actualPort !== 443 && p.actualPort !== 80
    ? `:${p.actualPort}` : ''
  const url = `${p.scheme}://${p.host}${port}${p.path}${p.query ? '?' + p.query : ''}`

  const { status, statusText } = parseStatusFromFirstLine(p.response.header.firstLine)

  const startedDateTime = p.times?.start || new Date().toISOString()

  // Compute total time from times if available
  let time = 0
  if (p.times?.start && p.times?.end) {
    time = new Date(p.times.end).getTime() - new Date(p.times.start).getTime()
  }

  const timings: HarTimings = {
    blocked: -1,
    dns: p.durations?.dns ?? -1,
    connect: p.durations?.connect ?? -1,
    ssl: p.durations?.ssl ?? -1,
    send: -1,
    wait: -1,
    receive: -1,
  }

  // Try to compute send/wait/receive from times
  if (p.times?.requestBegin && p.times?.requestComplete) {
    timings.send = new Date(p.times.requestComplete).getTime() - new Date(p.times.requestBegin).getTime()
  }
  if (p.times?.requestComplete && p.times?.responseBegin) {
    timings.wait = new Date(p.times.responseBegin).getTime() - new Date(p.times.requestComplete).getTime()
  }
  if (p.times?.responseBegin && p.times?.end) {
    timings.receive = new Date(p.times.end).getTime() - new Date(p.times.responseBegin).getTime()
  }

  const reqHeaders: HarHeader[] = p.request.header.headers.map((h) => ({
    name: h.name,
    value: h.value,
  }))

  const resHeaders: HarHeader[] = p.response.header.headers.map((h) => ({
    name: h.name,
    value: h.value,
  }))

  // Extract cookies from request headers
  const cookieHeader = reqHeaders.find((h) => h.name.toLowerCase() === 'cookie')
  const reqCookies = cookieHeader
    ? cookieHeader.value.split(';').map((c) => {
        const [name, ...rest] = c.trim().split('=')
        return { name: name || '', value: rest.join('=') }
      })
    : []

  // Extract set-cookie from response headers
  const resCookies = resHeaders
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => {
      const [nameVal] = h.value.split(';')
      const [name, ...rest] = (nameVal || '').split('=')
      return { name: name || '', value: rest.join('=') }
    })

  // Extract query params from URL
  let queryString: Array<{ name: string; value: string }> = []
  try {
    const parsed = new URL(url)
    queryString = Array.from(parsed.searchParams.entries()).map(([name, value]) => ({ name, value }))
  } catch { /* skip */ }

  const bodySize = p.request.sizes?.body ? Number(p.request.sizes.body) : -1
  const resBodySize = p.response.sizes?.body ? Number(p.response.sizes.body) : -1

  return {
    startedDateTime,
    time,
    request: {
      method: p.method,
      url,
      httpVersion: p.protocolVersion || 'HTTP/1.1',
      headers: reqHeaders,
      queryString,
      cookies: reqCookies,
      headersSize: p.request.sizes?.headers ?? -1,
      bodySize,
      postData: p.request.body?.text
        ? { mimeType: p.request.mimeType || '', text: p.request.body.text }
        : undefined,
    },
    response: {
      status,
      statusText,
      httpVersion: p.protocolVersion || 'HTTP/1.1',
      headers: resHeaders,
      cookies: resCookies,
      content: {
        size: resBodySize,
        mimeType: p.response.mimeType || '',
        text: p.response.body?.text,
        encoding: p.response.contentEncoding || undefined,
      },
      redirectURL: '',
      headersSize: p.response.sizes?.headers ?? -1,
      bodySize: resBodySize,
    },
    timings,
    serverIPAddress: p.remoteAddress?.split('/')[1],
  }
}

function parseProxyCapture(entries: ProxyEntry[]): ParseResult {
  const harEntries = entries.map(proxyToHarEntry).sort(
    (a, b) => new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime()
  )

  return { entries: harEntries, hosts: extractHosts(harEntries) }
}
