# External Reference Architectures

**Purpose:** Distilled concept map of the three platform repositories referenced
during the Lazynext transformation. These are **conceptual references only** —
no proprietary code, branding, designs, text, assets, secrets, or protected
implementation is copied. Useful concepts are re-implemented natively inside
Lazynext's existing Next.js / Cloudflare / Prisma stack.

**Last verified:** 2026-09-11

---

## Rules of Engagement

1. Study these repos for architecture patterns, agent designs, and product concepts.
2. Do NOT copy proprietary code, branding, designs, text, assets, secrets.
3. Do NOT merge external architectures blindly (Python/FastAPI, Durable Objects, etc.).
4. Extract useful concepts and implement them natively inside Lazynext.
5. The Lazynext repository remains the single source of truth and canonical codebase.

---

## 1. ujjwalredd/Autonomous-AI-Company-Operating-System

**Stack:** Python 3.11+, Anthropic Claude API, Supabase (PostgreSQL), Redis 5.x
(message bus + episodic memory), ChromaDB + LlamaIndex (RAG), Docker Compose.

**Architecture:** Event-driven message bus (Redis Streams) with consumer groups
for exactly-once delivery. Company brain in Supabase. Episodic memory in Redis
(24h TTL). Knowledge base in ChromaDB.

### Concepts to transplant into Lazynext

| Concept | What it does | Lazynext implementation target |
|---------|-------------|-------------------------------|
| **Reward engine** | Weighted task scoring (QA 30%, time 20%, no-regression 20%, code quality 15%, attempt count 15%) → reward/correction prompts stored in agent memory | `src/lib/services/reward-engine.ts` + `AgentPerformance` model |
| **Retry/escalation ladder** | 5-rung: standard → +episodic → +knowledge → decompose → escalate | `agent-runtime.ts` retry logic |
| **Episodic memory** | 24h short-term event storage per agent for context window | `MemoryType` extension + cron sweep |
| **Tiered model selection** | Cost-optimized: Sonnet for engineering/strategy, Haiku for support/ops | `RouteOptions.agentRole` in model router |
| **Milestone rewards** | Broadcast celebration prompts on significant achievements | `EventService` broadcast |
| **Agent memory integration** | Reward/correction history stored as JSONB, used as reinforcement | `Memory` model (type `outcome`/`lesson`) |

### What we do NOT take

- Python/FastAPI runtime (Lazynext is Next.js/TypeScript)
- Redis as message bus (Lazynext uses D1 Event model + cron)
- Supabase (Lazynext uses Prisma + D1/SQLite)
- ChromaDB (Lazynext uses existing search/knowledge)
- E2B sandbox (Lazynext has SandboxService)

---

## 2. janwilmake/openpolsia

**Stack:** TypeScript, Cloudflare Workers, Durable Objects, D1, Stripe,
wrangler.json. Polsia-like clone on Cloudflare-native infrastructure.

**Architecture:** Per-company Durable Object with own DB (documents, tasks,
chat, email, logs). Master D1 for users/balance/companies/transactions.
Google Login. Subdomain routing (`*.openpolsia.com` → worker → DO). SSE for
dashboard auto-update. Stripe for billing ($50/m/company + $1/task after 50
free). LLM operator with file-hierarchy system prompt + tools (writeFile,
readFile, justBash, listTasks, createTask, editTask, sendMail, readMail,
webSearch, webFetch).

### Concepts to transplant into Lazynext

| Concept | What it does | Lazynext implementation target |
|---------|-------------|-------------------------------|
| **Wow-moment bootstrapper** | Research person → build+deploy landing page → tweet → setup email → make docs/tasks | `src/lib/services/company-bootstrap.ts` |
| **Per-company public websites** | `website/*` docs served on subdomains | `/sites/[companySlug]/[[...path]]` + host routing |
| **Company email identity** | `{slug}@domain` inbound+outbound | `send_company_email` executor + inbound webhook |
| **SSE live activity feed** | Dashboard auto-updates via SSE | `/api/companies/[id]/activity/stream` |
| **Task-metered pricing** | $50/m/company + $1/task after free tier | Existing credit system (reference only) |
| **LLM operator with file-hierarchy prompts** | System prompt is a file hierarchy + tools | Existing agent-runtime (reference only) |

### What we do NOT take

- Durable Objects (Lazynext uses D1 + cron, not per-company DOs)
- Their specific Stripe pricing model (Lazynext uses Dodo Payments + credits)
- Their LLM operator (Lazynext has its own agent-runtime + tool executors)
- Their frontend (Lazynext has its own Next.js UI)

---

## 3. PolsiaAI/Polsia (official repo)

**Stack:** Next.js frontend, FastAPI backend, Celery + Redis, PostgreSQL,
specialized AI agents. Claude Code CLI as agent execution mechanism.

**Status:** Public but incomplete — open issue reports missing core `app/`
backend package. Treat as conceptual reference only, not a buildable foundation.

### Concepts to transplant into Lazynext

| Concept | What it does | Lazynext implementation target |
|---------|-------------|-------------------------------|
| **Specialized business agents** | Strategy, Engineering, Marketing, Comms, Ops | Already have 12 agent roles |
| **Celery-style recurring jobs** | Scheduled agent execution | Existing durable-exec cron |
| **Redis event distribution** | Real-time activity feed | D1 Event model + SSE |
| **Live activity stream** | Watch AI work in real-time | SSE endpoint + LiveActivityFeed |
| **Multi-company fleet** | Run multiple companies simultaneously | Existing Company model |
| **Integrations** | GitHub, email, Meta Ads, X, Stripe | Existing integration framework |

### What we do NOT take

- FastAPI/Celery/Redis backend (Lazynext is Next.js/Cloudflare)
- Their specific agent implementations (incomplete in public repo)
- Any proprietary code or branding

---

## 4. Polsia.com (live product, positioning reference)

**Positioning:** "AI that runs your company while you sleep."

**Key product attributes:**
- Autonomous AI co-founder (not an assistant that waits for prompts)
- Specialized agent network: Strategy, Engineering, Marketing, Comms, Ops
- Persistent memory threads + MCP integrations
- Live activity stream (polsia.com/live)
- Multi-company support
- Self-improving workflows
- AI co-founder personality (pushes back on bad ideas)

**Traction claims:** 800+ active companies, $700K+ ARR (managed), raising its
own round (AI negotiating with VCs).

**What Lazynext adopts from this positioning:**
- The "autonomous company operating system" framing
- Live activity feed as a core UX element
- Multi-company fleet as a first-class concept
- Agent personality (co-founder, not assistant)

---

## Summary: What each reference contributes

```
AACOS (Python)     → Reward engine, escalation ladder, episodic memory, model tiers
openpolsia (CF)     → Wow-moment bootstrapper, public websites, email identity, SSE feed
PolsiaAI (Python)  → Specialized agents, recurring jobs, live stream (concepts only)
Polsia.com (live)  → Positioning, UX framing, product identity
```

All re-implemented natively in Lazynext's Next.js / Cloudflare / Prisma stack.
No external codebases merged. No proprietary material copied.
