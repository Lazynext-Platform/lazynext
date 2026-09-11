# ADR-224: Agent Runtime Upgrades — Reward Engine, Escalation, Episodic Memory

**Date:** 2026-09-15
**Status:** Accepted
**Supersedes:** None

## Context

The existing agent runtime executed tasks with basic retry but lacked:
- A reward/performance system to score task quality and improve future runs
- A structured escalation ladder for handling failures
- Episodic memory to record what worked and what didn't
- Role-aware model routing to use cheaper models for simple tasks

The `Autonomous-AI-Company-Operating-System` reference demonstrated these
concepts using Redis and Supabase. Lazynext needed them mapped onto its
existing Prisma + Event + Memory + cron primitives.

## Decision

**Add four runtime upgrades natively:**

1. **Reward engine** (`src/lib/services/reward-engine.ts`) — scores each
   completed agent run on a 0-100 scale based on verification pass rate,
   elapsed time vs. expected, regressions, quality score, and attempt count.
   Persists aggregate stats to `AgentDef.performanceStats` (JSON column).

2. **Escalation ladder** (in `agent-runtime.ts`) — 5 rungs:
   1. Standard retry
   2. Add episodic context from similar past runs
   3. Add broader knowledge context
   4. Decompose the task into subtasks
   5. Escalate to human

3. **Episodic memory** (in `memory.ts`) — new `episodic` memory type with
   24h TTL. Records run outcomes (success/failure, reward score, context).
   Swept by the durable-exec cron.

4. **Tiered model routing** (in `providers/router.ts`) — `agentRole` in
   `RouteOptions` maps to a tier (quality/balanced/cost). Engineering roles
   get quality tier; support roles get cost tier; research gets balanced.

## Consequences

- Agents learn from past runs via episodic memory.
- Failures escalate through a structured ladder rather than infinite retries.
- Model selection is role-aware, reducing cost for simple tasks.
- Performance stats are visible on the `/agent-performance` dashboard.
- Schema change: `performanceStats` JSON column on `AgentDef`.
- 31 new tests (reward engine + escalation + routing).
