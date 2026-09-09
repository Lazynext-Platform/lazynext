import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ModerationService } from '@/lib/services/moderation-service';

/** POST /api/team/moderation/mute — mute a user */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || '').trim();
  if (!userId) {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  const duration = typeof body.duration === 'number' ? body.duration : undefined;
  const reason = String(body.reason || '').trim();

  try {
    const mute = await ModerationService.muteUser(userId, session.user.id, duration, reason);
    return NextResponse.json({ mute }, { status: 201 });
  } catch (e) {
    console.error('[team/moderation/mute] error:', e);
    return NextResponse.json({ error: 'failed_to_mute_user' }, { status: 500 });
  }
}

/** DELETE /api/team/moderation/mute — unmute a user */
export async function DELETE(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const userId = sp.get('userId') || '';
  if (!userId) {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  const unmuted = await ModerationService.unmuteUser(userId);
  return NextResponse.json({ unmuted });
}
