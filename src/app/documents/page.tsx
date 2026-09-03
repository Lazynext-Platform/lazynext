import Link from 'next/link';
import type { Metadata } from 'next';
import { FileText, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documents — Lazynext',
  description: 'Create and share knowledge base articles and documentation.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { safePrisma } from '@/lib/safe-prisma';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspace = workspaces[0] || await WorkspaceService.ensureDefaultWorkspace(session.user.id, session.user.name);

  const documents = await safePrisma(() => prisma.document.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: { project: { select: { id: true, name: true } } },
  }), []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Documents</h1>
          <p className="text-sm text-fg-secondary mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button href="/documents/new">
          <Plus className="h-4 w-4" /> New Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Create documents to build your knowledge base."
            action={<Button href="/documents/new">Create document</Button>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="p-4 flex items-center justify-between transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-8 w-8 items-center justify-center border-2 shrink-0"
                    style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    {doc.project && <p className="text-xs text-fg-muted">{doc.project.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge>v{doc.version}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
