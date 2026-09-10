/**
 * Agent Seed Service
 *
 * Seeds default agents for each workspace — Growth Manager, Design Lead,
 * Engineering Lead, Research Analyst, Product Manager, and Operations Manager.
 *
 * Each agent is created only if it doesn't already exist for the workspace
 * (checked by name + workspaceId). Returns the list of created agents.
 */
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export interface AgentTemplate {
  role: string;
  name: string;
  description: string;
  modelProvider: string;
  modelName: string;
  instructions: string;
  tools: string[];
  capabilities: string[];
  permissions: string[];
}

export interface SeededAgent {
  id: string;
  name: string;
  role: string;
  workspaceId: string;
  isNew: boolean;
}

// ── Default Agent Templates ──

export const DEFAULT_AGENT_TEMPLATES: AgentTemplate[] = [
  {
    role: 'growth',
    name: 'Growth Manager',
    description:
      'Drives marketing campaigns, creative production, and performance optimization',
    modelProvider: 'atlas',
    modelName: 'doubao-seed-2.1-turbo',
    instructions:
      'You are the Growth Manager. Your job is to drive marketing campaigns, ' +
      'oversee creative production, and optimize performance. Use creative tools ' +
      'to generate ad copy, hooks, and scripts. Analyze performance data to ' +
      'identify winning creatives and scale what works. Coordinate with the ' +
      'Design Lead on visual direction and with the Engineering Lead on ' +
      'tracking and attribution.',
    tools: [
      'creative.generateBrief',
      'creative.generateHooks',
      'creative.scoreCombination',
      'company_query',
      'task_create',
      'plan_create',
    ],
    capabilities: ['text', 'reasoning', 'creative_generation', 'performance_analysis'],
    permissions: ['creative.generate', 'creative.analyze', 'task.create', 'plan.create'],
  },
  {
    role: 'design',
    name: 'Design Lead',
    description:
      'Creates visual concepts, brand assets, and creative direction',
    modelProvider: 'atlas',
    modelName: 'doubao-seed-2.1-turbo',
    instructions:
      'You are the Design Lead. Your job is to create visual concepts, brand ' +
      'assets, and provide creative direction. Use creative tools to generate ' +
      'visual concepts and storyboards. Ensure brand consistency across all ' +
      'creative outputs. Collaborate with the Growth Manager on campaign ' +
      'creative and with the Engineering Lead on design systems.',
    tools: [
      'creative.generateStoryboard',
      'creative.generateVariants',
      'company_query',
      'task_create',
    ],
    capabilities: ['text', 'reasoning', 'vision', 'creative_generation'],
    permissions: ['creative.generate', 'creative.analyze', 'task.create'],
  },
  {
    role: 'engineering',
    name: 'Engineering Lead',
    description:
      'Leads technical architecture, code quality, and engineering execution',
    modelProvider: 'atlas',
    modelName: 'doubao-seed-2.1-turbo',
    instructions:
      'You are the Engineering Lead. Your job is to lead technical architecture, ' +
      'ensure code quality, and drive engineering execution. Use code tools to ' +
      'search and review code. Create tasks and plans for engineering work. ' +
      'Coordinate with the Product Manager on requirements and priorities.',
    tools: [
      'github_search',
      'file_read',
      'company_query',
      'task_create',
      'plan_create',
    ],
    capabilities: ['text', 'reasoning', 'code_analysis'],
    permissions: ['code.read', 'task.create', 'plan.create'],
  },
  {
    role: 'research',
    name: 'Research Analyst',
    description:
      'Conducts market research, competitive analysis, and data-driven insights',
    modelProvider: 'atlas',
    modelName: 'doubao-seed-2.1-turbo',
    instructions:
      'You are the Research Analyst. Your job is to conduct market research, ' +
      'competitive analysis, and provide data-driven insights. Use web search ' +
      'and memory search to gather information. Analyze data and create ' +
      'reports for the team.',
    tools: [
      'web_search',
      'memory_search',
      'company_query',
      'data_analysis',
      'task_create',
    ],
    capabilities: ['text', 'reasoning', 'web_search', 'data_analysis'],
    permissions: ['research.search', 'data.read', 'task.create'],
  },
  {
    role: 'product',
    name: 'Product Manager',
    description:
      'Defines product strategy, manages roadmap, and prioritizes features',
    modelProvider: 'atlas',
    modelName: 'doubao-seed-2.1-turbo',
    instructions:
      'You are the Product Manager. Your job is to define product strategy, ' +
      'manage the roadmap, and prioritize features. Use company data to ' +
      'inform decisions. Create plans and tasks to drive execution. ' +
      'Coordinate with Engineering, Design, and Growth teams.',
    tools: [
      'company_query',
      'data_analysis',
      'memory_search',
      'task_create',
      'plan_create',
    ],
    capabilities: ['text', 'reasoning', 'data_analysis'],
    permissions: ['data.read', 'task.create', 'plan.create'],
  },
  {
    role: 'operations',
    name: 'Operations Manager',
    description:
      'Manages day-to-day operations, budgets, and cross-team coordination',
    modelProvider: 'atlas',
    modelName: 'doubao-seed-2.1-turbo',
    instructions:
      'You are the Operations Manager. Your job is to manage day-to-day ' +
      'operations, oversee budgets, and coordinate across teams. Use company ' +
      'data to track progress and identify blockers. Create tasks and emit ' +
      'events to keep everyone aligned.',
    tools: [
      'company_query',
      'data_analysis',
      'task_create',
      'task_update',
      'event_emit',
    ],
    capabilities: ['text', 'reasoning', 'data_analysis'],
    permissions: ['data.read', 'task.create', 'task.update', 'event.emit'],
  },
];

