import { useState, useMemo, useCallback } from 'react'
import type { HarEntry } from '@/types/har'
import { parseFile, parseChlzFile, type ParseResult } from '@/lib/har-parser'

export interface Filters {
  host: string
  urlRegex: string
  statusGroup: string
  search: string
}

export function useHarData() {
  const [entries, setEntries] = useState<HarEntry[]>([])
  const [hosts, setHosts] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [filters, setFilters] = useState<Filters>({
    host: '',
    urlRegex: '',
    statusGroup: '',
    search: '',
  })
  const [error, setError] = useState<string | null>(null)

  const applyResult = useCallback((result: ParseResult) => {
    setEntries(result.entries)
    setHosts(result.hosts)
    setSelectedIndex(null)
    setFilters({ host: '', urlRegex: '', statusGroup: '', search: '' })
    setError(null)
  }, [])

  const loadFile = useCallback((text: string) => {
    try {
      applyResult(parseFile(text))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file')
    }
  }, [applyResult])

  const loadBinaryFile = useCallback((buffer: ArrayBuffer) => {
    try {
      applyResult(parseChlzFile(buffer))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse .chlz file')
    }
  }, [applyResult])

  const filteredEntries = useMemo(() => {
    let result = entries

    if (filters.host) {
      result = result.filter((e) => {
        try {
          return new URL(e.request.url).host === filters.host
        } catch {
          return false
        }
      })
    }

    if (filters.urlRegex) {
      try {
        const regex = new RegExp(filters.urlRegex, 'i')
        result = result.filter((e) => regex.test(e.request.url))
      } catch {
        // invalid regex, skip filter
      }
    }

    if (filters.statusGroup) {
      const group = filters.statusGroup
      result = result.filter((e) => {
        const s = e.response.status
        switch (group) {
          case '2xx': return s >= 200 && s < 300
          case '3xx': return s >= 300 && s < 400
          case '4xx': return s >= 400 && s < 500
          case '5xx': return s >= 500
          default: return true
        }
      })
    }

    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter((e) => {
        if (e.request.url.toLowerCase().includes(term)) return true
        if (e.request.method.toLowerCase().includes(term)) return true
        if (String(e.response.status).includes(term)) return true
        if (e.response.statusText?.toLowerCase().includes(term)) return true
        for (const h of e.request.headers) {
          if (h.name.toLowerCase().includes(term) || h.value.toLowerCase().includes(term)) return true
        }
        for (const h of e.response.headers) {
          if (h.name.toLowerCase().includes(term) || h.value.toLowerCase().includes(term)) return true
        }
        if (e.request.postData?.text?.toLowerCase().includes(term)) return true
        if (e.response.content.text?.toLowerCase().includes(term)) return true
        return false
      })
    }

    return result
  }, [entries, filters])

  const selectedEntry = selectedIndex !== null ? filteredEntries[selectedIndex] ?? null : null

  const clear = useCallback(() => {
    setEntries([])
    setHosts([])
    setSelectedIndex(null)
    setFilters({ host: '', urlRegex: '', statusGroup: '', search: '' })
    setError(null)
  }, [])

  return {
    entries,
    filteredEntries,
    hosts,
    selectedIndex,
    setSelectedIndex,
    selectedEntry,
    filters,
    setFilters,
    loadFile,
    loadBinaryFile,
    clear,
    error,
    hasData: entries.length > 0,
  }
}
