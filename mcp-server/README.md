# flowforce-kanban-mcp

Model Context Protocol (MCP) server for [FlowForce Kanban](https://github.com/kkim025/flowforce-kanban).

Exposes boards, tasks, sprints, wiki pages, notifications, and time entries to any MCP-compatible LLM client — Claude Desktop, Hermes, VS Code Copilot, Cursor, etc.

> **Status:** Phase 1 (issue #37) — scaffolding + `list_boards` hello-world tool.
> Later phases (issues #38–#46) will add the full read/write surface, prompts, and npm publishing.

---

## What works today

- ✅ Standalone Node service on port `3001` exposing `/mcp` over Streamable HTTP transport
- ✅ One tool: `list_boards` — returns the current user's Kanban boards as JSON
- ✅ Thin `ApiClient` with no caching — every MCP call hits the FlowForce REST API
- ✅ Unit tests (Vitest) for the API client and server factory

## What's coming next

| Issue | Phase | What lands |
|---|---|---|
| [#38](https://github.com/kkim025/flowforce-kanban/issues/38) | 2 | Read resources for boards / tasks / sprints / tags / wiki / notifications / users |
| [#39](https://github.com/kkim025/flowforce-kanban/issues/39) | 3 | Write tools for task CRUD + subtasks + checklists + comments |
| [#40](https://github.com/kkim025/flowforce-kanban/issues/40) | 4 | Write tools for boards / columns / sprints / wiki / time / tags / users / sharing |
| [#41](https://github.com/kkim025/flowforce-kanban/issues/41) | 5 | Reusable prompts (daily standup / sprint planning / retro) |
| [#42](https://github.com/kkim025/flowforce-kanban/issues/42) | 6 | JWT + API key + OAuth bearer middleware + client config docs (depends on API issue [#45](https://github.com/kkim025/flowforce-kanban/issues/45)) |
| [#43](https://github.com/kkim025/flowforce-kanban/issues/43) | 7 | Tests + CI integration |
| [#46](https://github.com/kkim025/flowforce-kanban/issues/46) | 7.5 | Publish to npm so `npx flowforce-kanban-mcp` works end-to-end |

---

## Local development

```sh
cd mcp-server
npm install
cp .env.example .env
# edit .env to point at a running FlowForce API + a valid test user

npm run dev          # tsx watch — auto-reloads on file changes
# or:
npm run build && npm start
```

The server logs `Listening on http://127.0.0.1:3001/mcp` when ready.

## Smoke test

While the server is running:

```sh
# Health check
curl http://localhost:3001/

# List boards via the MCP JSON-RPC protocol
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call the tool
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_boards"}}'
```

## Environment variables

| Var | Required | Default | Description |
|---|---|---|---|
| `FLOWFORCE_API_URL` | yes (or `--api-url`) | — | FlowForce REST API base URL, e.g. `http://localhost:5000` |
| `FLOWFORCE_PORT` | no (or `--port`) | `3001` | Port for the MCP HTTP server |
| `FLOWFORCE_MCP_PATH` | no (or `--mcp-path`) | `/mcp` | Path the MCP server mounts on |
| `FLOWFORCE_EMAIL` | yes (Phase 1) | — | Test user email for static login |
| `FLOWFORCE_PASSWORD` | yes (Phase 1) | — | Test user password for static login |

Phase 6 will drop `FLOWFORCE_EMAIL` / `FLOWFORCE_PASSWORD` and require the LLM client to pass a bearer token (JWT / API key / OAuth) in the `Authorization` header instead.

## Tests

```sh
npm test            # one-shot
npm run test:watch  # interactive
npm run test:coverage
```

## Architecture

```
┌─────────────────────────────┐
│  LLM client (Claude, etc.)  │
└──────────────┬──────────────┘
               │ Streamable HTTP / JSON-RPC
               │ Authorization: Bearer ***
               ▼
┌─────────────────────────────┐
│  flowforce-kanban-mcp       │  ← this package
│  Express + McpServer        │
│  thin ApiClient (no cache)  │
└──────────────┬──────────────┘
               │ REST + same bearer token
               ▼
┌─────────────────────────────┐
│  FlowForce API (NestJS)     │
│  Prisma → PostgreSQL        │
└─────────────────────────────┘
```

The MCP server holds **no credentials of its own** beyond the lifetime of one request. Token rotation in the parent session is reflected on the next call via the closure-supplied token getter.

## SDK

Uses the official [`@modelcontextprotocol/sdk@^1.29.0`](https://github.com/modelcontextprotocol/typescript-sdk) (v1 line — v2 is still pre-alpha as of 2026).