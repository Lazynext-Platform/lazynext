import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';

/**
 * POST /api/tickets/[id]/escalate — escalate a ticket.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await SupportService.getTicket(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const ticket = await SupportService.escalate(id);
    return NextResponse.json({ ticket });
  } catch (e) {
    console.error('[tickets] escalate error:', e);
    return NextResponse.json({ error: 'failed_to_escalate_ticket' }, { status: 500 });
  }
}
