# Lazynext — Autonomy Model

**Date:** 2026-09-04
**Status:** Design — to be implemented in Phases 7-11

---

## Autonomous Company Loop

```
OBSERVE
→ UNDERSTAND
→ PRIORITIZE
→ PLAN
→ SELECT AGENT
→ SELECT TOOLS
→ CHECK POLICIES
→ REQUEST APPROVAL IF REQUIRED
→ EXECUTE
→ VERIFY
→ MEASURE
→ RECORD RESULT
→ UPDATE MEMORY
→ REPLAN
→ CONTINUE
```

## Loop Implementation

The loop is implemented as a **durable workflow** using the extended WorkflowEngine. Each iteration is a WorkflowRun with WorkflowSteps for each phase. State persists in D1, so the loop survives worker crashes and restarts.

### Loop State Machine

| State | Description | Next States |
|---|---|---|
| idle | No active loop | observing |
| observing | Gathering company state, metrics, events | understanding |
| understanding | Analyzing state, identifying issues/opportunities | prioritizing |
| prioritizing | Ranking work by impact/urgency/cost | planning |
| planning | Creating plan (tasks, dependencies, agents) | selecting_agent |
| selecting_agent | Choosing agent for next task | selecting_tools |
| selecting_tools | Choosing tools for the task | checking_policies |
| checking_policies | Validating permissions and policies | requesting_approval / executing |
| requesting_approval | Waiting for user approval | executing / cancelled |
| executing | Agent executing the task | verifying |
| verifying | Checking task output against criteria | measuring / failed |
| measuring | Recording metrics and outcomes | recording_result |
| recording_result | Storing result in memory and audit | updating_memory |
| updating_memory | Updating company memory with learnings | replanning |
| replanning | Adjusting plan based on results | observing / completed |
| completed | Loop finished (no more work or time/budget expired) | idle |
| paused | User paused the loop | observing (on resume) |
| stopped | User stopped the loop | (terminal) |
| failed | Unrecoverable error | (terminal or retrying) |
| retrying | Recovering from transient failure | executing |

## Autonomy Modes

| Mode | Behavior | Implementation |
|---|---|---|
| Manual | User explicitly starts each action | Loop only runs one iteration per user trigger |
| Assisted | AI proposes, waits for confirmation | Loop pauses at `requesting_approval` for every action |
| Autonomous | AI executes authorized actions automatically | Loop runs continuously; only high-risk actions require approval |
| Timed Continuous | User defines duration/window | Loop runs until time expires, budget reached, or user stops |

## Safety Controls

### Pause/Stop
- User can pause the loop at any time (state → `paused`)
- User can stop the loop at any time (state → `stopped`)
- Pause/stop are server-side state changes, not just UI

### Budget Enforcement
- Before each `executing` step, check budget
- If budget exceeded → state → `completed` with reason "budget_exceeded"
- Budgets checked at: company, workspace, agent, task levels

### Approval Gating
- High-risk actions require approval (state → `requesting_approval`)
- Risk classification determines if approval is needed
- Approval timeout → action cancelled

### Rate Limiting
- Agent actions rate-limited per agent, per tool, per integration
- Rate limit hit → backoff and retry

### Idempotency
- Each task execution has an idempotency key
- Duplicate events don't cause double execution

## Failure Recovery

| Failure | Recovery |
|---|---|
| Worker crash | Loop state in D1; on restart, resume from last persisted state |
| Transient API failure | Retry with exponential backoff (configurable per tool) |
| Rate limit hit | Backoff and retry |
| Tool timeout | Mark task as failed; optionally retry with different tool/agent |
| Approval timeout | Cancel action; mark task as blocked |
| Budget exceeded | Stop loop; notify user |
| Partial completion | Task state persists; resume from last completed step |
| Duplicate event | Idempotency key prevents double execution |

## Loop Configuration

```typescript
interface LoopConfig {
  mode: 'manual' | 'assisted' | 'autonomous' | 'timed';
  duration?: number; // seconds (for timed mode)
  budgetLimit?: number; // credits
  maxIterations?: number;
  agentIds: string[]; // available agents
  toolIds: string[]; // available tools
  riskThreshold: 'low' | 'medium' | 'high'; // max risk without approval
  pauseOnFailure: boolean;
  notifyOnApproval: boolean;
}
```
