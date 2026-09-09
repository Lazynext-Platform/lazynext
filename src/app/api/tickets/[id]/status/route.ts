import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SupportService } from '@/lib/services/support';

/**
 * POST /api/tickets/[id]/status — change a ticket's status.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const status = body.status?.trim();
  if (!status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const existing = await SupportService.getTicket(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const ticket = await SupportService.changeStatus(id, status);
    return NextResponse.json({ ticket });
  } catch (e) {
    console.error('[tickets] change status error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
