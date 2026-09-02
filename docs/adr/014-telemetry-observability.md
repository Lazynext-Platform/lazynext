# ADR-014: Telemetry and Observability

## Date
2026-08-28

## Status
Accepted

## Context
As the platform grew to 90+ API routes with provider routing, tool execution, and credit charging, there was no structured logging for monitoring or analytics. When a tool execution failed or a provider routed to a fallback model, there was no way to detect or aggregate these events.

Cloudflare Workers capture `console.log` output, but it was unstructured and difficult to query.

## Decision
1. Created `src/lib/telemetry.ts` with two structured logging functions:
   - `logToolExecution(event)` — logs tool name, userId, cost, duration, success/failure
   - `logProviderRouting(event)` — logs capability, planTier, selectedModel, fallback flag
2. Both emit JSON to `console.log` with a `type` field and ISO timestamp
3. Wired into:
   - `src/app/api/creative/tools/execute/route.ts` — logs every tool execution
   - `src/lib/providers/model-helpers.ts` — logs every model routing decision

## Consequences
- Tool execution and provider routing events are now queryable in Cloudflare Worker logs
- No external dependencies added — uses `console.log` only
- Logs are lightweight JSON (single line per event)
- Future: can be aggregated into a dashboard or alerting system
- The `provider_routing` log fires once at module load time (when `intelligence.ts` imports `getLLMModel()`) — this is expected and harmless
