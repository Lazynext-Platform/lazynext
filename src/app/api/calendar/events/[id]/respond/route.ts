import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CalendarService } from '@/lib/services/calendar-service';

/** POST /api/calendar/events/[id]/respond — respond to an invite */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || '').trim();
  if (!['yes', 'no', 'maybe'].includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }
  const userId = String(body.userId || session.user.id).trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId_required' }, { status: 400 });
  }

  try {
    const event = await CalendarService.respondToInvite(id, userId, status as 'yes' | 'no' | 'maybe');
    if (!event) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (e) {
    console.error('[calendar/events/[id]/respond] error:', e);
    return NextResponse.json({ error: 'failed_to_respond' }, { status: 500 });
  }
}
