# Lazynext — Product Strategy

**Date:** 2026-09-03
**Status:** Active
**Depends on:** `DISCOVERY-REPORT-PHASE0.md`, `ARCHITECTURE-PHASE1.md`

---

## 1. Product Vision

> **Lazynext is a unified operating system for people, teams, organizations, workflows, information, tools, applications, automation, AI, integrations, data, and digital work.**

Lazynext is not a "dashboard with links." It is a coherent platform where a global shell provides navigation, workspace switching, search, command palette, notifications, account, theme, locale, and session controls. **Modules** are the actual work surfaces (Creative Studio, Projects, Documents, Automations, AI Agents, Integrations, Admin, Developer Platform). A single domain model and service layer underpin all modules, the public API, and the MCP server — there is one business-logic layer, not three.

### Vision statement

Lazynext replaces tool sprawl with a single operating system for digital work. Where teams today stitch together 5–15 SaaS tools (project management, docs, files, creative tools, automation, AI, analytics, developer APIs), Lazynext provides all of these as first-class modules within one coherent platform — with a unified identity layer, permission system, workspace context, search, and design system.

---

## 2. Target Customers

### 2.1 Professionals (individuals)

| Attribute | Detail |
|---|---|
| **Who** | Freelancers, solopreneurs, independent creators, consultants, developers |
| **Team size** | 1 |
| **Primary needs** | Creative production, task management, documents, AI agents, personal automations |
| **Pain points** | Juggling multiple tools; no unified workspace; AI tools are disconnected from work context |
| **Value prop** | One OS for all digital work — creative, productivity, AI, and developer tools in one place |
| **Pricing sensitivity** | High; needs a viable free tier + affordable Pro |
| **Acquisition** | Product-led growth; organic search; content marketing; community |

### 2.2 Teams (small to medium)

| Attribute | Detail |
|---|---|
| **Who** | Marketing teams, creative agencies, product teams, startup teams (5–50 people) |
| **Team size** | 5–50 |
| **Primary needs** | Collaboration, shared workspaces, projects, tasks, approvals, shared creative assets, team automations |
| **Pain points** | Tool sprawl tax (cost + context switching + integration maintenance); siloed data; inconsistent permissions |
| **Value prop** | Unified workspace with roles, shared projects, collaborative creative production, and team-wide automations |
| **Pricing sensitivity** | Medium; willing to pay per-seat for productivity gains |
| **Acquisition** | Team-led adoption (one user brings team); referrals; targeted outreach |

### 2.3 Organizations (enterprise)

| Attribute | Detail |
|---|---|
| **Who** | Mid-market and enterprise companies (50+ people) with multiple teams, compliance needs, developer integrations |
| **Team size** | 50–1000+ |
| **Primary needs** | Multi-workspace management, SSO/SAML, roles & permissions, audit logs, DPA, SLA, public API, MCP server |
| **Pain points** | Compliance requirements (GDPR, DPDP, CCPA); security review overhead; custom integrations; vendor management |
| **Value prop** | Enterprise-grade platform OS with compliance controls, developer platform, and AI capabilities — replacing multiple enterprise tools |
| **Pricing sensitivity** | Low; value-based pricing; custom contracts |
| **Acquisition** | Sales-led; RFP responses; security documentation; enterprise referrals |

---

## 3. Ideal Customer Profile (ICP)

### Primary ICP: AI-native marketing/creative teams (5–50 people)

| Criterion | Detail |
|---|---|
| **Industry** | E-commerce, DTC brands, digital marketing agencies, media companies |
| **Team size** | 5–50 |
| **Tech maturity** | High — already uses AI tools, automation, APIs |
| **Current stack** | 5–10 SaaS tools (project mgmt + docs + creative + AI + analytics + automation) |
| **Annual spend on tools** | $10K–$50K (replaceable budget) |
| **Key jobs** | Produce ad creatives at scale, manage campaigns, collaborate on content, automate workflows, analyze performance |
| **Why Lazynext** | Creative Studio (existing strength) + full OS (projects, tasks, docs, automations, AI agents) + developer API/MCP — replaces 5+ tools |

