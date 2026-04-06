import { useState, useMemo, useRef } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Highlight } from './highlight'

interface BodyViewerProps {
  content?: string
  mimeType?: string
  encoding?: string
  search?: string
}

function detectLanguage(mimeType?: string): string | null {
  if (!mimeType) return null
  const m = mimeType.toLowerCase()
  if (m.includes('json')) return 'json'
  if (m.includes('xml') || m.includes('svg')) return 'xml'
  if (m.includes('html')) return 'html'
  if (m.includes('css')) return 'css'
  if (m.includes('javascript') || m.includes('ecmascript')) return 'javascript'
  if (m.includes('typescript')) return 'typescript'
  if (m.includes('yaml') || m.includes('yml')) return 'yaml'
  if (m.includes('graphql')) return 'graphql'
  if (m.includes('sql')) return 'sql'
  return null
}

function beautify(content: string, language: string | null): string {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(content), null, 2)
    } catch {
      return content
    }
  }

  return content
}

const customStyle: React.CSSProperties = {
  margin: 0,
  padding: '1rem',
  fontSize: '12px',
  lineHeight: '1.5',
  background: 'transparent',
  borderRadius: 0,
}

export function BodyViewer({ content, mimeType, encoding, search = '' }: BodyViewerProps) {
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const language = useMemo(() => detectLanguage(mimeType), [mimeType])

  const displayContent = useMemo(() => {
    if (!content) return null
    if (encoding === 'base64') return '[Binary content]'
    return beautify(content, language)
  }, [content, encoding, language])

  if (!displayContent) {
    return <p className="text-sm text-muted-foreground p-4">No body content</p>
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const useSyntax = language && displayContent !== '[Binary content]'
  const isSearching = search.length >= 2

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 text-[10px] text-muted-foreground hover:text-foreground bg-secondary/80 px-2 py-1 rounded border border-border transition-colors"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      {useSyntax ? (
        <div ref={scrollRef} className="relative max-h-[calc(100vh-200px)] overflow-auto">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={customStyle}
            wrapLongLines
            wrapLines
            lineProps={{ style: { background: 'none', display: 'block' } }}
            className="!bg-transparent [&_*]:!bg-transparent"
          >
            {displayContent}
          </SyntaxHighlighter>
          {isSearching && (
            <pre
              className="absolute inset-0 p-4 text-xs font-mono whitespace-pre-wrap break-all pointer-events-none"
              style={{ color: 'transparent', lineHeight: '1.5' }}
              aria-hidden
            >
              <Highlight text={displayContent} search={search} />
            </pre>
          )}
        </div>
      ) : (
        <pre className="p-4 text-xs font-mono text-foreground/90 overflow-auto max-h-[calc(100vh-200px)] whitespace-pre-wrap break-all">
          <Highlight text={displayContent} search={search} />
        </pre>
      )}
    </div>
  )
}
