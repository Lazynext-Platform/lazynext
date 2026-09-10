import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ModerationService } from '@/lib/services/moderation-service';

/** POST /api/team/moderation/flag — flag a message for moderation */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const messageId = String(body.messageId || '').trim();
  if (!messageId) {
    return NextResponse.json({ error: 'message_id_required' }, { status: 400 });
  }

  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  const severity = (body.severity as 'low' | 'medium' | 'high') || 'medium';

  try {
    const flag = await ModerationService.flagMessage(
      messageId,
      session.user.id,
      reason,
      severity,
    );
    return NextResponse.json({ flag }, { status: 201 });
  } catch (e) {
    console.error('[team/moderation/flag] error:', e);
    return NextResponse.json({ error: 'failed_to_flag_message' }, { status: 500 });
  }
}
