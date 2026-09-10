/**
 * Orchestration Service — multi-agent collaboration coordination.
 *
 * Enables multiple agents to collaborate on complex goals by:
 * - Creating collaboration sessions (stored as Memory records)
 * - Delegating subtasks between agents
 * - Sharing context between agents
 * - Resolving conflicts between agents
 * - Coordinating handoffs between agents
 * - Tracking agent workload and collaboration status
 * - Suggesting agents for a collaboration based on a goal
 *
 * Collaborations are stored as Memory records with type 'decision' and tags
 * including 'collaboration'. This avoids schema changes while providing a
 * queryable record of each collaboration session.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';

// ── Types ──

export interface CollaborationInput {
  goalId?: string;
  planId?: string;
  title: string;
  description: string;
  participantAgentIds: string[];
  coordinatorAgentId: string;
}

export interface CollaborationRecord {
  id: string;
  goalId?: string;
  planId?: string;
  title: string;
  description: string;
  participantAgentIds: string[];
  coordinatorAgentId: string;
  status: string;
  createdAt: string;
}

export interface DelegateTaskInput {
  taskId: string;
  fromAgentId: string;
  toAgentId: string;
  instructions?: string;
  priority?: string;
}

export interface ShareContextInput {
  fromAgentId: string;
  toAgentIds: string[];
  contextKey: string;
  contextValue: string;
  memoryType?: 'fact' | 'knowledge' | 'decision' | 'preference' | 'outcome' | 'lesson' | 'active_context' | 'historical_context';
}

export type ConflictResolution = 'first' | 'last' | 'merge' | 'escalate' | 'manual';

export interface ResolveConflictInput {
  taskId: string;
  conflictingAgentIds: string[];
  resolution: ConflictResolution;
  decidedBy: string;
  notes?: string;
}

export interface CoordinateHandoffInput {
  taskId: string;
  fromAgentId: string;
  toAgentId: string;
  handoffNotes?: string;
  status?: string;
}

export interface CollaborationStatus {
  collaboration: CollaborationRecord | null;
  participants: Array<{
    id: string;
    name: string;
    role: string;
    currentTasks: number;
    completedTasks: number;
    pendingTasks: number;
  }>;
  tasks: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  };
  conflicts: Array<{
    id: string;
    taskId: string;
    conflictingAgentIds: string[];
    resolution: string;
    createdAt: string;
  }>;
}

export interface AgentWorkload {
  agentId: string;
  agentName: string;
  agentRole: string;
  activeTasks: number;
  pendingTasks: number;
  completedTasks: number;
  collaborationCount: number;
}

export interface CollaborationSuggestion {
  goalId: string;
  goalTitle: string;
  suggestedParticipants: Array<{
    agentId: string;
    name: string;
    role: string;
    reason: string;
    matchedTaskCount: number;
  }>;
  suggestedCoordinator: {
    agentId: string;
    name: string;
    role: string;
    reason: string;
  } | null;
}

export interface CollaborationSummary {
  collaborationId: string;
  title: string;
  outcome: string;
  tasksCompleted: number;
  tasksTotal: number;
  participants: string[];
  endedAt: string;
}

// ── Helpers ──

/**
 * Parse a collaboration record from a Memory row.
 * The collaboration metadata is stored in the Memory's tags JSON and content.
 */
