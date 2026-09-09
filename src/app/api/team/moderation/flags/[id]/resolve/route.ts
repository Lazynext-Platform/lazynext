import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ModerationService } from '@/lib/services/moderation-service';

/** POST /api/team/moderation/flags/[id]/resolve — resolve a moderation flag */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '').trim() as 'approved' | 'removed' | 'warning';
  if (!action || !['approved', 'removed', 'warning'].includes(action)) {
    return NextResponse.json({ error: 'valid_action_required' }, { status: 400 });
  }

  const flag = await ModerationService.resolveFlag(id, session.user.id, action);
  if (!flag) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ flag });
}
