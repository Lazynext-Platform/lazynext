import type { Metadata } from 'next';
import { Search, ArrowLeft, Quote } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Research Session — Lazynext',
  description: 'Research findings, summary, and citations.',
  robots: { index: false, follow: false },
};
import Link from 'next/link';
import { auth } from '@/../auth';
import { ResearchService } from '@/lib/services/research';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { SessionDetail } from './SessionDetail';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  running: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'default',
};

export default async function ResearchSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const researchSession = await ResearchService.getSession(id);

  if (!researchSession) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-8">
          <EmptyState
            icon={Search}
            title="Research session not found"
            description="This session may have been deleted."
            action={<Button href="/research"><ArrowLeft className="h-4 w-4" /> Back to Research</Button>}
          />
        </Card>
      </div>
    );
  }

  const citations = researchSession.citations || [];

  let findings: Record<string, unknown> = {};
  try {
    findings = researchSession.findings ? JSON.parse(researchSession.findings) : {};
  } catch {
    findings = {};
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/research" className="text-xs text-fg-secondary hover:text-fg flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Research
        </Link>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="heading-display text-2xl flex items-center gap-2">
              <Search className="h-6 w-6 text-fg-secondary" /> {researchSession.query}
            </h1>
          </div>
          <Badge variant={statusVariant[researchSession.status] || 'default'} className="text-xs">
            {researchSession.status}
          </Badge>
        </div>
      </div>

      <SessionDetail
        sessionId={researchSession.id}
        status={researchSession.status}
        summary={researchSession.summary}
        findings={findings}
        citations={citations.map((c) => ({
          id: c.id,
          url: c.url,
          title: c.title,
          snippet: c.snippet,
          credibility: c.credibility,
          accessedAt: c.accessedAt.toISOString(),
        }))}
      />
    </div>
  );
}
