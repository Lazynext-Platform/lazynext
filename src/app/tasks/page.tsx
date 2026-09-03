import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckSquare, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tasks — Lazynext',
  description: 'Track work with Kanban boards, assignments, and priorities.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { safePrisma } from '@/lib/safe-prisma';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const tasks = await safePrisma(() => prisma.task.findMany({
    where: { project: { workspaceId: { in: wsIds } }, deletedAt: null },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { project: { select: { id: true, name: true } } },
    take: 50,
  }), []);

  const grouped = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Tasks</h1>
          <p className="text-sm text-fg-secondary mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Create tasks within your projects to track work."
            action={<Button href="/projects">Go to projects</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Todo */}
          <div>
            <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
              To Do <Badge>{grouped.todo.length}</Badge>
            </h2>
            <div className="flex flex-col gap-2">
              {grouped.todo.map((task) => <TaskCard key={task.id} task={task} />)}
              {grouped.todo.length === 0 && <p className="text-sm text-fg-muted p-4">Nothing here.</p>}
            </div>
          </div>

          {/* In Progress */}
          <div>
            <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
              In Progress <Badge variant="info">{grouped.in_progress.length}</Badge>
            </h2>
            <div className="flex flex-col gap-2">
              {grouped.in_progress.map((task) => <TaskCard key={task.id} task={task} />)}
              {grouped.in_progress.length === 0 && <p className="text-sm text-fg-muted p-4">Nothing here.</p>}
            </div>
          </div>

          {/* Done */}
          <div>
            <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
              Done <Badge variant="success">{grouped.done.length}</Badge>
            </h2>
            <div className="flex flex-col gap-2">
              {grouped.done.map((task) => <TaskCard key={task.id} task={task} />)}
              {grouped.done.length === 0 && <p className="text-sm text-fg-muted p-4">Nothing here.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: { id: string; title: string; priority: string; status: string; project: { id: string; name: string } } }) {
  return (
    <Link href={`/projects/${task.project.id}`}>
      <Card className="p-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
        <p className="text-sm font-medium mb-2">{task.title}</p>
        <div className="flex items-center justify-between">
          <span className="label-mono">{task.project.name}</span>
          <Badge>{task.priority}</Badge>
        </div>
      </Card>
    </Link>
  );
}
