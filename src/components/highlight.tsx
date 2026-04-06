import { useMemo } from 'react'

interface HighlightProps {
  text: string
  search: string
  className?: string
}

export function Highlight({ text, search, className }: HighlightProps) {
  const parts = useMemo(() => {
    if (!search || search.length < 2) return null
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    return text.split(regex)
  }, [text, search])

  if (!parts) return <span className={className}>{text}</span>

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-amber-400/30 text-inherit rounded-sm px-px">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}
