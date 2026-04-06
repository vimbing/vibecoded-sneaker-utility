export interface HarHeader {
  name: string
  value: string
}

export interface HarQueryParam {
  name: string
  value: string
}

export interface HarCookie {
  name: string
  value: string
  path?: string
  domain?: string
  expires?: string
  httpOnly?: boolean
  secure?: boolean
}

export interface HarPostData {
  mimeType: string
  text?: string
  params?: Array<{ name: string; value?: string }>
}

export interface HarContent {
  size: number
  mimeType: string
  text?: string
  encoding?: string
}

export interface HarTimings {
  blocked: number
  dns: number
  connect: number
  ssl: number
  send: number
  wait: number
  receive: number
}

export interface HarRequest {
  method: string
  url: string
  httpVersion: string
  headers: HarHeader[]
  queryString: HarQueryParam[]
  cookies: HarCookie[]
  headersSize: number
  bodySize: number
  postData?: HarPostData
}

export interface HarResponse {
  status: number
  statusText: string
  httpVersion: string
  headers: HarHeader[]
  cookies: HarCookie[]
  content: HarContent
  redirectURL: string
  headersSize: number
  bodySize: number
}

export interface HarEntry {
  startedDateTime: string
  time: number
  request: HarRequest
  response: HarResponse
  timings: HarTimings
  serverIPAddress?: string
  connection?: string
}

export interface HarFile {
  log: {
    version: string
    creator: { name: string; version: string }
    entries: HarEntry[]
  }
}
