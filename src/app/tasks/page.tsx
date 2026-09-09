import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckSquare, Plus, AlertCircle, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tasks — Lazynext',
  description: 'Track work with Kanban boards, assignments, dependencies, and priorities.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaskService } from '@/lib/services/task';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NewTaskForm } from './NewTaskForm';

export const dynamic = 'force-dynamic';

const priorityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  todo: 'default',
  in_progress: 'info',
  blocked: 'danger',
  done: 'success',
  cancelled: 'default',
  awaiting_approval: 'warning',
  failed: 'danger',
  retrying: 'warning',
  verified: 'success',
};

interface TaskWithRelations {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assigneeId: string | null;
  assignedAgentId: string | null;
  projectId: string;
  createdAt: Date;
  dependencies: { id: string; dependsOnId: string; dependsOn: { id: string; title: string; status: string } }[];
  project: { id: string; name: string };
  assignee?: { id: string; name: string | null; email: string | null } | null;
  agent?: { id: string; name: string } | null;
}

export default async function TasksPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  if (wsIds.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Tasks</h1>
          <p className="text-sm text-fg-secondary mt-1">Track work with Kanban boards, assignments, dependencies, and priorities.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={CheckSquare}
            title="No workspaces yet"
            description="Create a workspace to start tracking tasks."
            action={<Button href="/dashboard">Go to Dashboard</Button>}
          />
        </Card>
      </div>
    );
  }

  // Fetch tasks with dependencies, project, assignee, and agent info
  const tasks = await safePrisma(() =>
    prisma.task.findMany({
      where: { project: { workspaceId: { in: wsIds } }, deletedAt: null },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { id: true, name: true } },
        dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      take: 100,
    }),
  []);

  // Fetch agent names for tasks that have assignedAgentId
  const agentIds = tasks
    .map((t) => t.assignedAgentId)
    .filter((id): id is string => id !== null);

  const agents = agentIds.length > 0
    ? await safePrisma(() =>
        prisma.agentDef.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true },
        }),
      [])
    : [];

  const agentMap = new Map(agents.map((a) => [a.id, a.name]));

  const tasksWithAgent: TaskWithRelations[] = tasks.map((t) => ({
    ...t,
    agent: t.assignedAgentId ? { id: t.assignedAgentId, name: agentMap.get(t.assignedAgentId) || 'Unknown' } : null,
  }));

  // Group by status
  const grouped = {
    in_progress: tasksWithAgent.filter((t) => t.status === 'in_progress'),
    todo: tasksWithAgent.filter((t) => t.status === 'todo'),
    blocked: tasksWithAgent.filter((t) => t.status === 'blocked'),
    done: tasksWithAgent.filter((t) => t.status === 'done' || t.status === 'verified'),
  };

  const otherTasks = tasksWithAgent.filter(
    (t) => !['in_progress', 'todo', 'blocked', 'done', 'verified'].includes(t.status),
  );

  const completedCount = grouped.done.length;
  const blockedCount = grouped.blocked.length;
  const inProgressCount = grouped.in_progress.length;

  // Get projects for the new task form
  const projects = await safePrisma(() =>
    prisma.project.findMany({
      where: { workspaceId: { in: wsIds }, status: 'active', deletedAt: null },
      select: { id: true, name: true },
      take: 100,
    }),
  []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Tasks</h1>
          <p className="text-sm text-fg-secondary mt-1">Track work with assignments, dependencies, and priorities.</p>
        </div>
        {projects.length > 0 && (
          <NewTaskForm
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            defaultProjectId={projects[0].id}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckSquare className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{tasksWithAgent.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Clock className="h-3 w-3" /> In Progress
          </div>
          <div className="text-2xl font-semibold">{inProgressCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <AlertCircle className="h-3 w-3" /> Blocked
          </div>
          <div className="text-2xl font-semibold">{blockedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckSquare className="h-3 w-3" /> Completed
          </div>
          <div className="text-2xl font-semibold">{completedCount}</div>
        </Card>
      </div>

      {tasksWithAgent.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Create tasks within your projects to track work. Use the New Task button above to get started."
            action={projects.length === 0 ? <Button href="/projects">Go to projects</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* In Progress */}
          <TaskColumn
            title="In Progress"
            count={grouped.in_progress.length}
            variant="info"
            tasks={grouped.in_progress}
          />

          {/* To Do */}
          <TaskColumn
            title="To Do"
            count={grouped.todo.length}
            variant="default"
            tasks={grouped.todo}
          />

          {/* Blocked */}
          <TaskColumn
            title="Blocked"
            count={grouped.blocked.length}
            variant="danger"
            tasks={grouped.blocked}
          />

          {/* Done */}
          <TaskColumn
            title="Done"
            count={grouped.done.length}
            variant="success"
            tasks={grouped.done}
          />
        </div>
      )}

      {/* Other tasks (cancelled, failed, etc.) */}
      {otherTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="heading-display text-sm mb-4">Other</h2>
          <div className="space-y-3">
            {otherTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskColumn({
  title,
  count,
  variant,
  tasks,
}: {
  title: string;
  count: number;
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  tasks: TaskWithRelations[];
}) {
  return (
    <div>
      <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
        {title} <Badge variant={variant}>{count}</Badge>
      </h2>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && <p className="text-sm text-fg-muted p-4">Nothing here.</p>}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: TaskWithRelations }) {
  const hasDependencies = task.dependencies.length > 0;
  const uncompletedDeps = task.dependencies.filter(
    (d) => d.dependsOn.status !== 'done' && d.dependsOn.status !== 'verified',
  );

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="p-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
        <p className="text-sm font-medium mb-2">{task.title}</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="label-mono text-xs">{task.project.name}</span>
          <Badge variant={priorityVariant[task.priority] || 'default'} className="text-xs">
            {task.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.assignee && (
            <span className="text-xs text-fg-secondary">
              {task.assignee.name || task.assignee.email}
            </span>
          )}
          {task.agent && (
            <Badge variant="accent" className="text-xs">
              {task.agent.name}
            </Badge>
          )}
          {task.dueDate && (
            <span className="text-xs text-fg-muted flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {hasDependencies && (
            <span className="text-xs flex items-center gap-1" style={{ color: uncompletedDeps.length > 0 ? 'var(--c-danger)' : 'var(--c-fg-muted)' }}>
              <AlertCircle className="h-3 w-3" />
              {task.dependencies.length} dep{task.dependencies.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
