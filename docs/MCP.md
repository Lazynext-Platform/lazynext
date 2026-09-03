# Lazynext — MCP Server Documentation

**Protocol version:** `2026-07-28`
**Server name:** `lazynext`
**Server version:** `1.0.0`
**Endpoint:** `https://lazynext.com/mcp`
**Implementation:** `src/app/mcp/route.ts`

---

## 1. Overview

The Lazynext MCP (Model Context Protocol) server exposes the Lazynext operating system to AI clients (Claude, Cursor, etc.) via the **2026-07-28** protocol revision. It is a **stateless** remote server using **Streamable HTTP** transport. MCP tools wrap the same Application Services (`src/lib/services/*`) used by the web UI and the REST API — there is one business-logic layer, not three.

### Key protocol characteristics

- **Stateless core:** No `initialize`/`initialized` handshake. No `Mcp-Session-Id` header. Every request carries protocol version + client capabilities in `_meta`.
- **Streamable HTTP:** Single POST endpoint. No stdio (this is a remote server). No GET stream. No SSE resumability (`Last-Event-ID` removed).
- **`server/discover` required:** Replaces `initialize`. Servers MUST implement this to advertise supported versions, capabilities, and identity.
- **Per-request metadata:** `_meta` carries `io.modelcontextprotocol/protocolVersion` (required), client info, and client capabilities.

---

## 2. Protocol Version

```
PROTOCOL_VERSION = '2026-07-28'
```

The server implements the `2026-07-28` stable release. There is **no legacy `initialize` support** and no fallback to older protocol versions. Clients sending an unsupported version receive `UnsupportedProtocolVersionError` (error code `-32022`).

### Version validation

Every request (not notification) must include `_meta.io.modelcontextprotocol/protocolVersion`. The server validates:

1. If `_meta.io.modelcontextprotocol/protocolVersion` is missing → `400` with `UnsupportedProtocolVersionError` and message `"Missing io.modelcontextprotocol/protocolVersion in _meta"`.
2. If the version does not match `2026-07-28` → `400` with `UnsupportedProtocolVersionError` and message `"Unsupported protocol version: {version}. Expected: 2026-07-28"`.

---

## 3. Transport — Streamable HTTP

### 3.1 Single POST endpoint

The MCP server is a single endpoint at `POST /mcp`. Clients send JSON-RPC 2.0 requests. The server responds with `application/json` or `text/event-stream` (for streaming results).

```
POST /mcp
Content-Type: application/json
Accept: application/json, text/event-stream
```

### 3.2 Notifications

Notifications (JSON-RPC requests with no `id`) receive `202 Accepted` with no response body. The server does not process notification payloads beyond acknowledging receipt.

### 3.3 HTTP methods

| Method | Purpose |
|---|---|
| `POST` | JSON-RPC request/notification handling |
| `GET` | Server metadata (name, version, protocol version, transports, auth endpoint) |
| `DELETE` | Not used — returns `405` (stateless protocol: session deletion not applicable) |

### 3.4 GET metadata

`GET /mcp` returns server metadata for discovery:

```json
{
  "server": {
    "name": "lazynext",
    "version": "1.0.0",
    "protocolVersion": "2026-07-28"
  },
  "endpoint": "/mcp",
  "transports": ["streamable-http"],
  "authentication": "/.well-known/oauth-protected-resource"
}
```

---

## 4. Stateless Core (No initialize)

The `2026-07-28` revision removes the `initialize`/`initialized` handshake entirely. There is no `Mcp-Session-Id` header. Every request is self-contained: it carries its own protocol version and client capabilities in `_meta`.

### What this means for clients

- No handshake step. A client can call `tools/list` or `tools/call` as its first request.
- No session state on the server. Each request is processed independently.
- `server/discover` is available for clients that want to probe capabilities before making calls, but it is not required before other RPCs.

---

## 5. server/discover Requirement