### Secondary ICP: Independent professionals building AI-powered workflows

| Criterion | Detail |
|---|---|
| **Who** | Solo creators, indie developers, AI automation consultants |
| **Team size** | 1–3 |
| **Key jobs** | Generate creative content, build AI agents, automate personal workflows, ship API integrations |
| **Why Lazynext** | Free/Pro tier with AI agents, automations, and developer platform — one tool instead of many |

---

## 4. Jobs-to-be-Done (JTBD)

### 4.1 Core jobs

| Job | When... | I want to... | So I can... |
|---|---|---|---|
| **Organize work** | I have multiple projects running | Create projects with tasks, docs, and files in one place | Track all my work without switching tools |
| **Produce creative content** | I need ad creatives, videos, or marketing copy | Use AI-powered creative tools with brand consistency | Ship campaigns faster with less manual effort |
| **Automate workflows** | I repeat the same tasks daily | Build automations that trigger on events or schedules | Save time and reduce manual errors |
| **Deploy AI agents** | I need AI to do multi-step work | Define agents with tools, instructions, and memory | Delegate complex tasks to AI within my workspace |
| **Manage knowledge** | My team's information is scattered | Create documents and a searchable knowledge base | Find information quickly and keep it organized |
| **Integrate tools** | I use external services (Google, Meta, Slack) | Connect them via OAuth and use them in automations | Keep data flowing without manual copy-paste |
| **Analyze performance** | I need to understand what's working | View cross-module analytics dashboards | Make data-driven decisions |
| **Build on the platform** | I want to extend Lazynext programmatically | Use the public API and MCP server | Integrate Lazynext into my custom workflows |
| **Collaborate** | My team needs to work together | Share workspaces, assign tasks, discuss in threads | Work as a team without silos |
| **Stay compliant** | I operate in regulated jurisdictions | Have proper legal docs, data controls, and audit trails | Meet legal obligations and build trust |

### 4.2 Job priority by customer segment

| Job | Professionals | Teams | Organizations |
|---|---|---|---|
| Produce creative content | High | High | Medium |
| Organize work | High | High | High |
| Deploy AI agents | High | Medium | Medium |
| Automate workflows | High | High | High |
| Manage knowledge | Medium | High | High |
| Integrate tools | Medium | High | High |
| Analyze performance | Medium | High | High |
| Build on the platform | High | Medium | High |
| Collaborate | Low | High | High |
| Stay compliant | Low | Medium | High |

---

## 5. Competitor Categories

| Category | Examples | What they do well | Lazynext advantage |
|---|---|---|---|
| **All-in-one work OS** | Notion, ClickUp, Monday, Asana | Broad features, strong brand, large user base | Native AI agents + Creative Studio + developer platform + MCP in one OS |
| **Project management** | Linear, Jira, Trello, Basecamp | Deep PM workflows, integrations | PM as a module within a broader OS, not standalone |
| **Knowledge/docs** | Notion, Confluence, Obsidian | Rich editing, wikis, search | Docs unified with projects, tasks, files, and AI |
| **Creative/ad tools** | Canva, Figma, AdCreative.ai, Pencil | Ad-creative generation, design | AI-native Creative Studio with pipelines, not just templates |
| **Automation** | Zapier, n8n, Make, Workato | Integration breadth, visual builders | Native automations within the OS, not external connector |
| **AI agent platforms** | AutoGPT, LangChain, CrewAI, AgentGPT | Agent orchestration, tool calling | Agents run inside OS with access to all modules + MCP |
| **Developer platforms** | Vercel, Supabase, Firebase, Stripe | APIs, SDKs, webhooks, docs | Unified API + MCP server for platform extensibility |
| **Team collaboration** | Slack, Microsoft Teams, Discord | Real-time communication | Threaded conversations tied to work objects |

---

## 6. Defensible Positioning

### 6.1 Positioning statement

> **For teams and professionals who use 5–15 SaaS tools to manage digital work, Lazynext is the operating system that unifies project management, knowledge, creative production, AI agents, automations, integrations, and a developer platform into one coherent workspace. Unlike standalone tools that require stitching and integration tax, Lazynext provides a single identity layer, permission system, search, and design system — with native AI and an MCP server for extensibility.**

