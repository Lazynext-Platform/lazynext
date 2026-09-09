import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MessageService } from '@/lib/services/message-service';

/** GET /api/team/messages — list messages in a channel */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const channelId = sp.get('channelId') || '';
  if (!channelId) {
    return NextResponse.json({ error: 'channel_id_required' }, { status: 400 });
  }

  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : undefined;
  const offset = sp.get('offset') ? parseInt(sp.get('offset')!, 10) : undefined;
  const before = sp.get('before') ? new Date(sp.get('before')!) : undefined;
  const after = sp.get('after') ? new Date(sp.get('after')!) : undefined;

  const messages = await MessageService.list(channelId, { limit, offset, before, after });
  return NextResponse.json({ messages });
}

/** POST /api/team/messages — create a new message */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const channelId = String(body.channelId || '').trim();
  if (!channelId) {
    return NextResponse.json({ error: 'channel_id_required' }, { status: 400 });
  }

  const messageBody = String(body.body || '').trim();
  if (!messageBody) {
    return NextResponse.json({ error: 'body_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const message = await MessageService.create(organizationId, {
      channelId,
      userId: session.user.id,
      body: messageBody,
      attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
      replyTo: body.replyTo,
      mentions: Array.isArray(body.mentions) ? body.mentions : undefined,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    console.error('[team/messages] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_message' }, { status: 500 });
  }
}
