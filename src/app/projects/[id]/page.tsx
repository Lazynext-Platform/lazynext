import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FolderKanban, CheckSquare, FileText, Plus, ArrowLeft } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: { in: wsIds }, deletedAt: null },
    include: {
      tasks: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      documents: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
      workspace: { select: { name: true } },
    },
  });

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Link href="/projects" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center border-2"
            style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard-sm)' }}
          >
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <h1 className="heading-display text-2xl">{project.name}</h1>
            <p className="text-sm text-fg-secondary mt-1">
              {project.workspace.name} · <Badge>{project.status}</Badge>
            </p>
          </div>
        </div>
      </div>

      {project.description && (
        <Card className="p-4 mb-6">
          <p className="text-sm text-fg-secondary">{project.description}</p>
        </Card>
      )}

      {/* Tasks + Documents grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">Tasks ({project.tasks.length})</h2>
          </div>
          {project.tasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks" description="Add tasks to this project." />
          ) : (
            <div className="flex flex-col gap-2">
              {project.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckSquare className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge>{task.priority}</Badge>
                    <Badge variant={task.status === 'done' ? 'success' : 'default'}>{task.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Documents */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-display text-sm">Documents ({project.documents.length})</h2>
          </div>
          {project.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Add documents to this project." />
          ) : (
            <div className="flex flex-col gap-2">
              {project.documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center justify-between p-3 border-2 bg-surface hover:bg-hover transition-colors" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
                    <span className="text-sm font-medium truncate">{doc.title}</span>
                  </div>
                  <span className="text-xs text-fg-muted shrink-0">v{doc.version}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
