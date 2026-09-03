# Lazynext — Public REST API v1

**Version:** 1.0.0
**Status:** Active
**Base URL:** `https://lazynext.com/api/v1`

---

## 1. Overview

The Lazynext Public REST API provides programmatic access to workspaces, projects, tasks, documents, files, creative generation, automations, agents, integrations, webhooks, usage, and audit data. The API is versioned, authenticated via API keys with scopes, tenant-isolated, rate-limited, and uses cursor-based pagination.

All API handlers are thin adapters that call the **same Application Services** (`src/lib/services/*`) as the web UI and the MCP server. There is one business-logic layer, not three.

---

## 2. Base URL & Versioning

| Environment | Base URL |
|---|---|
| Production | `https://lazynext.com/api/v1` |
| Staging | `https://staging.lazynext.com/api/v1` |
| Local | `http://localhost:3100/api/v1` |

### Versioning strategy

- Version is in the URL path: `/api/v1/...`.
- **Deprecation policy:** 12-month minimum sunset window. When `v2` is released, `v1` continues to function for at least 12 months with deprecation headers (`Sunset`, `Deprecation`).
- Breaking changes require a new major version. Non-breaking changes (new fields, new endpoints) are additive within `v1`.
- OpenAPI spec is auto-generated from route schemas and served at `/developers/docs`.

---

## 3. Authentication

### 3.1 API keys

All requests must include an API key as a Bearer token:

```
Authorization: Bearer lk_live_a1b2c3d4e5f6...
```

API keys are created in the Developer Platform (`/developers/api-keys`). Each key has:
- A **public key ID** (`keyId`, stored in `ApiCredential.keyId`, unique).
- A **hashed secret** (`keyHash`, stored in `ApiCredential.keyHash`). The raw secret is shown **once** at creation and never again.
- **Scopes** (`scopes`, stored as `String[]`).
- A `lastUsedAt` timestamp.
- A `revokedAt` timestamp (nullable; when set, the key is revoked).

### 3.2 Scopes

Scopes follow a `resource:action` pattern. Per-endpoint scope checks are enforced at the gateway.

| Scope | Grants |
|---|---|
| `workspace:read` | List/get workspaces |
| `project:read` | List/get projects |
| `project:write` | Create/update/delete projects |
| `task:read` | List/get tasks |
| `task:write` | Create/update/delete tasks |
| `document:read` | List/get documents |
| `document:write` | Create/update documents |
| `file:read` | List/get file metadata + download |
| `file:write` | Upload files |
| `creative:read` | List generators, get creation status |
| `creative:write` | Run generators |
| `automation:read` | List automations |
| `automation:write` | Create/trigger automations |
| `agent:read` | List agents |
| `agent:write` | Run agents |
| `integration:read` | List integrations |
| `integration:write` | Initiate OAuth connections |
| `webhook:read` | List webhook endpoints |
| `webhook:write` | Register/update webhooks |
| `usage:read` | Get usage metrics |
| `audit:read` | Get audit log |

### 3.3 Workspace context

Every request resolves a workspace context from the API key + `X-Workspace-Id` header:

```
X-Workspace-Id: ws_a1b2c3d4
```

The workspace is resolved **server-side** from the authenticated user's memberships. The client cannot specify a workspace they are not a member of. Every database query is filtered by the resolved `workspaceId`.

---

## 4. Endpoints

### 4.1 Workspaces

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/workspaces` | `workspace:read` | List user's workspaces |
| GET | `/api/v1/workspaces/{id}` | `workspace:read` | Get workspace |

### 4.2 Projects

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/projects` | `project:read` | List projects |
| POST | `/api/v1/projects` | `project:write` | Create project |
| GET | `/api/v1/projects/{id}` | `project:read` | Get project |
| PATCH | `/api/v1/projects/{id}` | `project:write` | Update project |
| DELETE | `/api/v1/projects/{id}` | `project:write` | Delete project |

### 4.3 Tasks

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/projects/{id}/tasks` | `task:read` | List tasks in a project |
| POST | `/api/v1/projects/{id}/tasks` | `task:write` | Create task |
| GET | `/api/v1/tasks/{id}` | `task:read` | Get task |
| PATCH | `/api/v1/tasks/{id}` | `task:write` | Update task |
| DELETE | `/api/v1/tasks/{id}` | `task:write` | Delete task |

### 4.4 Documents

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/documents` | `document:read` | List documents |
| POST | `/api/v1/documents` | `document:write` | Create document |
| GET | `/api/v1/documents/{id}` | `document:read` | Get document |
| PATCH | `/api/v1/documents/{id}` | `document:write` | Update document |

### 4.5 Files

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/files` | `file:read` | List files |
| POST | `/api/v1/files` | `file:write` | Upload file |
| GET | `/api/v1/files/{id}` | `file:read` | Get file metadata |
| GET | `/api/v1/files/{id}/content` | `file:read` | Download file (signed URL) |

### 4.6 Creative Studio

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/creative/generators` | `creative:read` | List available generators |
| POST | `/api/v1/creative/generators/{slug}` | `creative:write` | Run a generator |
| GET | `/api/v1/creative/creations/{id}` | `creative:read` | Get creation status |

### 4.7 Automations

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/automations` | `automation:read` | List automations |
| POST | `/api/v1/automations` | `automation:write` | Create automation |
| POST | `/api/v1/automations/{id}/run` | `automation:write` | Trigger automation |

### 4.8 Agents

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/agents` | `agent:read` | List agents |
| POST | `/api/v1/agents/{id}/run` | `agent:write` | Run an agent |

