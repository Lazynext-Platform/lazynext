import Link from 'next/link';
import type { Metadata } from 'next';
import { FolderKanban, Plus, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Projects — Lazynext',
  description: 'Organize work into projects with tasks, documents, and files.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { safePrisma } from '@/lib/safe-prisma';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspace = workspaces[0] || await WorkspaceService.ensureDefaultWorkspace(session.user.id, session.user.name);

  const projects = await safePrisma(() => prisma.project.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { tasks: true, documents: true } },
    },
  }), []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Projects</h1>
          <p className="text-sm text-fg-secondary mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button href="/projects/new">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to organize tasks, documents, and files."
            action={<Button href="/projects/new">Create project</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="p-5 h-full transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center border-2"
                    style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <Badge variant={p.status === 'active' ? 'success' : 'default'}>{p.status}</Badge>
                </div>
                <h3 className="font-semibold text-base mb-1">{p.name}</h3>
                {p.description && <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{p.description}</p>}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t-2" style={{ borderColor: 'var(--c-ink)' }}>
                  <span className="label-mono">{p._count.tasks} tasks</span>
                  <span className="label-mono">{p._count.documents} docs</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
