import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ChannelService } from '@/lib/services/channel-service';

/** GET /api/team/channels — list channels for the user's organization */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ channels: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const channels = await ChannelService.list(organizationId, {
    workspaceId: sp.get('workspaceId') || undefined,
    type: (sp.get('type') as 'public' | 'private' | 'direct') || undefined,
    memberId: sp.get('memberId') || undefined,
    search: sp.get('search') || undefined,
  });

  return NextResponse.json({ channels });
}

/** POST /api/team/channels — create a new channel */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const channel = await ChannelService.create(organizationId, {
      name,
      description: body.description,
      type: body.type,
      workspaceId: body.workspaceId,
      members: Array.isArray(body.members) ? body.members : undefined,
      createdBy: session.user.id,
    });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (e) {
    console.error('[team/channels] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_channel' }, { status: 500 });
  }
}
