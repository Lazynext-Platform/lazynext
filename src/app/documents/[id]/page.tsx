import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const doc = await prisma.document.findFirst({
    where: { id, workspaceId: { in: wsIds }, deletedAt: null },
    include: { project: { select: { id: true, name: true } } },
  });

  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/documents" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> All documents
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center border-2"
            style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard-sm)' }}
          >
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="heading-display text-2xl">{doc.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>v{doc.version}</Badge>
              {doc.project && (
                <Link href={`/projects/${doc.project.id}`} className="text-xs text-fg-secondary hover:text-fg">
                  {doc.project.name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="prose prose-sm max-w-none">
          {doc.content ? (
            <pre className="whitespace-pre-wrap text-sm font-sans">{doc.content}</pre>
          ) : (
            <p className="text-fg-muted">This document is empty.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
