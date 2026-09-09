import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ChannelService } from '@/lib/services/channel-service';

/** POST /api/team/channels/direct — get or create a direct message channel */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const otherUserId = String(body.userId || '').trim();
  if (!otherUserId) {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const channel = await ChannelService.getDirectChannel(
      organizationId,
      session.user.id,
      otherUserId,
    );
    return NextResponse.json({ channel });
  } catch (e) {
    console.error('[team/channels/direct] error:', e);
    return NextResponse.json({ error: 'failed_to_create_dm' }, { status: 500 });
  }
}
