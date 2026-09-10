import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ChannelService } from '@/lib/services/channel-service';
import { MessageService } from '@/lib/services/message-service';
import { ModerationService } from '@/lib/services/moderation-service';

/** GET /api/team/stats — get team communication stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      channels: { totalChannels: 0, byType: { public: 0, private: 0, direct: 0 }, totalMembers: 0, activeChannels: 0 },
      messages: { totalMessages: 0, byChannel: {}, attachmentsCount: 0, avgPerChannel: 0 },
      moderation: { totalFlags: 0, resolvedFlags: 0, pendingFlags: 0, deletedMessages: 0, mutedUsers: 0 },
    });
  }

  const organizationId = workspaces[0].organizationId;

  const [channels, messages, moderation] = await Promise.all([
    ChannelService.getStats(organizationId),
    MessageService.getStats(organizationId),
    ModerationService.getStats(organizationId),
  ]);

  return NextResponse.json({ channels, messages, moderation });
}
