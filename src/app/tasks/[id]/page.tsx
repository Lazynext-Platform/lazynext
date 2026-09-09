import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, CheckSquare, Clock, AlertCircle, GitBranch, ListTree, Bot } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Task — Lazynext',
  description: 'Task detail with dependencies, subtasks, and time tracking.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaskService } from '@/lib/services/task';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { TaskDetailClient } from './TaskDetailClient';

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

interface TaskDetail {
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
  updatedAt: Date;
  dependencies: { id: string; dependsOnId: string; dependsOn: { id: string; title: string; status: string } }[];
  dependents: { id: string; taskId: string; task: { id: string; title: string; status: string } }[];
  timeEntries: { id: string; startedAt: Date; endedAt: Date | null; durationSec: number; userId: string | null }[];
}

interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  // Verify the task belongs to the user's workspace
  const taskOwnership = await safePrisma(() =>
    prisma.task.findFirst({
      where: { id, project: { workspaceId: { in: wsIds } }, deletedAt: null },
      select: { id: true, projectId: true },
    }),
  null);

  if (!taskOwnership) {
    notFound();
  }

  const task = (await TaskService.get(id)) as TaskDetail | null;
  if (!task) {
    notFound();
  }

  // Fetch project, assignee, agent, and subtasks in parallel
  const [project, assignee, agent, subtasks, totalTime, otherTasks] = await Promise.all([
    safePrisma(() =>
      prisma.project.findUnique({
        where: { id: task.projectId },
        select: { id: true, name: true, workspaceId: true },
      }),
    null),
    task.assigneeId
      ? safePrisma(() =>
          prisma.user.findUnique({
            where: { id: task.assigneeId! },
            select: { id: true, name: true, email: true },
          }),
        null)
      : Promise.resolve(null),
    task.assignedAgentId
      ? safePrisma(() =>
          prisma.agentDef.findUnique({
            where: { id: task.assignedAgentId! },
            select: { id: true, name: true },
          }),
        null)
      : Promise.resolve(null),
    TaskService.getSubtasks(id) as Promise<Subtask[]>,
    TaskService.getTotalTime(id),
    // Fetch other tasks in the same project for the dependency dropdown
    safePrisma(() =>
      prisma.task.findMany({
        where: {
          projectId: task.projectId,
          id: { not: id },
          deletedAt: null,
        },
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    []),
  ]);

  // Check if there's an active (running) time entry
  const activeEntry = task.timeEntries.find((e) => !e.endedAt) || null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Link href="/tasks" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> All tasks
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="heading-display text-2xl">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={statusVariant[task.status] || 'default'}>{task.status}</Badge>
              <Badge variant={priorityVariant[task.priority] || 'default'}>{task.priority}</Badge>
              {project && (
                <Link href={`/projects/${project.id}`} className="text-xs text-fg-secondary hover:text-fg">
                  {project.name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <Card className="p-5">
              <h2 className="heading-display text-sm mb-3">Description</h2>
              <p className="text-sm text-fg-secondary whitespace-pre-wrap">{task.description}</p>
            </Card>
          )}

          {/* Subtasks */}
          <Card className="p-5">
            <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
              <ListTree className="h-4 w-4" /> Subtasks ({subtasks.length})
            </h2>
            {subtasks.length === 0 ? (
              <p className="text-sm text-fg-muted">No subtasks.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {subtasks.map((subtask) => (
                  <Link
                    key={subtask.id}
                    href={`/tasks/${subtask.id}`}
                    className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <span className="text-sm font-medium truncate">{subtask.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={priorityVariant[subtask.priority] || 'default'} className="text-xs">
                        {subtask.priority}
                      </Badge>
                      <Badge variant={statusVariant[subtask.status] || 'default'} className="text-xs">
                        {subtask.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Dependencies */}
          <Card className="p-5">
            <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> Dependencies ({task.dependencies.length})
            </h2>
            {task.dependencies.length === 0 ? (
              <p className="text-sm text-fg-muted">No dependencies. This task can start immediately.</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {task.dependencies.map((dep) => {
                  const isComplete = dep.dependsOn.status === 'done' || dep.dependsOn.status === 'verified';
                  return (
                    <Link
                      key={dep.id}
                      href={`/tasks/${dep.dependsOn.id}`}
                      className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors"
                      style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isComplete ? (
                          <CheckSquare className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-danger shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">{dep.dependsOn.title}</span>
                      </div>
                      <Badge variant={statusVariant[dep.dependsOn.status] || 'default'} className="text-xs shrink-0">
                        {dep.dependsOn.status}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Dependents (tasks that depend on this one) */}
            {task.dependents.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--c-ink)' }}>
                <p className="text-xs text-fg-secondary mb-2">Blocked by this task:</p>
                <div className="flex flex-col gap-1">
                  {task.dependents.map((dep) => (
                    <Link
                      key={dep.id}
                      href={`/tasks/${dep.task.id}`}
                      className="text-sm text-fg-secondary hover:text-fg truncate"
                    >
                      {dep.task.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Time Entries */}
          <Card className="p-5">
            <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Time Tracking
            </h2>
            <div className="mb-4 p-3 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-secondary">Total time</span>
                <span className="text-lg font-semibold">{formatDuration(totalTime)}</span>
              </div>
            </div>
            {task.timeEntries.length === 0 ? (
              <p className="text-sm text-fg-muted">No time entries yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {task.timeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 border-2 bg-surface text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <span className="text-xs text-fg-secondary">
                      {new Date(entry.startedAt).toLocaleString()}
                    </span>
                    <span className="text-xs font-medium">
                      {entry.endedAt ? formatDuration(entry.durationSec) : 'Running…'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card className="p-5">
            <h2 className="heading-display text-sm mb-3">Details</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-fg-secondary block mb-1">Status</span>
                <Badge variant={statusVariant[task.status] || 'default'}>{task.status}</Badge>
              </div>
              <div>
                <span className="text-xs text-fg-secondary block mb-1">Priority</span>
                <Badge variant={priorityVariant[task.priority] || 'default'}>{task.priority}</Badge>
              </div>
              {assignee && (
                <div>
                  <span className="text-xs text-fg-secondary block mb-1">Assignee</span>
                  <span className="text-sm">{assignee.name || assignee.email}</span>
                </div>
              )}
              {agent && (
                <div>
                  <span className="text-xs text-fg-secondary block mb-1">Agent</span>
                  <div className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    <span className="text-sm">{agent.name}</span>
                  </div>
                </div>
              )}
              {task.dueDate && (
                <div>
                  <span className="text-xs text-fg-secondary block mb-1">Due Date</span>
                  <span className="text-sm">{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-fg-secondary block mb-1">Created</span>
                <span className="text-sm">{new Date(task.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Actions (client component) */}
          <TaskDetailClient
            taskId={task.id}
            currentStatus={task.status}
            activeEntryId={activeEntry?.id || null}
            otherTasks={otherTasks.map((t) => ({ id: t.id, title: t.title, status: t.status }))}
            existingDependencies={task.dependencies.map((d) => d.dependsOnId)}
          />
        </div>
      </div>
    </div>
  );
}
