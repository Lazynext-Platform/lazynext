import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';
import { Card, Button, EmptyState } from '@/components/ui';
import { DocumentView } from './DocumentView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Knowledge Document — Lazynext',
  description: 'View and manage a knowledge document.',
  robots: { index: false, follow: false },
};

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const { id } = await params;

  const doc = await KnowledgeService.get(id);
  if (!doc) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="Document not found"
            description="This knowledge document may have been deleted."
            action={<Button href="/knowledge-v2">Back to Knowledge</Button>}
          />
        </Card>
      </div>
    );
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const hasOrg = workspaces.some((w) => w.organizationId === doc.organizationId);
  if (!hasOrg) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="Access denied"
            description="You do not have access to this document."
            action={<Button href="/knowledge-v2">Back to Knowledge</Button>}
          />
        </Card>
      </div>
    );
  }

  const [links, backlinks, wikiPath] = await Promise.all([
    KnowledgeService.getLinks(id),
    KnowledgeService.getBacklinks(id),
    KnowledgeService.getWikiPath(id),
  ]);

  const versions = doc.versions || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <DocumentView
        document={{
          id: doc.id,
          title: doc.title,
          content: doc.content,
          excerpt: doc.excerpt,
          status: doc.status,
          version: doc.version,
          slug: doc.slug,
          tags: (() => { try { return JSON.parse(doc.tags) as string[]; } catch { return []; } })(),
          organizationId: doc.organizationId,
          workspaceId: doc.workspaceId,
          authorId: doc.authorId,
          updatedAt: doc.updatedAt.toISOString(),
          publishedAt: doc.publishedAt?.toISOString() ?? null,
        }}
        versions={versions.map((v) => ({
          id: v.id,
          version: v.version,
          excerpt: v.excerpt,
          editorId: v.editorId,
          changeSummary: v.changeSummary,
          createdAt: v.createdAt.toISOString(),
        }))}
        links={{
          outgoing: links.outgoing.map((l) => ({
            id: l.id,
            targetId: l.targetId,
            label: l.label,
            linkType: l.linkType,
          })),
          incoming: links.incoming.map((l) => ({
            id: l.id,
            sourceId: l.sourceId,
            label: l.label,
            linkType: l.linkType,
          })),
        }}
        backlinks={backlinks.map((b) => ({
          id: b.id,
          title: b.title,
          slug: b.slug,
          status: b.status,
          linkId: b.linkId ?? null,
          linkType: b.linkType ?? null,
          label: b.label ?? null,
        }))}
        wikiPath={wikiPath}
      />
    </div>
  );
}
