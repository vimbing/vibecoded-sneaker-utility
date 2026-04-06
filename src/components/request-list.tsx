import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { HarEntry } from '@/types/har'
import { RequestRow } from './request-row'

interface RequestListProps {
  entries: HarEntry[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  search: string
}

const ROW_HEIGHT = 32

export function RequestList({ entries, selectedIndex, onSelect, search }: RequestListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  })

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No matching requests
      </div>
    )
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <RequestRow
            key={virtualRow.index}
            entry={entries[virtualRow.index]}
            isSelected={virtualRow.index === selectedIndex}
            onClick={() => onSelect(virtualRow.index)}
            search={search}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
