import { Input } from '@/components/ui/input'
import type { Filters } from '@/hooks/use-har-data'

interface FilterBarProps {
  filters: Filters
  hosts: string[]
  totalCount: number
  filteredCount: number
  onFiltersChange: (filters: Filters) => void
  onClear: () => void
}

export function FilterBar({
  filters,
  hosts,
  totalCount,
  filteredCount,
  onFiltersChange,
  onClear,
}: FilterBarProps) {
  const isUrlRegexInvalid = (() => {
    if (!filters.urlRegex) return false
    try {
      new RegExp(filters.urlRegex)
      return false
    } catch {
      return true
    }
  })()

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border">
      <select
        value={filters.host}
        onChange={(e) =>
          onFiltersChange({ ...filters, host: e.target.value })
        }
        className="h-8 rounded-md bg-secondary border border-border px-2 text-xs text-foreground min-w-[140px] outline-none"
      >
        <option value="">All hosts</option>
        {hosts.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <Input
        placeholder="URL filter (regex)"
        value={filters.urlRegex}
        onChange={(e) =>
          onFiltersChange({ ...filters, urlRegex: e.target.value })
        }
        className={`h-8 text-xs max-w-[240px] ${
          isUrlRegexInvalid ? 'border-red-400/50 focus-visible:ring-red-400/30' : ''
        }`}
      />

      <select
        value={filters.statusGroup}
        onChange={(e) =>
          onFiltersChange({ ...filters, statusGroup: e.target.value })
        }
        className="h-8 rounded-md bg-secondary border border-border px-2 text-xs text-foreground min-w-[80px] outline-none"
      >
        <option value="">All status</option>
        <option value="2xx">2xx</option>
        <option value="3xx">3xx</option>
        <option value="4xx">4xx</option>
        <option value="5xx">5xx</option>
      </select>

      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
        {filteredCount === totalCount
          ? `${totalCount} requests`
          : `${filteredCount} / ${totalCount}`}
      </span>

      <button
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-2 whitespace-nowrap"
      >
        New file
      </button>
    </div>
  )
}
