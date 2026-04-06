import type { HarEntry } from '@/types/har'
import { getStatusBg, getMethodColor, extractPath, formatDuration } from '@/lib/format'
import { Highlight } from './highlight'

interface RequestRowProps {
  entry: HarEntry
  isSelected: boolean
  onClick: () => void
  style: React.CSSProperties
  search: string
}

export function RequestRow({ entry, isSelected, onClick, style, search }: RequestRowProps) {
  const { request, response, time } = entry

  return (
    <div
      style={style}
      onClick={onClick}
      className={`grid grid-cols-[52px_48px_1fr_64px] items-center gap-2 px-3 cursor-pointer text-xs font-mono transition-colors ${
        isSelected
          ? 'bg-white/8'
          : 'hover:bg-white/4'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${getStatusBg(
          response.status
        )}`}
      >
        {response.status}
      </span>

      <span className={`text-[11px] font-semibold ${getMethodColor(request.method)}`}>
        {request.method}
      </span>

      <span className="truncate text-foreground/80" title={request.url}>
        <Highlight text={extractPath(request.url)} search={search} />
      </span>

      <span className="text-right text-muted-foreground text-[11px]">
        {formatDuration(time)}
      </span>
    </div>
  )
}