### 6.2 Defensibility vectors

| Vector | Description |
|---|---|
| **Breadth + coherence** | No competitor unifies all these categories in one OS. Stitching tools is expensive and fragile. |
| **Native AI** | AI agents and creative generation are first-class modules, not bolt-ons. Agents have access to all workspace data and tools. |
| **MCP server** | Lazynext exposes its entire platform via the MCP protocol — AI assistants (Claude, Cursor) can operate Lazynext directly. No competitor offers this. |
| **Developer platform** | Public API v1 + webhooks + API keys with scopes. Developers build on Lazynext, creating switching costs. |
| **Creative Studio heritage** | The existing 178-route ad-creative surface is a mature, differentiated capability that competitors in the work-OS space lack. |
| **Workspace tenancy** | Proper workspace/org/team/role/permission model enables enterprise-grade multi-tenancy that standalone creative tools lack. |
| **Design system** | Neo-Brutalist design is distinctive and memorable, creating brand differentiation in a sea of generic SaaS UIs. |

### 6.3 Anti-positioning (what Lazynext is NOT)

- NOT a standalone project management tool (it's an OS with PM as a module)
- NOT a standalone creative/ad tool (Creative Studio is one module of many)
- NOT a no-code app builder (modules are first-class applications, not user-built)
- NOT an AI chatbot (AI agents are a platform capability, not the whole product)
- NOT a Zapier replacement (automations are native to the OS, not an external connector)

---

## 7. Pricing Architecture

### 7.1 Principles

1. **Hybrid model:** Subscription tiers provide base access + included credits; additional credit packs for metered AI/usage.
2. **Value-aligned:** AI generation is metered (credits); platform access is subscription (per-seat or flat).
3. **Land and expand:** Free tier lets individuals try; Pro converts them; Team expands to teams; Enterprise captures organizations.
4. **Transparent:** Clear pricing page; no hidden fees; credit costs visible before generation.

### 7.2 Subscription tiers

| Tier | Price | Workspaces | Members | Modules | Credits/mo | API access | Target |
|---|---|---|---|---|---|---|---|
| **Free** | $0 | 1 | 3 | Core (Dashboard, Projects, Tasks, Documents, Files, Calendar, People) | 50 | No | Individuals |
| **Pro** | $19/mo | 1 | Unlimited | All modules + Creative Studio + AI Agents + Automations | 500 | Limited (100 calls/day) | Professionals |
| **Team** | $49/mo/seat | Multiple | Unlimited | All modules + Admin + Integrations + Developer Platform | 2,000/seat | Full (rate-limited) | Teams (5–50) |
| **Enterprise** | Custom | Unlimited | Unlimited | All + SSO/SAML + DPA + SLA + custom limits | Custom | Full + custom limits | Organizations (50+) |

### 7.3 Credit packs (one-time, additive)

| Pack | Price | Credits | Notes |
|---|---|---|---|
| Starter | $9 | 100 | Keep existing pricing |
| Growth | $39 | 500 | Keep existing pricing |
| Scale | $99 | 1,500 | Keep existing pricing |

### 7.4 Credit consumption model

Credits are consumed by metered actions:
- AI creative generation: 1–8 credits per generation (varies by complexity)
- AI agent runs: 1–5 credits per run (varies by tokens used)
- API calls (Pro/Team): 1 credit per 100 calls (beyond included quota)
- Storage: 1 credit per GB/month (beyond included quota)

### 7.5 Billing infrastructure

- **Payment processor:** Dodo Payments (existing)
- **Subscription model:** Recurring billing via Dodo; webhook at `/api/webhook/dodo`
- **Credit ledger:** `UsageRecord` model (generalized from `CreditLedger`)
- **Invoices:** `Invoice` model (new)
- **Subscriptions:** `Subscription` model (new) with plan, status, renewal dates

---

## 8. Module Taxonomy

The full OS vision includes the following modules. Each has a clear reason to exist — no module is added merely to lengthen a feature list.

| Module | Purpose | Why it exists |
|---|---|---|
| **Dashboard** | Landing surface after login: overview of workspace activity, recent objects, pinned items, system status | Every OS needs a home screen |
| **Creative Studio** | Consolidates all 178 ad-creative routes into one module with sub-features (pipelines, generators, brand, performance, compliance) | Preserves the existing product value; stops being the entire product |
| **Projects** | Project management: projects contain tasks, documents, files, conversations | Core OS primitive for organizing work |
| **Tasks** | Task management within projects and standalone; kanban/list/timeline views | Productivity primitive |
| **Documents** | Rich-text documents and knowledge base; wiki-like | Information primitive |
| **Files** | File/asset management with storage, sharing, versioning | Data primitive |
| **Automations** | Workflow builder + automation rules; triggers → actions; scheduled jobs | Automation is a core OS capability |
| **AI Agents** | Agent definitions, tool calling, runs, memory, evaluation | AI as a platform capability, not the whole product |
| **Integrations** | OAuth connections, API credentials, webhook endpoints, integration catalog | Platform extensibility |
| **Calendar** | Unified calendar across projects, scheduled posts, automations | Time-based coordination |
| **People** | Contacts, team members, organization members, presence | Collaboration primitive |
| **Conversations** | Threaded discussions (replaces ad-creative comments, generalized) | Communication primitive |
| **Analytics** | Cross-module analytics dashboards; usage, performance, audit | Insight primitive |
| **Search** | Global search across all objects (respects authorization) | OS-level discoverability |
| **Settings** | User preferences, workspace settings, org settings, billing, security, privacy | Control primitive |
| **Admin** | User/org/workspace administration, roles, permissions, audit logs, system health | Control plane |
| **Developer Platform** | API keys, API docs, MCP endpoint, webhooks, usage metrics | Developer surface |
| **Legal** | Terms, privacy, cookie policy, AUP, AI policy, DPA, subprocessors, data rights | Compliance surface |

### Module relationships

```
Organization
  └── Workspace (tenant boundary)
        ├── Teams (sub-groups for assignment)
        ├── Projects
        │     ├── Tasks
        │     ├── Documents
        │     └── Files
        ├── Documents (workspace-level)
        ├── Files (workspace-level)
        ├── Creative Studio
        │     ├── Assets / Creations
        │     ├── Pipelines
        │     ├── Generators
        │     └── Campaigns
        ├── Automations
        ├── AI Agents
        │     └── Agent Runs
        ├── Integrations
        │     └── Connections
        ├── Calendar
        ├── People (Members + Contacts)
        ├── Conversations
        ├── Analytics
        └── Webhooks
```

---

## 9. Go-to-Market Strategy (summary)

### 9.1 Phasing

| Phase | GTM focus | Target |
|---|---|---|
| **Launch (Phases 2–4)** | Product-led; free tier; organic search; "one OS for digital work" | Professionals + early teams |
| **Growth (Phases 5–6)** | Developer ecosystem; MCP integrations; API partnerships; content marketing | Teams + developers |
| **Scale (Phases 7–12)** | Sales-led enterprise; security documentation; compliance; SSO | Organizations |

### 9.2 Key messaging pillars

1. **One OS, not 15 tools:** Replace tool sprawl with a unified platform.
2. **AI-native, not AI-bolted-on:** Agents and creative AI are first-class modules.
3. **Built for developers:** Public API + MCP server + webhooks.
4. **Enterprise-ready:** Workspaces, roles, audit, compliance, SSO.
5. **Distinctive by design:** Neo-Brutalist design system — memorable, not generic.

---

## 10. Success Metrics

| Metric | Target (12 months) |
|---|---|
| Free tier signups | 50,000 |
| Pro conversions | 5% (2,500) |
| Team workspaces | 500 |
| Enterprise customers | 20 |
| MRR | $150K |
| API keys issued | 10,000 |
| MCP connections | 5,000 |
| Module adoption (3+ modules used) | 60% of active users |

---

*This strategy is a living document. It should be revisited quarterly with customer feedback, market analysis, and product metrics.*
