import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';

/**
 * POST /api/tickets/[id]/assign — assign a ticket to a user.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: { assigneeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const assigneeId = body.assigneeId?.trim();
  if (!assigneeId) {
    return NextResponse.json({ error: 'assigneeId_required' }, { status: 400 });
  }

  try {
    const existing = await SupportService.getTicket(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const ticket = await SupportService.assignTicket(id, assigneeId);
    return NextResponse.json({ ticket });
  } catch (e) {
    console.error('[tickets] assign error:', e);
    return NextResponse.json({ error: 'failed_to_assign_ticket' }, { status: 500 });
  }
}