### 4.9 Integrations

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/integrations` | `integration:read` | List integrations |
| POST | `/api/v1/integrations/{provider}/connect` | `integration:write` | Initiate OAuth |

### 4.10 Webhooks

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/webhooks` | `webhook:read` | List webhook endpoints |
| POST | `/api/v1/webhooks` | `webhook:write` | Register webhook |

### 4.11 Usage & Audit

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/usage` | `usage:read` | Get usage metrics |
| GET | `/api/v1/audit` | `audit:read` | Get audit log |

---

## 5. Pagination

Pagination is **cursor-based**. List endpoints accept `?cursor=...&limit=...`.

### Request parameters

| Parameter | Type | Default | Max | Purpose |
|---|---|---|---|---|
| `cursor` | string | `null` | — | Opaque cursor from previous response |
| `limit` | integer | `25` | `100` | Number of items per page |

### Response envelope

```json
{
  "data": [ /* items */ ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6ImNsaWJ..."
  }
}
```

The `nextCursor` is an opaque, base64-encoded token. Pass it as `?cursor=` on the next request. When `hasMore` is `false`, there are no more pages.

---

## 6. Rate Limits

Rate limiting is enforced at the gateway via **Cloudflare rate limiter bindings** (distributed, not in-memory). Limits are per API key.

| Endpoint class | Rate limit | Scope |
|---|---|---|
| Standard endpoints | 60 requests / minute | All non-AI endpoints |
| AI generation endpoints | 10 requests / minute | `/api/v1/creative/generators/*`, `/api/v1/agents/*/run` |

### Rate limit headers

Every response includes rate limit headers:

| Header | Purpose |
|---|---|
| `X-RateLimit-Limit` | Maximum requests per minute |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

When the limit is exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header.

---

## 7. Error Format (RFC 9457 Problem Details)

All errors follow **RFC 9457 Problem Details for HTTP APIs**. The response body is a problem details object with stable error codes.

### Error response

```json
{
  "type": "https://lazynext.com/errors/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "Your API key does not have the project:write scope required for this endpoint.",
  "instance": "/api/v1/projects",
  "code": "insufficient_scope",
  "requestId": "req_a1b2c3d4e5f6"
}
```

### Standard error codes

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `bad_request` | Malformed request body or parameters |
| 401 | `unauthenticated` | Missing or invalid API key |
| 403 | `insufficient_scope` | API key lacks required scope |
| 403 | `forbidden` | Authenticated but not authorized for this resource |
| 404 | `not_found` | Resource does not exist or is not in this workspace |
| 409 | `conflict` | Idempotency key reuse with different payload |
| 422 | `validation_error` | Request body failed schema validation |
| 429 | `rate_limited` | Rate limit exceeded |
| 500 | `internal_error` | Unexpected server error |
| 503 | `service_unavailable` | Dependency failure (Atlas, D1, R2) |

Every response includes an `X-Request-Id` header. The `requestId` is generated per request, echoed in the response body, and included in server logs for tracing.

---

## 8. Idempotency

Mutation endpoints (POST, PUT, PATCH) accept an `Idempotency-Key` header:

```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

When the same `Idempotency-Key` is reused within 24 hours with the same request body, the API returns the original response instead of creating a duplicate. If the same key is reused with a **different** body, the API returns `409 Conflict`.

The `CreditLedger` model enforces idempotency at the database level via `@@unique([userId, idempotencyKey])` to prevent double-charging in pipeline stage operations.

---

## 9. Webhooks

### 9.1 Outbound webhooks

Users register webhook endpoints via the API or Developer Platform. When a subscribed event occurs, Lazynext sends an HTTP POST to the registered URL with an HMAC-signed payload.

### Webhook payload

```json
{
  "event": "project.created",
  "workspaceId": "ws_a1b2c3d4",
  "timestamp": "2026-09-03T12:00:00Z",
  "data": {
    "id": "prj_...",
    "name": "Q4 Campaign"
  }
}
```

### Signature verification

Every webhook includes a `X-Lazynext-Signature` header containing the HMAC-SHA256 signature of the payload body, computed using the endpoint's signing secret:

```
X-Lazynext-Signature: sha256=a1b2c3d4e5f6...
```

Recipients should verify the signature before processing the payload. Delivery attempts are recorded in `WebhookDelivery` with `status` (pending | delivered | failed) and `attempts` count.

### 9.2 Inbound webhooks

Inbound webhooks (Dodo Payments, integrations) are received at `/api/webhook/*` and verified via signature validation (Dodo SDK + provider-specific signatures).

---

## 10. API Key Management

### Creating a key

1. Navigate to `/developers/api-keys` in the web UI.
2. Click "Create API Key."
3. Name the key, select scopes, and optionally set an expiry.
4. The raw secret is displayed **once**. Store it securely; it cannot be recovered.

### Key properties

| Property | Description |
|---|---|
| `keyId` | Public key identifier (shown in UI, safe to log) |
| `keyHash` | Hashed secret (never shown after creation) |
| `scopes` | Array of `resource:action` strings |
| `lastUsedAt` | Timestamp of last API call (updated on each request) |
| `revokedAt` | When set, the key is permanently revoked |
| `createdAt` | Creation timestamp |

### Revoking a key

Keys can be revoked from `/developers/api-keys`. Revocation sets `revokedAt` to the current timestamp. Revoked keys immediately fail authentication with `401 unauthenticated`.

### Key rotation

To rotate a key: create a new key, update your application to use the new key, then revoke the old key. There is no automatic rotation; the 12-month deprecation policy does not apply to API keys (they are user-managed).

---

*End of Public REST API v1 documentation.*
