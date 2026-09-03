import Link from 'next/link';
import { MessageSquare, Plus } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  // Conversations are derived from creative comments (existing model)
  // In a future phase, a dedicated Conversation model will be added
  const comments = await prisma.creativeComment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Conversations</h1>
          <p className="text-sm text-fg-secondary mt-1">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {comments.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Comments on creative work and project discussions will appear here."
            action={<Button href="/creative">Open Creative Studio</Button>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 shrink-0 text-fg-muted mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{c.body}</p>
                  <p className="text-xs text-fg-muted mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
