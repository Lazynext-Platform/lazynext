import type { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Collaboration — Lazynext',
  description: 'Activity feed, presence, mentions, and active edit sessions.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PresenceService } from '@/lib/services/presence-service';
import { CommentService } from '@/lib/services/comment-service';
import { CollabEditorService } from '@/lib/services/collab-editor-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CollaborationHub } from './CollaborationHub';

export const dynamic = 'force-dynamic';

export default async function CollaborationPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Collaboration</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Activity feed, presence, mentions, and active edit sessions.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No workspace yet"
            description="Create a company first to access collaboration features."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const workspaceId = workspaces[0].id;
  const organizationId = workspaces[0].organizationId;

  const [activity, presence, mentions, sessions] = await Promise.all([
    PresenceService.getActivityFeed(organizationId, { workspaceId, limit: 30 }),
    PresenceService.getPresence(workspaceId),
    CommentService.getMentions(session.user.id, { workspaceId, limit: 20 }),
    CollabEditorService.getActiveSessions(workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Collaboration</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">
          Activity feed, presence, mentions, and active edit sessions.
        </p>
      </div>

      <CollaborationHub
        organizationId={organizationId}
        workspaceId={workspaceId}
        activity={activity}
        presence={presence}
        mentions={mentions}
        sessions={sessions}
      />
    </div>
  );
}
