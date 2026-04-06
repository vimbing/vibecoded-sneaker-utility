import { useState, useMemo, useEffect } from 'react'
import type { HarEntry } from '@/types/har'
import {
  evaluateTemplate,
  getSavedTemplates,
  saveTemplate,
  deleteTemplate,
  type SavedTemplate,
} from '@/lib/template'

interface TemplateEditorProps {
  entry: HarEntry
}

const BUILTIN_TEMPLATES: SavedTemplate[] = [
  {
    name: 'Go Request',
    content: `res, err := m.client.{{go.method}}(
\t"{{url}}",
\t{{go.body_arg}},
\t{{go.header_block}},
)

if err != nil {
\treturn fmt.Errorf("request failed: %w", err)
}`,
  },
]

export function TemplateEditor({ entry }: TemplateEditorProps) {
  const [template, setTemplate] = useState('')
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => getSavedTemplates())
  const [selectedName, setSelectedName] = useState('')
  const [saveName, setSaveName] = useState('')
  const [copied, setCopied] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    setTemplates(getSavedTemplates())
  }, [])

  const allTemplates = useMemo(() => {
    const userNames = new Set(templates.map((t) => t.name))
    const builtins = BUILTIN_TEMPLATES.filter((t) => !userNames.has(t.name))
    return [...builtins, ...templates]
  }, [templates])

  const output = useMemo(() => {
    if (!template.trim()) return ''
    try {
      return evaluateTemplate(template, entry)
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'evaluation failed'}`
    }
  }, [template, entry])

  const handleLoad = (name: string) => {
    const t = allTemplates.find((t) => t.name === name)
    if (t) {
      setTemplate(t.content)
      setSelectedName(name)
      setSaveName(name)
    }
  }

  const handleSave = () => {
    const name = saveName.trim()
    if (!name) return
    const updated = saveTemplate(name, template)
    setTemplates(updated)
    setSelectedName(name)
  }

  const handleDelete = () => {
    if (!selectedName) return
    const updated = deleteTemplate(selectedName)
    setTemplates(updated)
    setSelectedName('')
    setSaveName('')
  }

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const isBuiltin = BUILTIN_TEMPLATES.some((t) => t.name === selectedName)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <select
          value={selectedName}
          onChange={(e) => {
            if (e.target.value) handleLoad(e.target.value)
            else {
              setSelectedName('')
              setSaveName('')
            }
          }}
          className="h-7 rounded bg-secondary border border-border px-2 text-xs text-foreground min-w-[120px] outline-none"
        >
          <option value="">Templates...</option>
          {BUILTIN_TEMPLATES.length > 0 && (
            <optgroup label="Built-in">
              {BUILTIN_TEMPLATES.map((t) => (
                <option key={`b-${t.name}`} value={t.name}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
          {templates.length > 0 && (
            <optgroup label="Saved">
              {templates.map((t) => (
                <option key={`s-${t.name}`} value={t.name}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <input
          type="text"
          placeholder="Template name"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          className="h-7 rounded bg-secondary border border-border px-2 text-xs text-foreground w-[140px] outline-none placeholder:text-muted-foreground"
        />

        <button
          onClick={handleSave}
          disabled={!saveName.trim() || !template.trim()}
          className="text-[10px] text-muted-foreground hover:text-foreground bg-secondary/80 px-2 py-1 rounded border border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Save
        </button>

        {selectedName && !isBuiltin && (
          <button
            onClick={handleDelete}
            className="text-[10px] text-red-400/70 hover:text-red-400 bg-secondary/80 px-2 py-1 rounded border border-border transition-colors"
          >
            Delete
          </button>
        )}

        <button
          onClick={() => setShowHelp((v) => !v)}
          className={`text-[10px] px-2 py-1 rounded border transition-colors ml-auto ${
            showHelp
              ? 'text-foreground bg-secondary border-foreground/20'
              : 'text-muted-foreground bg-secondary/80 border-border hover:text-foreground'
          }`}
        >
          Variables
        </button>
      </div>

      {/* Help */}
      {showHelp && (
        <div className="px-4 py-2 border-b border-border text-[11px] font-mono text-muted-foreground bg-secondary/30 shrink-0 max-h-[200px] overflow-auto">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
            <span className="text-foreground/50 col-span-2 mt-1 mb-0.5">Request</span>
            <span className="text-foreground/70">{'{{method}}'}</span><span>GET, POST, ...</span>
            <span className="text-foreground/70">{'{{url}}'}</span><span>Full URL</span>
            <span className="text-foreground/70">{'{{host}}'}</span><span>Host with port</span>
            <span className="text-foreground/70">{'{{hostname}}'}</span><span>Host without port</span>
            <span className="text-foreground/70">{'{{path}}'}</span><span>URL path</span>
            <span className="text-foreground/70">{'{{scheme}}'}</span><span>http or https</span>
            <span className="text-foreground/70">{'{{origin}}'}</span><span>Scheme + host</span>
            <span className="text-foreground/70">{'{{req.header.<name>}}'}</span><span>Request header (lowercase name)</span>
            <span className="text-foreground/70">{'{{req.body}}'}</span><span>Request body text</span>
            <span className="text-foreground/70">{'{{req.mime}}'}</span><span>Request content type</span>
            <span className="text-foreground/70">{'{{query.<name>}}'}</span><span>Query parameter</span>
            <span className="text-foreground/70">{'{{cookie.<name>}}'}</span><span>Cookie value</span>

            <span className="text-foreground/50 col-span-2 mt-2 mb-0.5">Response</span>
            <span className="text-foreground/70">{'{{status}}'}</span><span>Response status code</span>
            <span className="text-foreground/70">{'{{res.header.<name>}}'}</span><span>Response header (lowercase name)</span>
            <span className="text-foreground/70">{'{{res.body}}'}</span><span>Response body text</span>
            <span className="text-foreground/70">{'{{res.mime}}'}</span><span>Response content type</span>
            <span className="text-foreground/70">{'{{time}}'}</span><span>Total time (ms)</span>

            <span className="text-foreground/50 col-span-2 mt-2 mb-0.5">Go helpers</span>
            <span className="text-foreground/70">{'{{go.header_block}}'}</span><span>Full http.Header{'{ }'} with aligned keys + HeaderOrderKey</span>
            <span className="text-foreground/70">{'{{go.headers}}'}</span><span>Just the inner header lines (no wrapper)</span>
            <span className="text-foreground/70">{'{{go.method}}'}</span><span>Capitalized method: Post, Get, ...</span>
            <span className="text-foreground/70">{'{{go.body_arg}}'}</span><span>bytes.NewBufferString("...") or nil</span>
          </div>
        </div>
      )}

      {/* Editor + Output split */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Template input */}
        <div className="flex-1 min-h-[100px] border-b border-border">
          <textarea
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value)
              setSelectedName('')
            }}
            placeholder="Write your template here using {{variable}} syntax..."
            spellCheck={false}
            className="w-full h-full resize-none bg-transparent text-xs font-mono text-foreground p-4 outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Output */}
        <div className="flex-1 min-h-[100px] overflow-auto relative">
          {output ? (
            <>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 text-[10px] text-muted-foreground hover:text-foreground bg-secondary/80 px-2 py-1 rounded border border-border transition-colors z-10"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <pre className="p-4 text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all">
                {output}
              </pre>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50">
              Output will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
