import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { WorkspaceService } from '@/lib/services/workspace';

export interface OnboardingTaskInput {
  employeeId: string;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  dueDate?: Date;
  assignedTo?: string;
  order?: number;
}

export interface OnboardingTaskUpdate {
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  dueDate?: Date;
  assignedTo?: string;
  order?: number;
}

export interface OnboardingListOpts {
  employeeId?: string;
  category?: string;
  status?: string;
}

export interface OnboardingTemplateInput {
  name: string;
  description?: string;
  tasks: Array<{ title: string; description?: string; category?: string; order?: number }>;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  tasks: Array<{ title: string; description: string; category: string; order: number }>;
}

export const OnboardingService = {
  async createTask(organizationId: string, input: OnboardingTaskInput) {
    return prisma.onboardingTask.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        category: input.category || 'general',
        status: input.status || 'pending',
        dueDate: input.dueDate || null,
        assignedTo: input.assignedTo || null,
        order: input.order ?? 0,
      },
    });
  },

  async getTask(id: string) {
    return safePrisma(() =>
      prisma.onboardingTask.findUnique({ where: { id } }),
    null);
  },

  async listTasks(organizationId: string, opts?: OnboardingListOpts) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.employeeId) where.employeeId = opts.employeeId;
    if (opts?.category) where.category = opts.category;
    if (opts?.status) where.status = opts.status;
    return safePrisma(() =>
      prisma.onboardingTask.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        take: 500,
      }),
    []);
  },

  async updateTask(id: string, input: OnboardingTaskUpdate) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.description !== undefined) data.description = input.description.slice(0, 5000);
    if (input.category !== undefined) data.category = input.category;
    if (input.status !== undefined) data.status = input.status;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;
    if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo || null;
    if (input.order !== undefined) data.order = input.order;
    return prisma.onboardingTask.update({ where: { id }, data });
  },

  async deleteTask(id: string) {
    return prisma.onboardingTask.delete({ where: { id } });
  },

  async completeTask(id: string) {
    return prisma.onboardingTask.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
  },

  async skipTask(id: string, reason?: string) {
    const update: Record<string, unknown> = { status: 'skipped' };
    if (reason) {
      const task = await safePrisma(() =>
        prisma.onboardingTask.findUnique({ where: { id } }),
      null);
      if (task) {
        update.description = `${(task as { description: string }).description}\n\n[Skipped: ${reason.slice(0, 1000)}]`.trim();
      }
    }
    return prisma.onboardingTask.update({ where: { id }, data: update });
  },

  async getByEmployee(employeeId: string) {
    return safePrisma(() =>
      prisma.onboardingTask.findMany({
        where: { employeeId },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async getProgress(employeeId: string) {
    const tasks = await safePrisma(() =>
      prisma.onboardingTask.findMany({
        where: { employeeId },
        select: { status: true },
      }),
    []);
    const total = tasks.length;
    const completed = (tasks as Array<{ status: string }>).filter((t) => t.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  },

  async createTemplate(organizationId: string, workspaceId: string, input: OnboardingTemplateInput, createdBy: string) {
    const content = JSON.stringify({
      name: input.name.slice(0, 300),
      description: input.description?.slice(0, 5000) || '',
      tasks: (input.tasks || []).map((t) => ({
        title: t.title.slice(0, 300),
        description: t.description?.slice(0, 5000) || '',
        category: t.category || 'general',
        order: t.order ?? 0,
      })),
    });
    return prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'onboarding_template',
        content,
        source: 'user',
        sourceId: createdBy,
        tags: JSON.stringify(['onboarding']),
        createdBy,
      },
    });
  },

  async applyTemplate(organizationId: string, employeeId: string, templateId: string) {
    const memory = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: templateId } }),
    null);
    if (!memory) throw new Error('template_not_found');
    let data: { name?: string; tasks?: Array<{ title: string; description: string; category: string; order: number }> } = {};
    try { data = JSON.parse((memory as { content: string }).content); } catch { data = {}; }
    const tasks = data.tasks || [];
    const created = [];
    for (const t of tasks) {
      const task = await prisma.onboardingTask.create({
        data: {
          organizationId,
          employeeId,
          title: t.title,
          description: t.description,
          category: t.category,
          status: 'pending',
          order: t.order,
        },
      });
      created.push(task);
    }
    return created;
  },

  async getTemplates(organizationId: string): Promise<OnboardingTemplate[]> {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { organizationId, type: 'onboarding_template' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
    return (memories as Array<{ id: string; content: string }>).map((m) => {
      let data: { name?: string; description?: string; tasks?: Array<{ title: string; description: string; category: string; order: number }> } = {};
      try { data = JSON.parse(m.content); } catch { data = {}; }
      return {
        id: m.id,
        name: data.name || '',
        description: data.description || '',
        tasks: data.tasks || [],
      };
    });
  },

  async getStats(organizationId: string) {
    const [total, byCategory, byStatus, completedCount] = await Promise.all([
      safePrisma(() => prisma.onboardingTask.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.onboardingTask.groupBy({
          by: ['category'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.onboardingTask.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.onboardingTask.count({
          where: { organizationId, status: 'completed' },
        }),
      0),
    ]);
    const categoryCounts: Record<string, number> = {};
    for (const row of byCategory as Array<{ category: string; _count: number }>) {
      categoryCounts[row.category] = row._count;
    }
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return { total, byCategory: categoryCounts, byStatus: statusCounts, completionRate };
  },

  // --- Wizard / first-run onboarding state (Memory-backed) ---

  async getOnboardingState(userId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'onboarding_step', sourceId: userId },
        take: 200,
      }),
    []);
    const completed = new Set(
      (memories as Array<{ content: string }>)
        .map((m) => {
          try { return JSON.parse(m.content) as { stepId?: string; completed?: boolean }; } catch { return {}; }
        })
        .filter((d) => d.completed && d.stepId)
        .map((d) => d.stepId as string),
    );
    const allSteps = [
      'welcome', 'organization', 'workspace', 'profile', 'agents',
      'goal', 'plan', 'task', 'sample', 'integrations', 'done',
    ];
    const steps = allSteps.map((id) => ({ id, completed: completed.has(id) }));
    const completedCount = steps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / allSteps.length) * 100);
    return { steps, completedCount, totalSteps: allSteps.length, progress };
  },

  async completeStep(userId: string, stepId: string) {
    const workspaces = await WorkspaceService.listForUser(userId);
    if (workspaces.length === 0) throw new Error('no_workspace');
    const ws = workspaces[0];
    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'onboarding_step', sourceId: userId, tags: { contains: stepId } },
      }),
    null);
    if (existing) {
      return prisma.memory.update({
        where: { id: (existing as { id: string }).id },
        data: { content: JSON.stringify({ stepId, completed: true, completedAt: new Date().toISOString() }) },
      });
    }
    return prisma.memory.create({
      data: {
        workspaceId: ws.id,
        organizationId: ws.organizationId,
        type: 'onboarding_step',
        content: JSON.stringify({ stepId, completed: true, completedAt: new Date().toISOString() }),
        source: 'user',
        sourceId: userId,
        tags: JSON.stringify([stepId]),
        createdBy: userId,
      },
    });
  },

  async getOnboardingProgress(organizationId: string) {
    const stats = await this.getStats(organizationId);
    return {
      total: stats.total,
      completed: stats.byStatus.completed || 0,
      pending: stats.byStatus.pending || 0,
      skipped: stats.byStatus.skipped || 0,
      completionRate: stats.completionRate,
    };
  },

  async resetOnboarding(userId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'onboarding_step', sourceId: userId },
        select: { id: true },
      }),
    []);
    const ids = (memories as Array<{ id: string }>).map((m) => m.id);
    let deleted = 0;
    for (const id of ids) {
      await prisma.memory.delete({ where: { id } }).catch(() => null);
      deleted++;
    }
    return { reset: true, deletedCount: deleted };
  },

  async getSetupChecklist(organizationId: string) {
    // Find workspaces for this org to scope project/task/agent counts
    const workspaces = await safePrisma(() =>
      prisma.workspace.findMany({
        where: { organizationId },
        select: { id: true },
      }),
    []);
    const workspaceIds = (workspaces as Array<{ id: string }>).map((w) => w.id);

    const [goalCount, projectCount, agentCount, integrationCount] = await Promise.all([
      safePrisma(() => prisma.goal.count({ where: { organizationId } }), 0),
      workspaceIds.length > 0
        ? safePrisma(() => prisma.project.count({ where: { workspaceId: { in: workspaceIds } } }), 0)
        : 0,
      workspaceIds.length > 0
        ? safePrisma(() => prisma.agentDef.count({ where: { workspaceId: { in: workspaceIds } } }), 0)
        : 0,
      safePrisma(() =>
        prisma.memory.count({
          where: { organizationId, type: { contains: 'integration' } },
        }),
      0),
    ]);

    // Count tasks via projects
    let taskCount = 0;
    if (workspaceIds.length > 0) {
      const projects = await safePrisma(() =>
        prisma.project.findMany({
          where: { workspaceId: { in: workspaceIds } },
          select: { id: true },
        }),
      []);
      const projectIds = (projects as Array<{ id: string }>).map((p) => p.id);
      if (projectIds.length > 0) {
        taskCount = await safePrisma(() =>
          prisma.task.count({ where: { projectId: { in: projectIds } } }),
        0);
      }
    }

    const checklist = [
      { id: 'create_goal', label: 'Create your first goal', done: goalCount > 0 },
      { id: 'create_project', label: 'Create your first project', done: projectCount > 0 },
      { id: 'create_task', label: 'Create your first task', done: taskCount > 0 },
      { id: 'setup_agent', label: 'Set up an AI agent', done: agentCount > 0 },
      { id: 'connect_integration', label: 'Connect an integration', done: integrationCount > 0 },
    ];
    const completedCount = checklist.filter((c) => c.done).length;
    return {
      items: checklist,
      completedCount,
      totalCount: checklist.length,
      progress: Math.round((completedCount / checklist.length) * 100),
    };
  },

  async seedSampleData(organizationId: string, workspaceId: string, userId: string) {
    const created: string[] = [];
    // Seed a sample goal
    const goal = await prisma.goal.create({
      data: {
        organizationId,
        workspaceId,
        title: 'Sample Goal — Launch v1',
        description: 'Auto-generated sample goal from onboarding.',
        status: 'active',
        createdById: userId,
      },
    }).catch(() => null);
    if (goal) created.push(`goal:${goal.id}`);

    // Seed a sample project
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: 'Sample Project',
        description: 'Auto-generated sample project from onboarding.',
        status: 'active',
        createdById: userId,
      },
    }).catch(() => null);
    if (project) created.push(`project:${project.id}`);

    // Seed a sample task (linked to the project)
    if (project) {
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: 'Sample Task — Review onboarding',
          description: 'Auto-generated sample task from onboarding.',
          status: 'todo',
          priority: 'medium',
        },
      }).catch(() => null);
      if (task) created.push(`task:${task.id}`);
    }

    return { seeded: true, count: created.length, items: created };
  },
};
