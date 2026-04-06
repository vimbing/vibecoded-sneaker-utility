import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { HarEntry } from '@/types/har'
import { HeadersTable } from './headers-table'
import { BodyViewer } from './body-viewer'
import { formatBytes, formatDuration, getStatusColor, extractHost } from '@/lib/format'
import { toCurl, toGoHeader } from '@/lib/curl'
import { jsonToGo } from '@/lib/json-to-go'
import { TemplateEditor } from './template-editor'
import { BROWSER_PROFILES, applyImpersonation, type BrowserProfile } from '@/lib/impersonate'

interface DetailPanelProps {
  entry: HarEntry
  search?: string
}

function CopyButton({ label, getText }: { label: string; getText: () => string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getText())
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] text-muted-foreground hover:text-foreground bg-secondary/80 px-2 py-1 rounded border border-border transition-colors whitespace-nowrap"
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

function MatchDot() {
  return <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
}

// Group profiles by browser family
const profileGroups = BROWSER_PROFILES.reduce<Record<string, BrowserProfile[]>>((acc, p) => {
  ;(acc[p.group] ??= []).push(p)
  return acc
}, {})

function getTabMatches(entry: HarEntry, search: string): Set<string> {
  const matched = new Set<string>()
  if (!search || search.length < 2) return matched
  const term = search.toLowerCase()

  const check = (s?: string) => s?.toLowerCase().includes(term) ?? false
  const checkHeaders = (headers: Array<{ name: string; value: string }>) =>
    headers.some((h) => check(h.name) || check(h.value))

  if (check(entry.response.content.text)) matched.add('response-body')
  if (checkHeaders(entry.response.headers)) matched.add('response-headers')
  if (checkHeaders(entry.request.headers)) matched.add('request-headers')
  if (check(entry.request.postData?.text)) matched.add('request-body')
  if (entry.request.queryString?.some((q) => check(q.name) || check(q.value))) matched.add('query')
  const allCookies = [...(entry.request.cookies ?? []), ...(entry.response.cookies ?? [])]
  if (allCookies.some((c) => check(c.name) || check(c.value))) matched.add('cookies')

  return matched
}

