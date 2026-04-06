import { useEffect, useRef, useState, useCallback } from 'react'
import { useHarData } from '@/hooks/use-har-data'
import { FileDropZone } from '@/components/file-drop-zone'
import { FilterBar } from '@/components/filter-bar'
import { RequestList } from '@/components/request-list'
import { DetailPanel } from '@/components/detail-panel'

export default function App() {
  const {
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
    hasData,
  } = useHarData()

  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setTimeout(() => searchRef.current?.focus(), 0)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setFilters((f) => ({ ...f, search: '' }))
  }, [setFilters])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        if (hasData) openSearch()
      }
      if (e.key === 'Escape' && searchOpen) {
        closeSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasData, searchOpen, openSearch, closeSearch])

  if (!hasData) {
    return (
      <div className="dark bg-background text-foreground min-h-screen">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
        <FileDropZone onLoadText={loadFile} onLoadBinary={loadBinaryFile} />
      </div>
    )
  }

  return (
    <div className="dark bg-background text-foreground h-screen flex flex-col overflow-hidden">
      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/50 shrink-0">
          <span className="text-xs text-muted-foreground">Find:</span>
          <input
            ref={searchRef}
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeSearch()
            }}
            placeholder="Search in all requests (URLs, headers, bodies...)"
            className="flex-1 h-7 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {filteredEntries.length} match{filteredEntries.length !== 1 ? 'es' : ''}
          </span>
          <button
            onClick={closeSearch}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            Esc
          </button>
        </div>
      )}

      <FilterBar
        filters={filters}
        hosts={hosts}
        totalCount={entries.length}
        filteredCount={filteredEntries.length}
        onFiltersChange={setFilters}
        onClear={clear}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Request list */}
        <div className="w-[45%] min-w-[300px] border-r border-border overflow-hidden">
          <RequestList
            entries={filteredEntries}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            search={filters.search}
          />
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-hidden">
          {selectedEntry ? (
            <DetailPanel entry={selectedEntry} search={filters.search} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a request to inspect
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
