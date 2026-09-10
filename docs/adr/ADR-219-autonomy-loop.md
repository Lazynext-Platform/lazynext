# ADR-219: Autonomous Loop State Machine

**Date:** 2026-09-08
**Status:** Accepted
**Supersedes:** None

## Context

The agent runtime was one-shot: an agent run executed a single plan-to-completion
pass and then terminated. There was no mechanism for continuous autonomous
execution — agents could not observe their environment, decide on next actions,
act, reflect on outcomes, and loop back to observe again. This limited the
platform to batch-style task execution and prevented true autonomous operation
where agents monitor company state and respond to changing conditions over time.

Without a formal state machine, pause/resume/stop semantics were ad-hoc, budget
and approval gating had no consistent insertion point, and there was no auditable
record of which phase of the autonomy cycle an agent was in.

## Decision

**Implement a 12-state autonomy state machine** in
`src/lib/services/autonomy-loop.ts` with a defined transition graph and four
autonomy modes.

The 12 states form a continuous cycle:

```
IDLE → OBSERVE → UNDERSTAND → PLAN → PROPOSE → APPROVE → EXECUTE →
MONITOR → REFLECT → LEARN → REPORT → CONTINUE → (back to OBSERVE)
```

The four autonomy modes govern how the loop progresses:

1. **Manual** — every state transition requires human approval
2. **Assisted** — execution requires approval; observation/planning proceed autonomously
3. **Autonomous** — the loop runs continuously, gating only on budget/risk thresholds
4. **Timed Continuous** — the loop runs on a fixed schedule with autonomous transitions

Budget enforcement and approval gating are inserted at well-defined transition
points (PROPOSE → APPROVE and EXECUTE → MONITOR), giving every autonomous run a
consistent, auditable control surface. The loop supports pause, resume, and stop
operations that can be invoked by founders/admins at any state.

## Consequences

- Agents can now run continuously, observing company state and responding to
  changes without requiring a new run for each action
- Pause/resume/stop are first-class operations available at any state, giving
  founders/admins reliable control over autonomous execution
- Budget and approval gating are enforced at consistent transition points, so
  no autonomous action can bypass spending controls or required approvals
- Every loop iteration produces an auditable state-transition record, enabling
  after-the-fact review of what an agent observed, decided, and did
- The state machine adds runtime overhead per cycle (state persistence +
  transition validation), which is acceptable given the control benefits
- Timed Continuous mode introduces scheduling concerns that must be coordinated
  with the durable job engine to avoid runaway loops
