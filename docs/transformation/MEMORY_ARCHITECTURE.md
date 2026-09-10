# Lazynext — Memory Architecture

**Date:** 2026-09-04
**Status:** Design — to be implemented in Phase 10

---

## Company Memory System

Memory is scoped to a Company (via Workspace). Agents receive relevant memory as context, not the entire memory store.

## Memory Types

| Type | Description | Lifecycle | Confidence |
|---|---|---|---|
| Fact | Stable information (e.g., "company was founded in 2024") | Long-lived, expires only when explicitly updated | High |
| Knowledge | Research and reference information (e.g., "competitor X launched feature Y") | Medium-lived, expires when outdated | Medium (has source) |
| Decision | Why the company chose something (e.g., "chose Atlas over OpenAI for cost reasons") | Long-lived | High |
| Preference | User/company preferences (e.g., "prefer concise communication") | Long-lived, user-editable | High |
| Outcome | What happened (e.g., "campaign X achieved 3x ROAS") | Medium-lived | High (measured) |
| Lesson | What should change (e.g., "video ads outperform image ads for this audience") | Long-lived | Medium (derived) |
| Active Context | Current priorities and projects | Short-lived, updated frequently | High |
| Historical Context | Past events and outcomes | Long-lived, archival | High |

## Memory Record Structure

```typescript
interface Memory {
  id: string;
  workspaceId: string;     // company scope
  type: 'fact' | 'knowledge' | 'decision' | 'preference' | 'outcome' | 'lesson' | 'active_context' | 'historical_context';
  content: string;          // the memory content
  source: string;           // where this memory came from (agent, user, system, external)
  sourceId?: string;        // ID of the source (agentRunId, userId, etc.)
  timestamp: Date;
  confidence: number;       // 0.0 - 1.0
  owner: string;            // who owns this memory
  accessPolicy: string;     // who can read/write
  lifecycle: 'permanent' | 'long' | 'medium' | 'short';
  expiresAt?: Date;         // when this memory should be reviewed/expired
  provenance: {
    createdBy: string;
    createdAt: Date;
    verifiedBy?: string;
    verifiedAt?: Date;
  };
  tags?: string[];          // for search/retrieval
  relatedMemoryIds?: string[]; // links to related memories
}
```

## Context Engine

Agents must receive **relevant** context, not the entire memory store. Context assembly considers:

| Factor | Weight | Description |
|---|---|---|
| Current objective | High | What the agent is trying to achieve |
| Current task | High | What specific task is being executed |
| Relevant memories | High | Memories tagged with related concepts |
| Related documents | Medium | Documents in the same project/area |
| Recent events | Medium | Last N events in the workspace |
| Active policies | Medium | Policies that apply to this action |
| Previous attempts | High | If this task was attempted before, what happened |
| Relevant metrics | Medium | KPIs/metrics related to the objective |
| External evidence | Low | Research/knowledge from external sources |

### Context Assembly

```typescript
interface ContextAssemblyConfig {
  maxTokens: number;        // context window limit
  maxMemories: number;      // max memories to include
  maxDocuments: number;     // max documents to include
  priorityWeights: Record<ContextFactor, number>;
  timeWindowDays: number;   // only include recent items
}

function assembleContext(
  agentId: string,
  taskId: string,
  config: ContextAssemblyConfig
): AgentContext {
  // 1. Fetch relevant memories (by tag, type, recency, confidence)
  // 2. Fetch related documents (by project, tags)
  // 3. Fetch recent events (last N)
  // 4. Fetch active policies
  // 5. Fetch previous attempts (same task or similar)
  // 6. Fetch relevant metrics
  // 7. Rank and truncate to fit context window
  // 8. Return assembled context
}
```

## Memory Lifecycle

### Writing
- Agents write memories after task completion (outcomes, lessons)
- Users can create/edit/delete memories (facts, preferences, decisions)
- System writes memories for significant events (active context, historical context)
- **Never blindly save every model output as truth** — verify before storing as fact

### Reading
- Agents read memories via context engine (relevant subset)
- Users can browse/search all memories
- Memory access respects workspace tenancy

### Expiration
- Short-lived memories (active context) expire after days
- Medium-lived memories (knowledge, outcomes) expire after months
- Long-lived memories (facts, decisions, preferences) expire only when explicitly updated
- Expired memories are reviewed by an agent or user, then renewed or archived

### Provenance
- Every memory records who created it, when, and from what source
- Memories can be verified by a user or agent
- Unverified memories have lower confidence
- Contradictory memories are flagged for resolution
