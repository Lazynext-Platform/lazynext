# Lazynext Operating System

**Lazynext** is a unified operating system for individuals, professionals, teams, and organizations — providing identity, workspaces, projects, tasks, documents, files, automations, AI agents, integrations, analytics, search, a developer API, an MCP server, and a Creative Studio module for AI ad generation powered by [Atlas Cloud](https://www.atlascloud.ai).

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020)](https://workers.cloudflare.com/)
[![Powered by Atlas Cloud](https://img.shields.io/badge/powered%20by-Atlas%20Cloud-00b2fc)](https://www.atlascloud.ai)

> One environment for your entire workflow. Identity is unified, data is unified, permissions are unified, and every module shares the same platform core.

## What Lazynext is

Lazynext is a platform OS with a global shell and a set of modules that run inside it. Each module is a first-class application with its own navigation, data, and actions, but all modules share the OS shell, identity layer, permission system, workspace context, search, command palette, and design system.

### Platform modules

| Module | Purpose |
|---|---|
| **Dashboard** | Workspace overview: activity, recent objects, pinned items, system status |
| **Creative Studio** | AI ad generation: UGC ads, reference remakes, drama ads, ad skits, 150+ creative tools |
| **Projects** | Project management with tasks, documents, files, and conversations |
| **Tasks** | Task management within projects and standalone; kanban/list views |
| **Documents** | Rich-text documents and knowledge base |
| **Files** | File/asset management with R2 storage, sharing, and versioning |
| **Automations** | Workflow builder with triggers, conditions, and scheduled jobs |
| **AI Agents** | Agent definitions, tool calling, runs, and memory |
| **Integrations** | OAuth connections, API credentials, webhook endpoints, integration catalog |
| **Calendar** | Unified calendar across projects, scheduled posts, and automations |
| **People** | Contacts, team members, organization members, and presence |
| **Conversations** | Threaded discussions across modules |
| **Analytics** | Cross-module analytics dashboards, usage, performance, and audit |
| **Search** | Global search across all objects (authorization-filtered) |
| **Settings** | User preferences, workspace settings, org settings, billing, security, privacy |
| **Admin** | User/org/workspace administration, roles, permissions, audit logs, system health |
| **Developer Platform** | API keys, REST API v1, MCP endpoint, webhooks, usage metrics |
| **Legal** | Terms, privacy, cookie policy, AUP, AI policy, DPA, subprocessors, data rights |

### Platform primitives

All modules build on shared domain concepts: User, Identity, Session, Organization, Workspace, Team, Membership, Role, Permission, Project, Task, Document, File, Asset, Conversation, Integration, Automation, Agent, Tool, ApiCredential, WebhookEndpoint, Event, Notification, AuditEvent, Subscription, Invoice, UsageRecord, and ScheduledJob.

### Creative Studio

The Creative Studio module preserves the original ad-creative product value within the OS framework. It includes:

- **UGC Product Ad** — Product + presenter photos → lip-synced UGC ad
- **Reference to Ad** — Upload a viral ad → remake it with your product
- **AI Drama Ad** — One topic → comedy script → shot-by-shot drama ad
- **Ad Skit** — One-line product → two-person comedy skit
- **150+ creative tools** — Hook generators, brand voice analyzers, A/B testing, performance forecasting, competitor intelligence, compliance checking, and more

All workflows auto-detect input language and support 13 locales.

## Who it is for

- Professionals and teams who want a unified workspace instead of fragmented tools
- Organizations that need shared identity, permissions, and data across modules
- E-commerce teams and agencies that need AI ad creative production within a broader platform
- Developers who want a public API and MCP server for programmatic access
- Businesses that need audit trails, compliance, and enterprise-grade security

## Quick start

```bash
git clone https://github.com/Lazynext-Platform/lazynext.git
cd lazynext
npm install
```

For local development:

```bash
cp .env.example .env.local
# Fill auth, Atlas Cloud, Dodo Payments, and Resend values.
npm run dev    # starts on port 3100
```

For Cloudflare/OpenNext preview:

```bash
cp .dev.vars.example .dev.vars
npm run cf:preview
```

Core application variables:

```env
ATLASCLOUD_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3100
AUTH_URL=http://localhost:3100
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAILS=support@lazynext.com
```

Platform resources:

| Platform | Database | Media storage |
|---|---|---|
| Cloudflare | D1 binding `DB` | R2 binding `MEDIA_BUCKET` |

Where to get each value:

| Variable | Where to get it | Notes |
|---|---|---|
| `ATLASCLOUD_API_KEY` | [Atlas Cloud API Keys](https://www.atlascloud.ai/docs/api-keys) | Create an Atlas Cloud API key for image, video, LLM, TTS, and lip-sync generation. |
| `NEXTAUTH_SECRET` | [NextAuth secret](https://next-auth.js.org/configuration/options#nextauth_secret) | Generate locally with `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` | [Google Cloud OAuth clients](https://console.cloud.google.com/auth/clients) | Create a Web application OAuth client for Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | [Google Cloud OAuth clients](https://console.cloud.google.com/auth/clients) | Copy the client secret from the same Web application OAuth client. |
| `DODO_PAYMENTS_API_KEY` | [Dodo Payments Dashboard](https://app.dodopayments.com/) | Required when `PAYMENT_PROVIDER=dodo`. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | [Dodo Payments Dashboard](https://app.dodopayments.com/) | Required for Dodo webhook verification. |
| `RESEND_API_KEY` | [Resend Dashboard](https://resend.com/api-keys) | API key for transactional email delivery. |
| `FROM_EMAIL` | Resend Dashboard | Verified sender address (e.g. `Lazynext <support@lazynext.com>`). |
| `ADMIN_EMAILS` | — | Comma-separated admin email addresses. Production: `support@lazynext.com`. |
| `TOKEN_ENCRYPTION_KEY` | — | AES-256-GCM key for OAuth token encryption at rest. |
| `CRON_SECRET` | — | Secret for authenticated cron invocations. |

Open [http://localhost:3100](http://localhost:3100).

## Mock Atlas Cloud API (for local testing)

```bash
npm run mock-atlas    # starts on port 3099
```

The mock server returns realistic LLM responses, simulates generation task lifecycle, and serves placeholder media — without consuming real credits or making external API calls.

## Deploy

Lazynext deploys exclusively to Cloudflare Workers using OpenNext.

```bash
npm run cf:deploy
```

Cloudflare uses the `DB` D1 binding and `MEDIA_BUCKET` R2 binding in `wrangler.jsonc`. The deployment includes a custom domain route for `lazynext.com`.

Set application secrets with Wrangler or the dashboard:

```bash
wrangler secret put ATLASCLOUD_API_KEY
wrangler secret put NEXTAUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY
wrangler secret put CRON_SECRET
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for resource creation, database initialization, and verification commands.

## Developer Platform

### Public REST API (v1)

Lazynext exposes a versioned REST API at `/api/v1/` with API key authentication, scopes, and rate limits. Endpoints cover workspaces, projects, tasks, and documents.

- API key management at `/settings` → Developer
- OpenAPI-style documentation at `/developers`
- Rate limits: 60 req/min (standard), 10 req/min (AI endpoints)

### MCP Server

Lazynext includes a production-ready MCP (Model Context Protocol) server at `/api/mcp` implementing the `2026-07-28` protocol specification:

- Stateless core (no initialize/handshake)
- Streamable HTTP transport
- OAuth 2.1 protected-resource metadata
- Tools: `list_workspaces`, `get_workspace`, `list_projects`, `create_task`, `list_tasks`, `search`, and more
- Every tool requires authentication and workspace scoping
- MCP metadata at `/.well-known/oauth-protected-resource`

## Credits and pricing

Users spend in-app credits while the deployment pays Atlas Cloud in USD. Credit packs are available at $9/$39/$99 with ~30 display currencies.

`src/lib/video-pricing.ts` calculates video credits:

```text
credits = ceil(perSecond[resolution] * seconds * ACCOUNT_MARKUP * MARGIN / CREDIT_USD)
```

Top-up packs live in `src/config/pricing.ts`.

## Testing

```bash
npm test           # 6817+ unit tests
npm run test:e2e   # 1000+ E2E tests (Playwright)
npm run lint       # ESLint (0 errors)
npm run build      # Production build
```

## Technical architecture

```
lazynext/
├── src/
│   ├── app/                    # Next.js 16 App Router
│   │   ├── (OS modules)/       # dashboard, projects, tasks, documents, files, etc.
│   │   ├── creative/           # Creative Studio module
│   │   ├── api/v1/             # Public REST API
│   │   ├── api/mcp/            # MCP server (2026-07-28)
│   │   └── api/                # Internal API routes
│   ├── components/             # Reusable UI components
│   ├── config/                 # Navigation, pricing, app catalog
│   ├── i18n/                   # 13 locales with dynamic loading
│   └── lib/                    # Domain services, security, providers
├── prisma/schema.prisma        # 37 models, D1/SQLite
├── e2e/                        # Playwright E2E tests
├── test/                       # Unit tests
├── docs/adr/                   # 218 Architecture Decision Records
├── research/                   Discovery + architecture reports
├── auth.ts                     NextAuth v5 config
├── open-next.config.ts         OpenNext build target
└── wrangler.jsonc              Cloudflare deployment config
```

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, webpack) |
| UI | React 19 + Tailwind CSS 4 |
| Language | TypeScript 6 |
| Auth | NextAuth v5 (JWT, Google + Credentials) |
| ORM | Prisma 7 (D1 driver adapter) |
| Database | Cloudflare D1 (prod) / better-sqlite3 (local) |
| Storage | Cloudflare R2 (prod) / filesystem (local) |
| Deployment | Cloudflare Workers via OpenNext |
| AI provider | Atlas Cloud API |
| Payments | Dodo Payments |
| Email | Resend |
| E2E | Playwright |
| Design | Neo-Brutalist design system (light/dark/system themes) |

## License

MIT. See [LICENSE](./LICENSE). AI generation powered by [Atlas Cloud](https://www.atlascloud.ai).

Lazynext is a Lazynext-branded distribution built on the open-source [Atlas Marketing Studio](https://github.com/AtlasCloudAI/atlas-marketing-studio) project (MIT). All AI generation runs through the Atlas Cloud API.