export function DetailPanel({ entry, search = '' }: DetailPanelProps) {
  const { response, timings } = entry
  const [goInline, setGoInline] = useState(false)
  const [profileName, setProfileName] = useState('')

  const profile = useMemo(
    () => BROWSER_PROFILES.find((p) => p.name === profileName) ?? null,
    [profileName]
  )

  const effectiveEntry = useMemo(
    () => applyImpersonation(entry, profile),
    [entry, profile]
  )

  const { request } = effectiveEntry
  const [activeTab, setActiveTab] = useState('response-body')

  const tabMatches = useMemo(() => getTabMatches(effectiveEntry, search), [effectiveEntry, search])

  const goStructJson = useMemo(() => {
    if (activeTab === 'request-body') {
      const text = request.postData?.text
      if (!text || !request.postData?.mimeType?.includes('json')) return null
      return text
    }
    // default: response body
    if (!response.content.text || !response.content.mimeType?.includes('json')) return null
    return response.content.text
  }, [activeTab, request.postData, response.content])

  const goStruct = useMemo(() => {
    if (!goStructJson) return null
    try {
      return jsonToGo(goStructJson, { inline: goInline })
    } catch {
      return null
    }
  }, [goStructJson, goInline])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Summary bar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 text-xs font-mono shrink-0">
        <span className={`font-bold ${getStatusColor(response.status)}`}>
          {response.status} {response.statusText}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground/70">{request.method}</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground/50 truncate" title={request.url}>
          {extractHost(request.url)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className={`h-6 rounded bg-secondary border px-1.5 text-[10px] outline-none min-w-[100px] ${
              profileName
                ? 'text-foreground border-foreground/20'
                : 'text-muted-foreground border-border'
            }`}
          >
            <option value="">Original UA</option>
            {Object.entries(profileGroups).map(([group, profiles]) => (
              <optgroup key={group} label={group}>
                {profiles.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <CopyButton label="cURL" getText={() => toCurl(effectiveEntry)} />
          <CopyButton label="Go Header" getText={() => toGoHeader(effectiveEntry)} />
          {goStruct !== null && (
            <div className="flex items-center gap-1">
              <CopyButton label="Go struct" getText={() => goStruct} />
              <button
                onClick={() => setGoInline((v) => !v)}
                className={`text-[10px] px-1.5 py-1 rounded border transition-colors ${
                  goInline
                    ? 'text-foreground bg-secondary border-foreground/20'
                    : 'text-muted-foreground bg-transparent border-border hover:text-foreground'
                }`}
                title={goInline ? 'Inline types (click to separate)' : 'Separate types (click to inline)'}
              >
                inline
              </button>
            </div>
          )}
          <span className="text-muted-foreground">{formatDuration(entry.time)}</span>
          {response.content.size > 0 && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">{formatBytes(response.content.size)}</span>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="response-body" onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 h-auto py-0 shrink-0">
          <TabsTrigger
            value="response-body"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2"
          >
            Response
            {tabMatches.has('response-body') && <MatchDot />}
          </TabsTrigger>
          <TabsTrigger
            value="response-headers"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2"
          >
            Resp. Headers
            {tabMatches.has('response-headers') && <MatchDot />}
          </TabsTrigger>
          <TabsTrigger
            value="request-headers"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2"
          >
            Req. Headers
            {tabMatches.has('request-headers') && <MatchDot />}
          </TabsTrigger>
          <TabsTrigger
            value="request-body"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2"
          >
            Req. Body
            {tabMatches.has('request-body') && <MatchDot />}
          </TabsTrigger>
          <TabsTrigger
            value="query"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2 text-muted-foreground"
          >
            Query
            {tabMatches.has('query') && <MatchDot />}
          </TabsTrigger>
          <TabsTrigger
            value="cookies"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2 text-muted-foreground"
          >
            Cookies
            {tabMatches.has('cookies') && <MatchDot />}
          </TabsTrigger>
          <TabsTrigger
            value="timing"
            className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2 text-muted-foreground"
          >
            Timing
          </TabsTrigger>
          <TabsTrigger
            value="template"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent text-xs py-2 text-muted-foreground"
          >
            Template
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="response-body" className="mt-0 h-full">
            <BodyViewer
              content={response.content.text}
              mimeType={response.content.mimeType}
              encoding={response.content.encoding}
              search={search}
            />
          </TabsContent>

          <TabsContent value="response-headers" className="mt-0">
            <HeadersTable headers={response.headers} search={search} />
          </TabsContent>

          <TabsContent value="request-headers" className="mt-0">
            <HeadersTable headers={request.headers} search={search} />
          </TabsContent>

          <TabsContent value="request-body" className="mt-0 h-full">
            <BodyViewer
              content={request.postData?.text}
              mimeType={request.postData?.mimeType}
              search={search}
            />
          </TabsContent>

          <TabsContent value="query" className="mt-0">
            {(request.queryString?.length ?? 0) > 0 ? (
              <HeadersTable
                headers={request.queryString.map((q) => ({
                  name: q.name,
                  value: q.value,
                }))}
                search={search}
              />
            ) : (
              <p className="text-sm text-muted-foreground p-4">No query parameters</p>
            )}
          </TabsContent>

          <TabsContent value="cookies" className="mt-0">
            {(request.cookies?.length ?? 0) > 0 || (response.cookies?.length ?? 0) > 0 ? (
              <div>
                {(request.cookies?.length ?? 0) > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Request Cookies
                    </div>
                    <HeadersTable
                      headers={request.cookies.map((c) => ({
                        name: c.name,
                        value: c.value,
                      }))}
                      search={search}
                    />
                  </div>
                )}
                {(response.cookies?.length ?? 0) > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Response Cookies
                    </div>
                    <HeadersTable
                      headers={response.cookies.map((c) => ({
                        name: c.name,
                        value: c.value,
                      }))}
                      search={search}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No cookies</p>
            )}
          </TabsContent>

          <TabsContent value="timing" className="mt-0 p-4">
            <TimingView timings={timings} total={entry.time} />
          </TabsContent>

          <TabsContent value="template" className="mt-0 h-full">
            <TemplateEditor entry={effectiveEntry} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function TimingView({ timings, total }: { timings?: HarEntry['timings']; total: number }) {
  if (!timings) {
    return <p className="text-sm text-muted-foreground">Timing data not available</p>
  }

  const items = [
    { label: 'Blocked', value: timings.blocked, color: 'bg-neutral-500' },
    { label: 'DNS', value: timings.dns, color: 'bg-cyan-400' },
    { label: 'Connect', value: timings.connect, color: 'bg-orange-400' },
    { label: 'SSL', value: timings.ssl, color: 'bg-purple-400' },
    { label: 'Send', value: timings.send, color: 'bg-blue-400' },
    { label: 'Wait', value: timings.wait, color: 'bg-green-400' },
    { label: 'Receive', value: timings.receive, color: 'bg-amber-400' },
  ].filter((item) => item.value > 0)

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-xs font-mono">
          <span className="w-16 text-muted-foreground">{item.label}</span>
          <div className="flex-1 h-3 bg-secondary rounded-sm overflow-hidden">
            <div
              className={`h-full ${item.color} rounded-sm`}
              style={{ width: `${Math.max((item.value / total) * 100, 1)}%` }}
            />
          </div>
          <span className="w-16 text-right text-muted-foreground">
            {formatDuration(item.value)}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-3 text-xs font-mono pt-2 border-t border-border">
        <span className="w-16 text-foreground font-semibold">Total</span>
        <div className="flex-1" />
        <span className="w-16 text-right text-foreground font-semibold">
          {formatDuration(total)}
        </span>
      </div>
    </div>
  )
}