// ── Agent Seed Service ──

export const AgentSeedService = {
  /**
   * Seed default agents for a workspace. Only creates agents that don't
   * already exist (checked by name + workspaceId).
   *
   * Returns the list of agents (both newly created and pre-existing).
   */
  async seedDefaultAgents(
    workspaceId: string,
    organizationId: string,
    createdBy: string,
  ): Promise<SeededAgent[]> {
    const results: SeededAgent[] = [];

    for (const template of DEFAULT_AGENT_TEMPLATES) {
      // Check if an agent with this name already exists for the workspace
      const existing = await safePrisma(() =>
        prisma.agentDef.findFirst({
          where: { workspaceId, name: template.name },
          select: { id: true, name: true, role: true, workspaceId: true },
        }),
      null);

      if (existing) {
        results.push({
          id: existing.id,
          name: existing.name,
          role: existing.role,
          workspaceId: existing.workspaceId,
          isNew: false,
        });
        continue;
      }

      // Create the agent
      try {
        const agent = await prisma.agentDef.create({
          data: {
            workspaceId,
            name: template.name.slice(0, 200),
            role: template.role,
            modelProvider: template.modelProvider.slice(0, 50),
            modelName: template.modelName.slice(0, 100),
            instructions: template.instructions.slice(0, 10_000),
            toolIds: JSON.stringify(template.tools).slice(0, 1000),
            capabilities: JSON.stringify(template.capabilities),
            permissions: JSON.stringify(template.permissions),
            enabled: true,
          },
          select: { id: true, name: true, role: true, workspaceId: true },
        });

        results.push({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          workspaceId: agent.workspaceId,
          isNew: true,
        });
      } catch {
        // Skip on error (e.g. concurrent creation)
        continue;
      }
    }

    return results;
  },

  /**
   * Return the template definitions for default agents.
   */
  listDefaultAgentTemplates(): AgentTemplate[] {
    return [...DEFAULT_AGENT_TEMPLATES];
  },

  /**
   * Alias for seedDefaultAgents.
   */
  async seedAllDefaultAgents(
    workspaceId: string,
    organizationId: string,
    createdBy: string,
  ): Promise<SeededAgent[]> {
    return this.seedDefaultAgents(workspaceId, organizationId, createdBy);
  },

  /**
   * Check which default agents already exist for a workspace.
   * Returns a map of template name → exists.
   */
  async checkSeededAgents(workspaceId: string): Promise<
    Array<{ name: string; role: string; exists: boolean; agentId?: string }>
  > {
    const existing = await safePrisma(() =>
      prisma.agentDef.findMany({
        where: { workspaceId },
        select: { id: true, name: true, role: true },
      }),
    []);

    const existingNames = new Set(existing.map((a) => a.name));

    return DEFAULT_AGENT_TEMPLATES.map((t) => {
      const found = existing.find((a) => a.name === t.name);
      return {
        name: t.name,
        role: t.role,
        exists: existingNames.has(t.name),
        agentId: found?.id,
      };
    });
  },
};
