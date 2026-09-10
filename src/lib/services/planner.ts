/**
 * Planner Service — creates Plans from company goals/objectives.
 *
 * The planner is the "thinking" part of the autonomous loop. It:
 * 1. Takes a company goal or objective
 * 2. Assembles context (memory, current state, past outcomes)
 * 3. Calls the LLM to generate a structured plan
 * 4. Creates a Plan record with Tasks
 * 5. Returns the plan for execution
 *
 * The plan is then executed by the DurableExecutionEngine, which assigns
 * tasks to agents and monitors their progress.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { atlasChat, type ChatMessage } from '@/lib/atlas';
import { PlanService } from '@/lib/services/plan';
import { MemoryService } from '@/lib/services/memory';
import { EventService } from '@/lib/services/event';

// ── Types ──

export interface PlannerInput {
  workspaceId: string;
  organizationId: string;
  goalId?: string;
  objective: string;
  constraints?: {
    budget?: number;
    timeframe?: string;
    availableAgents?: string[];
    availableTools?: string[];
  };
  createdById?: string;
  agentId?: string;
}

export interface PlannerOutput {
  planId: string;
  title: string;
  objective: string;
  reasoning: string;
  tasks: PlannerTask[];
  estimatedCost: number;
  riskLevel: string;
}

export interface PlannerTask {
  title: string;
  description: string;
  priority: string;
  estimatedCost: number;
  riskLevel: string;
  agentRole?: string;
  dependencies?: string[];
}

// ── Planner Service ──

export const Planner = {
  /**
   * Create a plan from a goal/objective.
   * This is the main entry point for the planner.
   */
  async plan(input: PlannerInput): Promise<PlannerOutput> {
    const correlationId = `planner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Assemble context from memory
    const memoryContext = await MemoryService.assembleContext({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      objective: input.objective,
      maxMemories: 15,
    });

    // 2. Load the goal if provided
    let goal: { title: string; description: string | null } | null = null;
    if (input.goalId) {
      goal = await safePrisma(() =>
        prisma.goal.findUnique({
          where: { id: input.goalId },
          select: { title: true, description: true },
        }),
      null);
    }

    // 3. Build the LLM prompt
    const systemPrompt = this.buildSystemPrompt(input, memoryContext, goal);
    const userPrompt = this.buildUserPrompt(input, goal);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 4. Call the LLM to generate the plan
    let llmResponse: string;
    try {
      llmResponse = await atlasChat(messages, undefined, 3000, 60000);
    } catch (e) {
      throw new Error(`Planner LLM call failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }

    // 5. Parse the plan from the LLM response
    const parsed = this.parsePlan(llmResponse);

    // 6. Create the Plan record
    const plan = await PlanService.create({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      goalId: input.goalId,
      title: parsed.title,
      objective: input.objective,
      reasoning: parsed.reasoning,
      priority: parsed.priority || 'medium',
      riskLevel: parsed.riskLevel || 'low',
      estimatedCost: parsed.estimatedCost || 0,
      createdById: input.createdById,
      agentId: input.agentId,
    });

    // 7. Create Task records for each planned task
    // Find or create a default project for this workspace
    const project = await this.getOrCreateDefaultProject(input.workspaceId, input.createdById);

    for (const task of parsed.tasks) {
      await prisma.task.create({
        data: {
          projectId: project.id,
          title: task.title.slice(0, 300),
          description: task.description.slice(0, 5000),
          priority: task.priority || 'medium',
          riskLevel: task.riskLevel || 'low',
          estimatedCost: task.estimatedCost || 0,
          planId: plan.id,
          status: 'todo',
        },
      }).catch(() => {});
    }

    // 8. Emit event
    await EventService.emit({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      type: 'plan.created',
      actor: input.agentId || input.createdById,
      actorType: input.agentId ? 'agent' : 'user',
      resourceType: 'plan',
      resourceId: plan.id,
      metadata: {
        objective: input.objective.slice(0, 200),
        taskCount: parsed.tasks.length,
        estimatedCost: parsed.estimatedCost,
      },
      correlationId,
    });

    // 9. Record planning decision to memory
    await MemoryService.create({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      type: 'decision',
      content: `Plan created for: ${input.objective.slice(0, 200)}. Reasoning: ${parsed.reasoning.slice(0, 300)}`,
      source: 'agent',
      sourceId: plan.id,
      confidence: 0.7,
      lifecycle: 'medium',
      tags: ['plan', 'planner'],
      createdBy: input.agentId || input.createdById || 'system',
    }).catch(() => {});

    return {
      planId: plan.id,
      title: parsed.title,
      objective: input.objective,
      reasoning: parsed.reasoning,
      tasks: parsed.tasks,
      estimatedCost: parsed.estimatedCost || 0,
      riskLevel: parsed.riskLevel || 'low',
    };
  },

  /**
   * Build the system prompt for the planner LLM call.
   */
  buildSystemPrompt(
    input: PlannerInput,
    memoryContext: { memories: Array<{ type: string; content: string }> },
    goal: { title: string; description: string | null } | null,
  ): string {
    const memorySummary = memoryContext.memories
      .map((m) => `[${m.type}] ${m.content}`)
      .join('\n');

    const constraints = input.constraints
      ? `
Constraints:
- Budget: ${input.constraints.budget || 'unlimited'} credits
- Timeframe: ${input.constraints.timeframe || 'no specific deadline'}
- Available agents: ${(input.constraints.availableAgents || []).join(', ') || 'all'}
- Available tools: ${(input.constraints.availableTools || []).join(', ') || 'all'}`
      : '';

    const goalStr = goal
      ? `
Goal: ${goal.title}
${goal.description || ''}
`
      : '';

    return `You are the Planner in the Lazynext Autonomous Company Operating System.

Your job is to create a structured plan to achieve the given objective.${goalStr}

Company context (memory):
${memorySummary || 'No prior context available.'}
${constraints}

Output your plan in this exact JSON format:
{
  "title": "Short plan title",
  "reasoning": "Why this plan will work",
  "priority": "low|medium|high|urgent",
  "riskLevel": "low|medium|high",
  "estimatedCost": <number in credits>,
  "tasks": [
    {
      "title": "Task title",
      "description": "What needs to be done",
      "priority": "low|medium|high|urgent",
      "estimatedCost": <number>,
      "riskLevel": "low|medium|high",
      "agentRole": "ceo|engineering|strategy|research|product|design|growth|sales|support|finance|operations|security|custom"
    }
  ]
}

Break the objective into 3-7 concrete, actionable tasks. Order them by dependency (earlier tasks first).
Be realistic about costs and risks. Keep descriptions concise.`;
  },

  /**
   * Build the user prompt for the planner LLM call.
   */
  buildUserPrompt(input: PlannerInput, goal: { title: string; description: string | null } | null): string {
    return `Objective: ${input.objective}

${goal ? `This plan should advance the goal: ${goal.title}` : ''}

Please create a plan to achieve this objective.`;
  },

  /**
   * Parse the plan from the LLM response.
   */
  parsePlan(response: string): {
    title: string;
    reasoning: string;
    priority: string;
    riskLevel: string;
    estimatedCost: number;
    tasks: PlannerTask[];
  } {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: String(parsed.title || 'Untitled Plan').slice(0, 300),
          reasoning: String(parsed.reasoning || '').slice(0, 5000),
          priority: String(parsed.priority || 'medium'),
          riskLevel: String(parsed.riskLevel || 'low'),
          estimatedCost: Number(parsed.estimatedCost) || 0,
          tasks: Array.isArray(parsed.tasks)
            ? parsed.tasks.map((t: Record<string, unknown>) => ({
                title: String(t.title || 'Untitled Task').slice(0, 300),
                description: String(t.description || '').slice(0, 5000),
                priority: String(t.priority || 'medium'),
                estimatedCost: Number(t.estimatedCost) || 0,
                riskLevel: String(t.riskLevel || 'low'),
                agentRole: t.agentRole ? String(t.agentRole) : undefined,
              }))
            : [],
        };
      } catch {
        // Fall through to heuristic parsing
      }
    }

    // Heuristic fallback: create a single task from the response
    return {
      title: 'Auto-generated Plan',
      reasoning: response.slice(0, 2000),
      priority: 'medium',
      riskLevel: 'low',
      estimatedCost: 0,
      tasks: [
        {
          title: 'Execute objective',
          description: response.slice(0, 2000),
          priority: 'medium',
          estimatedCost: 0,
          riskLevel: 'low',
        },
      ],
    };
  },

  /**
   * Get or create a default project for the workspace.
   */
  async getOrCreateDefaultProject(workspaceId: string, createdById?: string): Promise<{ id: string }> {
    // Try to find an existing project
    const existing = await safePrisma(() =>
      prisma.project.findFirst({
        where: { workspaceId, status: 'active' },
        select: { id: true },
      }),
    null);

    if (existing) return existing;

    // Create a default project
    const userId = createdById || (await safePrisma(() =>
      prisma.membership.findFirst({
        where: { workspaceId, role: 'owner' },
        select: { userId: true },
      }),
    null))?.userId || 'system';

    const project = await prisma.project.create({
      data: {
        workspaceId,
        createdById: userId,
        name: 'Autonomous Work',
        description: 'Default project for autonomous agent tasks',
        status: 'active',
      },
    });

    return { id: project.id };
  },
};
