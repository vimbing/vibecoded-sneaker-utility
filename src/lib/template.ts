import type { HarEntry } from '@/types/har'

export interface SavedTemplate {
  name: string
  content: string
}

const STORAGE_KEY = 'har-viewer-templates'

export function getSavedTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveTemplate(name: string, content: string): SavedTemplate[] {
  const templates = getSavedTemplates()
  const existing = templates.findIndex((t) => t.name === name)
  if (existing >= 0) {
    templates[existing].content = content
  } else {
    templates.push({ name, content })
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return templates
}

export function deleteTemplate(name: string): SavedTemplate[] {
  const templates = getSavedTemplates().filter((t) => t.name !== name)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  return templates
}

function buildContext(entry: HarEntry): Record<string, unknown> {
  const { request, response } = entry

  let parsedUrl: URL | null = null
  try {
    parsedUrl = new URL(request.url)
  } catch { /* ignore */ }

  const reqHeaders: Record<string, string> = {}
  for (const h of request.headers) {
    reqHeaders[h.name.toLowerCase()] = h.value
  }

  const resHeaders: Record<string, string> = {}
  for (const h of response.headers) {
    resHeaders[h.name.toLowerCase()] = h.value
  }

  const queryParams: Record<string, string> = {}
  for (const q of request.queryString) {
    queryParams[q.name] = q.value
  }

  const cookies: Record<string, string> = {}
  for (const c of request.cookies) {
    cookies[c.name] = c.value
  }

  return {
    method: request.method,
    url: request.url,
    host: parsedUrl?.host ?? '',
    hostname: parsedUrl?.hostname ?? '',
    path: parsedUrl?.pathname ?? '',
    search: parsedUrl?.search ?? '',
    origin: parsedUrl?.origin ?? '',
    scheme: parsedUrl?.protocol?.replace(':', '') ?? '',
    status: response.status,
    statusText: response.statusText,
    req: {
      header: reqHeaders,
      body: request.postData?.text ?? '',
      mime: request.postData?.mimeType ?? '',
    },
    res: {
      header: resHeaders,
      body: response.content.text ?? '',
      mime: response.content.mimeType ?? '',
      size: response.content.size,
    },
    query: queryParams,
    cookie: cookies,
    time: entry.time,
  }
}

function resolvePath(obj: unknown, path: string): string {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return ''
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return ''
    }
  }
  if (current === null || current === undefined) return ''
  if (typeof current === 'object') return JSON.stringify(current, null, 2)
  return String(current)
}

function goStringLiteral(s: string): string {
  if (s.includes('"')) {
    return `{"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"}`
  }
  return `{"${s}"}`
}

function buildGoHeaders(entry: HarEntry, indent: string): string {
  const headers = entry.request.headers.filter((h) => !h.name.startsWith(':'))

  const keyLengths = headers.map((h) => `"${h.name.toLowerCase()}":`.length)
  const orderKeyLength = 'http.HeaderOrderKey:'.length
  const maxLen = Math.max(...keyLengths, orderKeyLength)

  const lines: string[] = []
  const orderKeys: string[] = []

  for (const h of headers) {
    const key = `"${h.name.toLowerCase()}":`
    const padded = key.padEnd(maxLen)
    lines.push(`${indent}${padded} ${goStringLiteral(h.value)},`)
    orderKeys.push(`"${h.name.toLowerCase()}"`)
  }

  const orderKeyPadded = 'http.HeaderOrderKey:'.padEnd(maxLen)
  lines.push(`${indent}${orderKeyPadded} {${orderKeys.join(', ')}},`)

  return lines.join('\n')
}

function buildGoHeaderBlock(entry: HarEntry, indent: string): string {
  return `http.Header{\n${buildGoHeaders(entry, indent)}\n${indent.slice(0, -1) || ''}}`
}

function methodToGoFunc(method: string): string {
  const m = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()
  return m
}

export function evaluateTemplate(template: string, entry: HarEntry): string {
  const ctx = buildContext(entry)

  // Process block helpers first
  let result = template

  // {{go.header_block}} — full http.Header{...} with aligned keys and HeaderOrderKey
  // Detect indentation from the line it's on
  result = result.replace(/^([ \t]*).*\{\{go\.header_block\}\}/gm, (match, leadingIndent: string) => {
    const innerIndent = leadingIndent + '\t'
    return match.replace('{{go.header_block}}', buildGoHeaderBlock(entry, innerIndent))
  })

  // {{go.headers}} — just the inner header lines (no wrapping http.Header{})
  result = result.replace(/^([ \t]*).*\{\{go\.headers\}\}/gm, (match, leadingIndent: string) => {
    const innerIndent = leadingIndent + '\t'
    return match.replace('{{go.headers}}', '\n' + buildGoHeaders(entry, innerIndent))
  })

  // {{go.method}} — Post, Get, etc.
  result = result.replace(/\{\{go\.method\}\}/g, methodToGoFunc(entry.request.method))

  // {{go.body_arg}} — bytes.NewBufferString("...") or nil
  result = result.replace(/\{\{go\.body_arg\}\}/g, () => {
    const body = entry.request.postData?.text
    if (!body) return 'nil'
    // Escape for Go string
    const escaped = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
    return `bytes.NewBufferString("${escaped}")`
  })

  // Simple {{variable}} substitution
  result = result.replace(/\{\{(.+?)\}\}/g, (_, expr: string) => {
    const path = expr.trim()
    return resolvePath(ctx, path)
  })

  return result
}
