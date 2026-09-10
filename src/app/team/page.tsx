import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Team Communication — Lazynext',
  description: 'Discussion forums, channels, DMs, file sharing, and moderation.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ChannelService } from '@/lib/services/channel-service';
import { MessageService } from '@/lib/services/message-service';
import { ModerationService } from '@/lib/services/moderation-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { TeamCommunication } from './TeamCommunication';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Team Communication</h1>
          <p className="text-sm text-fg-secondary mt-1">Discussion forums, channels, DMs, file sharing, and moderation.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={MessageCircle}
            title="No workspace yet"
            description="Create a company first to access team communication."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const currentUserId = session.user.id;

  const [channels, recentMessages, channelStats, messageStats, moderationStats, flags] = await Promise.all([
    ChannelService.list(organizationId),
    MessageService.getRecent(organizationId, { limit: 50 }),
    ChannelService.getStats(organizationId),
    MessageService.getStats(organizationId),
    ModerationService.getStats(organizationId),
    ModerationService.getFlags(organizationId, { status: 'pending' }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Team Communication</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Discussion forums, channels, DMs, file sharing, and moderation.</p>
      </div>

      <TeamCommunication
        organizationId={organizationId}
        currentUserId={currentUserId}
        initialChannels={channels}
        initialRecentMessages={recentMessages}
        channelStats={channelStats}
        messageStats={messageStats}
        moderationStats={moderationStats}
        initialFlags={flags}
      />
    </div>
  );
}
