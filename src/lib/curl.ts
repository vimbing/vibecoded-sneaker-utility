import type { HarEntry } from '@/types/har'

function shellEscape(s: string): string {
  if (/^[a-zA-Z0-9._\-/:@=%&?+,#]+$/.test(s)) return s
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

export function toCurl(entry: HarEntry): string {
  const { request } = entry
  const parts: string[] = ['curl']

  if (request.method !== 'GET') {
    parts.push(`-X ${request.method}`)
  }

  parts.push(shellEscape(request.url))

  for (const h of request.headers) {
    const name = h.name.toLowerCase()
    if (name === 'host' || name === 'content-length' || name.startsWith(':')) continue
    parts.push(`-H ${shellEscape(`${h.name}: ${h.value}`)}`)
  }

  if (request.postData?.text) {
    parts.push(`-d ${shellEscape(request.postData.text)}`)
  }

  return parts.join(' \\\n  ')
}

function goStringLiteral(s: string): string {
  if (s.includes('"')) {
    return `{"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"}`
  }
  return `{"${s}"}`
}

export function toGoHeader(entry: HarEntry): string {
  const { request } = entry
  const headers = request.headers.filter((h) => !h.name.startsWith(':'))

  // Find max key length for alignment (including quotes and colon)
  const keyLengths = headers.map((h) => `"${h.name.toLowerCase()}":`.length)
  const orderKeyLength = 'http.HeaderOrderKey:'.length
  const maxLen = Math.max(...keyLengths, orderKeyLength)

  const lines: string[] = []
  const orderKeys: string[] = []

  for (const h of headers) {
    const key = `"${h.name.toLowerCase()}":`
    const padded = key.padEnd(maxLen)
    lines.push(`\t${padded} ${goStringLiteral(h.value)},`)
    orderKeys.push(`"${h.name.toLowerCase()}"`)
  }

  const orderKeyPadded = 'http.HeaderOrderKey:'.padEnd(maxLen)
  lines.push(`\t${orderKeyPadded} {${orderKeys.join(', ')}},`)

  return `http.Header{\n${lines.join('\n')}\n}`
}