`server/discover` replaces `initialize`. Servers MUST implement it. Clients MAY call it before any other request to discover supported versions, capabilities, and server identity.

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28"
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "result": {
    "resultType": "server.discover",
    "server": {
      "name": "lazynext",
      "version": "1.0.0",
      "protocolVersion": "2026-07-28",
      "capabilities": {
        "tools": { "listChanged": false },
        "resources": { "listChanged": false },
        "prompts": { "listChanged": false }
      },
      "metadata": {
        "description": "Lazynext operating system MCP server",
        "documentation": "https://lazynext.com/docs/mcp"
      }
    }
  },
  "id": 1
}
```

---

## 6. _meta Requirements

Every request (not notification) must include `_meta` with the following fields:

| Field | Required | Purpose |
|---|---|---|
| `io.modelcontextprotocol/protocolVersion` | **Yes** | Protocol version; must be `2026-07-28` |
| `io.modelcontextprotocol/clientInfo` | No | Client name + version |
| `io.modelcontextprotocol/clientCapabilities` | No | Client capabilities (tools, resources, prompts) |
| `io.modelcontextprotocol/logLevel` | No | Per-request log level |

### Example _meta

```json
{
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    },
    "io.modelcontextprotocol/clientCapabilities": {
      "tools": { "listChanged": true }
    }
  }
}
```

---

## 7. OAuth 2.1 Protected-Resource Metadata

The Lazynext MCP server is an **OAuth 2.1 resource server**. Lazynext's own auth system acts as the authorization server. Protected Resource Metadata is published at:

```
/.well-known/oauth-protected-resource
```

This follows RFC 9728 (Protected Resource Metadata) and RFC 8414 (Authorization Server Metadata). The metadata document tells clients how to obtain access tokens for the resource server.

### Authentication methods

| Method | Use case |
|---|---|
| OAuth 2.1 access token (Bearer) | Interactive clients (Claude Desktop, Cursor) |
| API key (Bearer token) | Non-interactive clients, automation |

Both methods resolve to the same Application Services with the same authorization checks. The `Authorization: Bearer <token>` header is validated by the MCP gateway middleware before routing to handlers.

---

## 8. Tools

### 8.1 tools/list

Returns the full list of Lazynext tools with deterministic order.

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28"
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "result": {
    "resultType": "tools.list",
    "tools": [ /* tool definitions */ ]
  },
  "id": 2
}
```

### 8.2 Tool inventory

| Tool | Description | Required args | Result type |
|---|---|---|---|
| `list_workspaces` | List all workspaces the authenticated user is a member of | (none) | `workspaces` |
| `get_workspace` | Get details of a specific workspace | `workspaceId` | `workspace` |
| `list_projects` | List projects in a workspace | `workspaceId` | `projects` |
| `create_project` | Create a new project in a workspace | `workspaceId`, `name`, `description?` | `project` |
| `list_tasks` | List tasks in a project | `projectId` | `tasks` |
| `create_task` | Create a new task in a project | `projectId`, `title`, `description?`, `priority?` | `task` |
| `list_documents` | List documents in a workspace | `workspaceId` | `documents` |
| `get_document` | Get a document by ID | `documentId` | `document` |
| `search` | Search across projects, tasks, documents, and creative work | `query` | `search_results` |

### 8.3 Tool input schemas

Each tool defines a JSON Schema for its input. Example (`create_task`):

```json
{
  "name": "create_task",
  "description": "Create a new task in a project.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "title": { "type": "string" },
      "description": { "type": "string" },
      "priority": { "type": "string", "enum": ["low", "medium", "high", "urgent"] }
    },
    "required": ["projectId", "title"]
  },
  "resultType": "task"
}
```

### 8.4 tools/call

Invokes a tool. The tool name and arguments are passed in `params`.

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_task",
    "arguments": {
      "projectId": "prj_abc123",
      "title": "Review Q4 creative briefs",
      "priority": "high"
    }
  },
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28"
  }
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "result": {
    "resultType": "task",
    "toolName": "create_task",
    "args": {
      "projectId": "prj_abc123",
      "title": "Review Q4 creative briefs",
      "priority": "high"
    },
    "content": [
      {
        "type": "text",
        "text": "Tool \"create_task\" was called. Authentication and execution will be wired in the next sub-phase."
      }
    ]
  },
  "id": 3
}
```

> **Note:** The current implementation returns a structured placeholder indicating the tool was recognized. Full authentication and execution wiring is completed in the next sub-phase, at which point `content` returns the actual tool result from the Application Service.

### 8.5 Unknown tool

If the tool name does not match any defined tool, the server returns error code `-32601`:

```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32601, "message": "Unknown tool: {toolName}" },
  "id": 3
}
```

---

## 9. Resources & Prompts

### 9.1 resources/list

Returns Lazynext resources:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "resultType": "resources.list",
    "resources": [
      { "uri": "lazynext://workspaces", "name": "Workspaces", "description": "List of accessible workspaces" },
      { "uri": "lazynext://projects", "name": "Projects", "description": "List of accessible projects" }
    ]
  },
  "id": 4
}
```

### 9.2 prompts/list

Returns an empty prompt list (predefined workflows are planned for a future phase):

```json
{
  "jsonrpc": "2.0",
  "result": {
    "resultType": "prompts.list",
    "prompts": []
  },
  "id": 5
}
```

---

## 10. Other RPCs

### 10.1 ping

Returns a pong result. (Note: `ping` is deprecated in the 2026-07-28 revision but still implemented for client compatibility during the deprecation window.)

```json
{
  "jsonrpc": "2.0",
  "result": { "resultType": "pong" },
  "id": 6
}
```

### 10.2 Method not found

Unknown methods return error code `-32601`:

```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32601, "message": "Method not found: {method}" },
  "id": 7
}
```

---

## 11. Authorization Model

### 11.1 Authentication

