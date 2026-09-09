import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ChannelService } from '@/lib/services/channel-service';

/** GET /api/team/channels/[id] — get a channel by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const channel = await ChannelService.get(id);
  if (!channel) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ channel });
}

/** PATCH /api/team/channels/[id] — update a channel */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const channel = await ChannelService.update(id, {
      name: body.name,
      description: body.description,
      topic: body.topic,
    });
    if (!channel) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ channel });
  } catch (e) {
    console.error('[team/channels] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_channel' }, { status: 500 });
  }
}

/** DELETE /api/team/channels/[id] — delete a channel */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await ChannelService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
