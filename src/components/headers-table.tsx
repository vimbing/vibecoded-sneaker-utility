import type { HarHeader } from '@/types/har'
import { Highlight } from './highlight'

interface HeadersTableProps {
  headers: HarHeader[]
  search?: string
}

export function HeadersTable({ headers, search = '' }: HeadersTableProps) {
  if (headers.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No headers</p>
  }

  return (
    <div className="divide-y divide-border">
      {headers.map((header, i) => (
        <div key={`${header.name}-${i}`} className="grid grid-cols-[200px_1fr] gap-2 px-4 py-1.5 text-xs font-mono">
          <Highlight text={header.name} search={search} className="text-muted-foreground truncate" />
          <Highlight text={header.value} search={search} className="text-foreground/90 break-all" />
        </div>
      ))}
    </div>
  )
}
