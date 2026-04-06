export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

export function formatDuration(ms: number): string {
  if (ms < 0) return '-'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function getStatusColor(status: number): string {
  if (status >= 500) return 'text-red-400'
  if (status >= 400) return 'text-amber-400'
  if (status >= 300) return 'text-neutral-400'
  if (status >= 200) return 'text-emerald-400'
  return 'text-neutral-500'
}

export function getStatusBg(status: number): string {
  if (status >= 500) return 'bg-red-400/10 text-red-400 border-red-400/20'
  if (status >= 400) return 'bg-amber-400/10 text-amber-400 border-amber-400/20'
  if (status >= 300) return 'bg-neutral-400/10 text-neutral-400 border-neutral-400/20'
  if (status >= 200) return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
  return 'bg-neutral-400/10 text-neutral-500 border-neutral-400/20'
}

export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'text-blue-400'
    case 'POST': return 'text-green-400'
    case 'PUT': return 'text-amber-400'
    case 'PATCH': return 'text-orange-400'
    case 'DELETE': return 'text-red-400'
    default: return 'text-neutral-400'
  }
}

export function extractPath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

export function extractHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}
