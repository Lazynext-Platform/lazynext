import type { Metadata } from 'next';
import { BookOpen, ArrowLeft, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Knowledge Base — Lazynext',
  description: 'Articles and research findings in this knowledge base.',
  robots: { index: false, follow: false },
};
import Link from 'next/link';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { ArticleList } from './ArticleList';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  published: 'success',
  archived: 'warning',
};

export default async function KnowledgeBaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const kb = await KnowledgeService.getKnowledgeBase(id);

  if (!kb) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="Knowledge base not found"
            description="This knowledge base may have been deleted."
            action={<Button href="/knowledge"><ArrowLeft className="h-4 w-4" /> Back to Knowledge</Button>}
          />
        </Card>
      </div>
    );
  }

  const articles = kb.articles || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/knowledge" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Knowledge
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="heading-display text-2xl flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-fg-secondary" /> {kb.name}
            </h1>
            {kb.description && (
              <p className="text-sm text-fg-secondary mt-1 max-w-3xl">{kb.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info" className="text-xs">{kb.visibility}</Badge>
            <Badge variant="default" className="text-xs">{articles.length} articles</Badge>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <ArticleList
          knowledgeBaseId={kb.id}
          articles={articles.map((a) => ({
            id: a.id,
            title: a.title,
            summary: a.summary,
            status: a.status,
            source: a.source,
            version: a.version,
            wordCount: a.wordCount,
            updatedAt: a.updatedAt.toISOString(),
          }))}
        />
      </div>

      {articles.length === 0 && (
        <Card className="p-6">
          <EmptyState
            icon={FileText}
            title="No articles yet"
            description="Add your first article to start building this knowledge base."
          />
        </Card>
      )}
    </div>
  );
}
