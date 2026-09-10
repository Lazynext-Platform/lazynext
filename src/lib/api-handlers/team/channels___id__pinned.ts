import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ChannelService } from '@/lib/services/channel-service';

/** GET /api/team/channels/[id]/pinned — get pinned message IDs for a channel */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const pinnedMessages = await ChannelService.getPinnedMessages(id);
  return NextResponse.json({ pinnedMessages });
}

/** POST /api/team/channels/[id]/pinned — pin a message */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const messageId = String(body.messageId || '').trim();
  if (!messageId) {
    return NextResponse.json({ error: 'message_id_required' }, { status: 400 });
  }

  const channel = await ChannelService.pinMessage(id, messageId);
  if (!channel) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ channel });
}

/** DELETE /api/team/channels/[id]/pinned — unpin a message */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const messageId = sp.get('messageId') || '';
  if (!messageId) {
    return NextResponse.json({ error: 'message_id_required' }, { status: 400 });
  }

  const channel = await ChannelService.unpinMessage(id, messageId);
  if (!channel) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ channel });
}
