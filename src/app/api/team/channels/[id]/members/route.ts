import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ChannelService } from '@/lib/services/channel-service';

/** POST /api/team/channels/[id]/members — add a member to a channel */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || '').trim();
  if (!userId) {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  const channel = await ChannelService.addMember(id, userId);
  if (!channel) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ channel });
}

/** DELETE /api/team/channels/[id]/members — remove a member from a channel */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const userId = sp.get('userId') || '';
  if (!userId) {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  const channel = await ChannelService.removeMember(id, userId);
  if (!channel) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ channel });
}