function parseCollaborationFromMemory(memory: {
  id: string;
  content: string;
  tags: string;
  sourceId: string | null;
  createdAt: Date;
}): CollaborationRecord | null {
  try {
    // The content stores the collaboration metadata as JSON
    const meta = JSON.parse(memory.content) as {
      goalId?: string;
      planId?: string;
      title?: string;
      description?: string;
      participantAgentIds?: string[];
      coordinatorAgentId?: string;
      status?: string;
    };
    return {
      id: memory.id,
      goalId: meta.goalId,
      planId: meta.planId,
      title: meta.title || 'Untitled Collaboration',
      description: meta.description || '',
      participantAgentIds: meta.participantAgentIds || [],
      coordinatorAgentId: meta.coordinatorAgentId || '',
      status: meta.status || 'active',
      createdAt: memory.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Serialize a collaboration record into the content string for storage.
 */
function serializeCollaboration(input: CollaborationInput, status: string): string {
  return JSON.stringify({
    goalId: input.goalId || null,
    planId: input.planId || null,
    title: input.title,
    description: input.description,
    participantAgentIds: input.participantAgentIds,
    coordinatorAgentId: input.coordinatorAgentId,
    status,
  });
}

// ── Orchestration Service ──

export const OrchestrationService = {
  /**
   * Create a multi-agent collaboration session.
   * Stored as a Memory with type 'decision' and tags including 'collaboration'.
   */
  async createCollaboration(
    workspaceId: string,
    organizationId: string,
    input: CollaborationInput,
  ): Promise<CollaborationRecord> {
    const correlationId = `orchestration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Create the collaboration record as a Memory
    const memory = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'decision',
        content: serializeCollaboration(input, 'active').slice(0, 10000),
        source: 'agent',
        sourceId: input.planId || input.goalId || null,
        confidence: 0.8,
        owner: input.coordinatorAgentId,
        lifecycle: 'medium',
        tags: JSON.stringify(['collaboration', 'orchestration', input.coordinatorAgentId]),
        createdBy: input.coordinatorAgentId,
      },
    });

    // 2. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'orchestration.collaboration_started',
      actor: input.coordinatorAgentId,
      actorType: 'agent',
      resourceType: 'memory',
      resourceId: memory.id,
      metadata: {
        title: input.title.slice(0, 200),
        participantCount: input.participantAgentIds.length,
        goalId: input.goalId,
        planId: input.planId,
      },
      correlationId,
    }).catch(() => {});

    return {
      id: memory.id,
      goalId: input.goalId,
      planId: input.planId,
      title: input.title,
      description: input.description,
      participantAgentIds: input.participantAgentIds,
      coordinatorAgentId: input.coordinatorAgentId,
      status: 'active',
      createdAt: memory.createdAt.toISOString(),
    };
  },

  /**
   * List collaboration sessions for a workspace.
   */
  async listCollaborations(
    workspaceId: string,
    opts?: { status?: string; take?: number },
  ): Promise<CollaborationRecord[]> {
    const take = Math.min(opts?.take || 50, 200);

    // Collaborations are stored as Memory records with 'collaboration' tag
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'decision',
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    []);

    // Filter to only those with 'collaboration' tag and parse
    const collaborations: CollaborationRecord[] = [];
    for (const m of memories) {
      const tags = JSON.parse(m.tags || '[]') as string[];
      if (!tags.includes('collaboration')) continue;
      const parsed = parseCollaborationFromMemory(m);
      if (parsed && (!opts?.status || parsed.status === opts.status)) {
        collaborations.push(parsed);
      }
    }

    return collaborations;
  },

  /**
   * Get a collaboration with participants and tasks.
   */
  async getCollaboration(id: string): Promise<{
    collaboration: CollaborationRecord | null;
    participants: Array<{ id: string; name: string; role: string; enabled: boolean }>;
    tasks: Array<{ id: string; title: string; status: string; assignedAgentId: string | null }>;
  }> {
    const memory = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);

    if (!memory) {
      return { collaboration: null, participants: [], tasks: [] };
    }

    const collaboration = parseCollaborationFromMemory(memory);
    if (!collaboration) {
      return { collaboration: null, participants: [], tasks: [] };
    }

    // Fetch participant agents
    const participants = await safePrisma(() =>
      prisma.agentDef.findMany({
        where: { id: { in: collaboration.participantAgentIds } },
        select: { id: true, name: true, role: true, enabled: true },
      }),
    []);

    // Fetch tasks linked to the plan (if planId present)
    let tasks: Array<{ id: string; title: string; status: string; assignedAgentId: string | null }> = [];
    if (collaboration.planId) {
      tasks = await safePrisma(() =>
        prisma.task.findMany({
          where: { planId: collaboration.planId },
          select: { id: true, title: true, status: true, assignedAgentId: true },
        }),
      []);
    }

    return { collaboration, participants, tasks };
  },

  /**
   * Delegate a task to a specific agent.
   */
  async delegateTask(
    workspaceId: string,
    collaborationId: string,
    input: DelegateTaskInput,
  ): Promise<{ id: string; title: string; status: string; assignedAgentId: string | null }> {
    const correlationId = `delegate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Update the task with the new assignee
    const updateData: Record<string, unknown> = {
      assignedAgentId: input.toAgentId,
      status: 'in_progress',
    };
    if (input.priority) {
      updateData.priority = input.priority;
    }

    const task = await prisma.task.update({
      where: { id: input.taskId },
      data: updateData,
      select: { id: true, title: true, status: true, assignedAgentId: true, projectId: true },
    });

    // 2. Get organizationId from the task's project workspace
    const project = await safePrisma(() =>
      prisma.project.findUnique({
        where: { id: task.projectId },
        select: { workspaceId: true },
      }),
    null);

    const organizationId = await this.getOrganizationId(workspaceId);

    // 3. Create a memory recording the delegation
    await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'decision',
      content: `Task delegated: ${task.title}. From agent ${input.fromAgentId} to agent ${input.toAgentId}. Instructions: ${input.instructions || 'none'}`.slice(0, 10000),
      source: 'agent',
      sourceId: collaborationId,
      confidence: 0.8,
      lifecycle: 'medium',
      tags: ['collaboration', 'delegation', collaborationId, input.taskId],
      createdBy: input.fromAgentId,
    }).catch(() => {});

    // 4. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'orchestration.task_delegated',
      actor: input.fromAgentId,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: input.taskId,
      metadata: {
        collaborationId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        taskId: input.taskId,
        priority: input.priority,
      },
      correlationId,
    }).catch(() => {});

    return task;
  },

  /**
   * Share context between agents.
   * Creates memory records for each recipient agent.
   */
  async shareContext(
    workspaceId: string,
    collaborationId: string,
    input: ShareContextInput,
  ): Promise<Array<{ id: string; content: string; owner: string | null }>> {
    const correlationId = `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = await this.getOrganizationId(workspaceId);
    const memoryType = input.memoryType || 'active_context';

    const memories: Array<{ id: string; content: string; owner: string | null }> = [];

    for (const toAgentId of input.toAgentIds) {
      const memory = await MemoryService.create({
        workspaceId,
        organizationId,
        type: memoryType,
        content: `Context shared [${input.contextKey}]: ${input.contextValue}`.slice(0, 10000),
        source: 'agent',
        sourceId: collaborationId,
        confidence: 0.8,
        owner: toAgentId,
        lifecycle: 'short',
        tags: ['collaboration', 'shared_context', collaborationId, input.contextKey],
        createdBy: input.fromAgentId,
      }).catch(() => null);

      if (memory) {
        memories.push({ id: memory.id, content: memory.content, owner: memory.owner });
      }
    }

    // Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'orchestration.context_shared',
      actor: input.fromAgentId,
      actorType: 'agent',
      resourceType: 'memory',
      resourceId: collaborationId,
      metadata: {
        collaborationId,
        fromAgentId: input.fromAgentId,
        toAgentIds: input.toAgentIds,
        contextKey: input.contextKey,
        recipientCount: input.toAgentIds.length,
      },
      correlationId,
    }).catch(() => {});

    return memories;
  },

  /**
   * Resolve a conflict between agents.
   */
  async resolveConflict(
    workspaceId: string,
    collaborationId: string,
    input: ResolveConflictInput,
  ): Promise<{
    id: string;
    taskId: string;
    conflictingAgentIds: string[];
    resolution: string;
    decidedBy: string;
    notes: string;
    createdAt: string;
  }> {
    const correlationId = `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = await this.getOrganizationId(workspaceId);

    // 1. Update the task status based on resolution
    let newStatus = 'in_progress';
    switch (input.resolution) {
      case 'first':
      case 'last':
      case 'merge':
        newStatus = 'in_progress';
        break;
      case 'escalate':
        newStatus = 'blocked';
        break;
      case 'manual':
        newStatus = 'awaiting_approval';
        break;
    }

    await prisma.task.update({
      where: { id: input.taskId },
      data: { status: newStatus },
    }).catch(() => {});

    // 2. Record the conflict resolution as a memory
    const memory = await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'decision',
      content: JSON.stringify({
        type: 'conflict_resolution',
        taskId: input.taskId,
        conflictingAgentIds: input.conflictingAgentIds,
        resolution: input.resolution,
        decidedBy: input.decidedBy,
        notes: input.notes || '',
        newStatus,
      }).slice(0, 10000),
      source: 'agent',
      sourceId: collaborationId,
      confidence: 0.9,
      lifecycle: 'medium',
      tags: ['collaboration', 'conflict_resolution', collaborationId, input.taskId],
      createdBy: input.decidedBy,
    }).catch(() => null);

    const resolutionId = memory?.id || `conflict-${input.taskId}-${Date.now()}`;

    // 3. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'orchestration.conflict_resolved',
      actor: input.decidedBy,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: input.taskId,
      metadata: {
        collaborationId,
        taskId: input.taskId,
        conflictingAgentIds: input.conflictingAgentIds,
        resolution: input.resolution,
        newStatus,
      },
      correlationId,
    }).catch(() => {});

    return {
      id: resolutionId,
      taskId: input.taskId,
      conflictingAgentIds: input.conflictingAgentIds,
      resolution: input.resolution,
      decidedBy: input.decidedBy,
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Coordinate a handoff between agents.
   */
  async coordinateHandoff(
    workspaceId: string,
    collaborationId: string,
    input: CoordinateHandoffInput,
  ): Promise<{
    id: string;
    taskId: string;
    fromAgentId: string;
    toAgentId: string;
    handoffNotes: string;
    status: string;
    createdAt: string;
  }> {
    const correlationId = `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = await this.getOrganizationId(workspaceId);

    // 1. Update task assignee
    const updateData: Record<string, unknown> = {
      assignedAgentId: input.toAgentId,
    };
    if (input.status) {
      updateData.status = input.status;
    }

    await prisma.task.update({
      where: { id: input.taskId },
      data: updateData,
    }).catch(() => {});

    // 2. Create a memory with handoff context
    const memory = await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'active_context',
      content: JSON.stringify({
        type: 'handoff',
        taskId: input.taskId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        handoffNotes: input.handoffNotes || '',
        status: input.status || 'in_progress',
      }).slice(0, 10000),
      source: 'agent',
      sourceId: collaborationId,
      confidence: 0.8,
      owner: input.toAgentId,
      lifecycle: 'short',
      tags: ['collaboration', 'handoff', collaborationId, input.taskId],
      createdBy: input.fromAgentId,
    }).catch(() => null);

    const handoffId = memory?.id || `handoff-${input.taskId}-${Date.now()}`;

    // 3. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'orchestration.handoff_completed',
      actor: input.fromAgentId,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: input.taskId,
      metadata: {
        collaborationId,
        taskId: input.taskId,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        status: input.status || 'in_progress',
      },
      correlationId,
    }).catch(() => {});

    return {
      id: handoffId,
      taskId: input.taskId,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      handoffNotes: input.handoffNotes || '',
      status: input.status || 'in_progress',
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Get the current status of a collaboration.
   */
  async getCollaborationStatus(collaborationId: string): Promise<CollaborationStatus> {
    const memory = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: collaborationId } }),
    null);

    if (!memory) {
      return {
        collaboration: null,
        participants: [],
        tasks: { total: 0, completed: 0, pending: 0, inProgress: 0 },
        conflicts: [],
      };
    }

    const collaboration = parseCollaborationFromMemory(memory);
    if (!collaboration) {
      return {
        collaboration: null,
        participants: [],
        tasks: { total: 0, completed: 0, pending: 0, inProgress: 0 },
        conflicts: [],
      };
    }

    // Fetch participant agents with task counts
    const agents = await safePrisma(() =>
      prisma.agentDef.findMany({
        where: { id: { in: collaboration.participantAgentIds } },
        select: { id: true, name: true, role: true, workspaceId: true },
      }),
    []);

    const participants: CollaborationStatus['participants'] = [];
    for (const agent of agents) {
      const [currentTasks, completedTasks, pendingTasks] = await Promise.all([
        safePrisma(() => prisma.task.count({
          where: { assignedAgentId: agent.id, status: 'in_progress' },
        }), 0),
        safePrisma(() => prisma.task.count({
          where: { assignedAgentId: agent.id, status: { in: ['done', 'verified'] } },
        }), 0),
        safePrisma(() => prisma.task.count({
          where: { assignedAgentId: agent.id, status: 'todo' },
        }), 0),
      ]);
      participants.push({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        currentTasks,
        completedTasks,
        pendingTasks,
      });
    }

    // Fetch tasks linked to the plan
    let tasksTotal = 0;
    let tasksCompleted = 0;
    let tasksPending = 0;
    let tasksInProgress = 0;

    if (collaboration.planId) {
      const tasks = await safePrisma(() =>
        prisma.task.findMany({
          where: { planId: collaboration.planId },
          select: { status: true },
        }),
      []);
      tasksTotal = tasks.length;
      tasksCompleted = tasks.filter((t) => t.status === 'done' || t.status === 'verified').length;
      tasksPending = tasks.filter((t) => t.status === 'todo').length;
      tasksInProgress = tasks.filter((t) => t.status === 'in_progress').length;
    }

    // Fetch conflicts (memories with 'conflict_resolution' tag for this collaboration)
    const conflictMemories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId: memory.workspaceId,
          type: 'decision',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    []);

    const conflicts: CollaborationStatus['conflicts'] = [];
    for (const cm of conflictMemories) {
      const tags = JSON.parse(cm.tags || '[]') as string[];
      if (!tags.includes('conflict_resolution') || !tags.includes(collaborationId)) continue;
      try {
        const meta = JSON.parse(cm.content) as {
          taskId: string;
          conflictingAgentIds: string[];
          resolution: string;
        };
        conflicts.push({
          id: cm.id,
          taskId: meta.taskId,
          conflictingAgentIds: meta.conflictingAgentIds || [],
          resolution: meta.resolution,
          createdAt: cm.createdAt.toISOString(),
        });
      } catch {
        continue;
      }
    }

    return {
      collaboration,
      participants,
      tasks: {
        total: tasksTotal,
        completed: tasksCompleted,
        pending: tasksPending,
        inProgress: tasksInProgress,
      },
      conflicts,
    };
  },

  /**
   * Get an agent's current workload.
   */
  async getAgentWorkload(workspaceId: string, agentId: string): Promise<AgentWorkload> {
    const agent = await safePrisma(() =>
      prisma.agentDef.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, role: true },
      }),
    null);

    const [activeTasks, pendingTasks, completedTasks, collaborationCount] = await Promise.all([
      safePrisma(() => prisma.task.count({
        where: { assignedAgentId: agentId, status: 'in_progress' },
      }), 0),
      safePrisma(() => prisma.task.count({
        where: { assignedAgentId: agentId, status: 'todo' },
      }), 0),
      safePrisma(() => prisma.task.count({
        where: { assignedAgentId: agentId, status: { in: ['done', 'verified'] } },
      }), 0),
      safePrisma(() => prisma.memory.count({
        where: {
          workspaceId,
          type: 'decision',
        },
      }), 0),
    ]);

    // Count actual collaborations (memories with 'collaboration' tag)
    const allMemories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'decision' },
        select: { tags: true },
        take: 200,
      }),
    []);
    const collabCount = allMemories.filter((m) => {
      const tags = JSON.parse(m.tags || '[]') as string[];
      return tags.includes('collaboration');
    }).length;

    return {
      agentId,
      agentName: agent?.name || 'Unknown',
      agentRole: agent?.role || 'custom',
      activeTasks,
      pendingTasks,
      completedTasks,
      collaborationCount: collabCount,
    };
  },

  /**
   * Suggest agents for a collaboration based on a goal.
   * Analyzes the goal and its tasks, matches task requirements to agent roles.
   */
  async suggestCollaboration(
    workspaceId: string,
    organizationId: string,
    goalId: string,
  ): Promise<CollaborationSuggestion> {
    // 1. Load the goal
    const goal = await safePrisma(() =>
      prisma.goal.findUnique({
        where: { id: goalId },
        select: { id: true, title: true, description: true, workspaceId: true },
      }),
    null);

    if (!goal) {
      return {
        goalId,
        goalTitle: 'Unknown',
        suggestedParticipants: [],
        suggestedCoordinator: null,
      };
    }

    // 2. Load plans and tasks for this goal
    const plans = await safePrisma(() =>
      prisma.plan.findMany({
        where: { goalId },
        select: { id: true },
      }),
    []);

    const planIds = plans.map((p) => p.id);
    let tasks: Array<{ title: string; description: string | null }> = [];
    if (planIds.length > 0) {
      tasks = await safePrisma(() =>
        prisma.task.findMany({
          where: { planId: { in: planIds } },
          select: { title: true, description: true },
        }),
      []);
    }

    // 3. Load available agents in the workspace
    const agents = await safePrisma(() =>
      prisma.agentDef.findMany({
        where: { workspaceId, enabled: true },
        select: { id: true, name: true, role: true, capabilities: true },
      }),
    []);

    if (agents.length === 0) {
      return {
        goalId,
        goalTitle: goal.title,
        suggestedParticipants: [],
        suggestedCoordinator: null,
      };
    }

    // 4. Match task requirements to agent roles and capabilities
    const roleKeywords: Record<string, string[]> = {
      engineering: ['code', 'build', 'implement', 'fix', 'deploy', 'api', 'database', 'bug', 'technical'],
      research: ['research', 'analyze', 'investigate', 'study', 'find', 'data'],
      growth: ['marketing', 'campaign', 'ad', 'social', 'content', 'seo', 'growth'],
      design: ['design', 'visual', 'creative', 'brand', 'ui', 'ux'],
      product: ['product', 'feature', 'roadmap', 'spec', 'priority'],
      operations: ['operations', 'process', 'workflow', 'automate', 'coordinate'],
      sales: ['sales', 'lead', 'customer', 'outreach', 'crm'],
      finance: ['finance', 'budget', 'invoice', 'payment', 'cost'],
    };

    const goalText = `${goal.title} ${goal.description || ''}`.toLowerCase();
    const taskTexts = tasks.map((t) => `${t.title} ${t.description || ''}`.toLowerCase());
    const allText = `${goalText} ${taskTexts.join(' ')}`;

    const suggestions: Array<{
      agentId: string;
      name: string;
      role: string;
      reason: string;
      matchedTaskCount: number;
    }> = [];

    for (const agent of agents) {
      const capabilities = JSON.parse(agent.capabilities || '[]') as string[];
      let matchedTaskCount = 0;
      const reasons: string[] = [];

      // Check role keyword matches
      const roleKws = roleKeywords[agent.role] || [];
      const roleMatches = roleKws.filter((kw) => allText.includes(kw));
      if (roleMatches.length > 0) {
        matchedTaskCount += roleMatches.length;
        reasons.push(`Role "${agent.role}" matches keywords: ${roleMatches.slice(0, 3).join(', ')}`);
      }

      // Check capability matches
      const capMatches = capabilities.filter((cap) =>
        allText.includes(cap.toLowerCase()) || cap === 'reasoning',
      );
      if (capMatches.length > 0) {
        matchedTaskCount += capMatches.length;
        reasons.push(`Capabilities: ${capMatches.slice(0, 3).join(', ')}`);
      }

      if (matchedTaskCount > 0) {
        suggestions.push({
          agentId: agent.id,
          name: agent.name,
          role: agent.role,
          reason: reasons.join('; ') || 'General match',
          matchedTaskCount,
        });
      }
    }

    // Sort by matched task count (descending)
    suggestions.sort((a, b) => b.matchedTaskCount - a.matchedTaskCount);

    // 5. Suggest a coordinator — prefer operations or product role, or the top match
    let coordinator: CollaborationSuggestion['suggestedCoordinator'] = null;
    const opsAgent = suggestions.find((s) => s.role === 'operations');
    const productAgent = suggestions.find((s) => s.role === 'product');

    if (opsAgent) {
      coordinator = {
        agentId: opsAgent.agentId,
        name: opsAgent.name,
        role: opsAgent.role,
        reason: 'Operations agents excel at cross-team coordination',
      };
    } else if (productAgent) {
      coordinator = {
        agentId: productAgent.agentId,
        name: productAgent.name,
        role: productAgent.role,
        reason: 'Product agents are well-suited for coordinating cross-functional work',
      };
    } else if (suggestions.length > 0) {
      coordinator = {
        agentId: suggestions[0].agentId,
        name: suggestions[0].name,
        role: suggestions[0].role,
        reason: 'Top-matched agent by task relevance',
      };
    }

    return {
      goalId,
      goalTitle: goal.title,
      suggestedParticipants: suggestions.slice(0, 6),
      suggestedCoordinator: coordinator,
    };
  },

  /**
   * End a collaboration — summarize results and record outcome.
   */
  async endCollaboration(
    workspaceId: string,
    collaborationId: string,
    outcome: string,
  ): Promise<CollaborationSummary> {
    const correlationId = `end-collab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const organizationId = await this.getOrganizationId(workspaceId);

    // 1. Get the collaboration
    const memory = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: collaborationId } }),
    null);

    let collaboration: CollaborationRecord | null = null;
    if (memory) {
      collaboration = parseCollaborationFromMemory(memory);
    }

    const title = collaboration?.title || 'Unknown Collaboration';
    const planId = collaboration?.planId;
    const participants = collaboration?.participantAgentIds || [];

    // 2. Count tasks
    let tasksCompleted = 0;
    let tasksTotal = 0;
    if (planId) {
      const tasks = await safePrisma(() =>
        prisma.task.findMany({
          where: { planId },
          select: { status: true },
        }),
      []);
      tasksTotal = tasks.length;
      tasksCompleted = tasks.filter((t) => t.status === 'done' || t.status === 'verified').length;
    }

    // 3. Update the collaboration memory to mark as ended
    if (collaboration) {
      const updatedContent = JSON.stringify({
        ...JSON.parse(memory!.content),
        status: 'ended',
        outcome,
        endedAt: new Date().toISOString(),
      }).slice(0, 10000);

      await prisma.memory.update({
        where: { id: collaborationId },
        data: { content: updatedContent },
      }).catch(() => {});
    }

    // 4. Record outcome memory
    await MemoryService.create({
      workspaceId,
      organizationId,
      type: 'outcome',
      content: `Collaboration ended: ${title}. Outcome: ${outcome}. Tasks completed: ${tasksCompleted}/${tasksTotal}.`.slice(0, 10000),
      source: 'agent',
      sourceId: collaborationId,
      confidence: 0.9,
      lifecycle: 'long',
      tags: ['collaboration', 'orchestration', 'ended', collaborationId],
      createdBy: collaboration?.coordinatorAgentId || 'system',
    }).catch(() => {});

    // 5. Emit event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'orchestration.collaboration_ended',
      actor: collaboration?.coordinatorAgentId,
      actorType: 'agent',
      resourceType: 'memory',
      resourceId: collaborationId,
      metadata: {
        collaborationId,
        title: title.slice(0, 200),
        outcome: outcome.slice(0, 500),
        tasksCompleted,
        tasksTotal,
        participantCount: participants.length,
      },
      correlationId,
    }).catch(() => {});

    return {
      collaborationId,
      title,
      outcome,
      tasksCompleted,
      tasksTotal,
      participants,
      endedAt: new Date().toISOString(),
    };
  },

  /**
   * Helper: get the organizationId for a workspace.
   */
  async getOrganizationId(workspaceId: string): Promise<string> {
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);
    return workspace?.organizationId || '';
  },
};