All `tools/call` requests require authentication via `Authorization: Bearer <token>`. The token is either:
- An **OAuth 2.1 access token** issued by the Lazynext authorization server (for interactive clients).
- An **API key** (for non-interactive clients).

### 11.2 Authorization

Tool calls are authorized based on scopes, mirroring the REST API scope system:

| Tool | Scope required |
|---|---|
| `list_workspaces` | `workspace:read` |
| `get_workspace` | `workspace:read` |
| `list_projects` | `project:read` |
| `create_project` | `project:write` |
| `list_tasks` | `task:read` |
| `create_task` | `task:write` |
| `list_documents` | `document:read` |
| `get_document` | `document:read` |
| `search` | (various — depends on result types) |

### 11.3 Workspace context

Like the REST API, the MCP server resolves workspace context **server-side** from the authenticated identity. Tools that accept a `workspaceId` or `projectId` validate that the authenticated user has access to that workspace before executing. This prevents BOLA/IDOR (see API_SECURITY.md).

### 11.4 Shared service layer

MCP tool handlers call the **same Application Services** as the REST API and UI. Authorization is enforced in the service layer, not duplicated in the MCP adapter. This ensures consistent behavior across all surfaces.

---

## 12. Security Considerations

### 12.1 Origin validation (DNS rebinding prevention)

The server validates the `Origin` header on all connections. If `Origin` is present (browser clients), it must match the `Host` header or be `localhost`/`127.0.0.1`. Non-browser clients may omit `Origin` (allowed). Invalid origins receive `403` with error code `-32600`.

```typescript
function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) return true; // Non-browser clients may not send Origin
  try {
    const url = new URL(origin);
    if (url.host === host) return true;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}
```

### 12.2 Protocol version enforcement

The `MCP-Protocol-Version` header must match `_meta.io.modelcontextprotocol/protocolVersion`. Mismatches return `400`. Unknown versions return `UnsupportedProtocolVersionError` (`-32022`).

### 12.3 JSON-RPC validation

All requests are validated as JSON-RPC 2.0:
- `jsonrpc` must be `"2.0"` → else `-32600` Invalid Request.
- Parse errors → `-32700` Parse error.

### 12.4 Rate limiting

MCP requests are rate-limited via the same Cloudflare rate limiter bindings as the REST API. Per-token limits apply.

### 12.5 No session state

Because the protocol is stateless, there is no session to hijack. Each request is independently authenticated and authorized.

### 12.6 Error code reference

| Code | Meaning |
|---|---|
| `-32700` | Parse error (invalid JSON) |
| `-32600` | Invalid Request (not JSON-RPC 2.0, invalid origin) |
| `-32601` | Method not found / Unknown tool |
| `-32000` | UnsupportedProtocolVersionError (missing version) |
| `-32022` | UnsupportedProtocolVersionError (wrong version) |

---

## 13. Capabilities Advertised

| Capability | Status |
|---|---|
| `tools` | `listChanged: false` |
| `resources` | `listChanged: false` |
| `prompts` | `listChanged: false` |
| `extensions` | `io.modelcontextprotocol/tasks` (planned) |

### Planned capabilities (future phases)

- `tools.listChanged: true` — tool list change notifications via `subscriptions/listen`.
- `resources.listChanged: true` — resource change notifications.
- `subscriptions/listen` — long-lived SSE stream for change notifications.
- `tasks/get` + `tasks/update` — Tasks extension for long-running operations.
- MRTR (`input_required` result type) for multi-round-trip requests.

---

## 14. Connection Guide

### 14.1 For interactive clients (Claude Desktop, Cursor)

1. Obtain an OAuth 2.1 access token from the Lazynext authorization server (see `/.well-known/oauth-protected-resource`).
2. Configure the MCP client with:
   - URL: `https://lazynext.com/mcp`
   - Transport: Streamable HTTP
   - Auth: Bearer token
3. Call `server/discover` to verify connectivity.
4. Call `tools/list` to enumerate available tools.
5. Call `tools/call` to invoke tools.

### 14.2 For non-interactive clients (automation)

1. Create an API key at `/developers/api-keys` with the required scopes.
2. Send requests with `Authorization: Bearer <api-key>`.
3. Include `_meta.io.modelcontextprotocol/protocolVersion: "2026-07-28"` on every request.

### 14.3 Example session

```
→ POST /mcp  { method: "server/discover", _meta: { protocolVersion: "2026-07-28" } }
← 200        { result: { resultType: "server.discover", server: { ... } } }

→ POST /mcp  { method: "tools/list", _meta: { protocolVersion: "2026-07-28" } }
← 200        { result: { resultType: "tools.list", tools: [ ... ] } }

→ POST /mcp  { method: "tools/call", params: { name: "list_workspaces", arguments: {} }, _meta: { ... } }
← 200        { result: { resultType: "workspaces", content: [ ... ] } }
```

---

*End of MCP Server documentation.*
