# HAR + Charles Viewer

A fully vibecoded app for sneaker botting utilities. I don't care about the code quality - it just needs to speed up some repetitive tasks.

## Features

- Load HAR files (JSON or gzipped)
- Filter requests by host, method, and status
- Search across all request data (URLs, headers, bodies)
- View request/response details:
  - Response body with syntax highlighting
  - Request and response headers
  - Query parameters
  - Cookies (request and response)
  - Timing breakdown
- Browser impersonation - switch between Chrome, Firefox, Safari, and Edge user agents
- Export tools:
  - Copy as cURL command
  - Copy as Go http.Header block
  - Convert JSON body to Go struct
- Template editor - create reusable templates with variables from request/response data
- Preserves original header order

## Usage

1. Drop a HAR file (or .har.gz) onto the page
2. Filter/search to find the request you need
3. Click on a request to view details
4. Use the export buttons to copy for your bot

## Tech Stack

React + Vite + TypeScript + Tailwind CSS + shadcn/ui components

## Development

```bash
bun install
bun run dev
```

Built in a few hours to solve specific problems. No tests, no documentation beyond this file.
