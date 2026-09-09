import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RiskService } from '@/lib/services/risk-service';

/** POST /api/risks/[id]/status — change risk status */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const risk = await RiskService.changeStatus(id, body.status);
    if (!risk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ risk });
  } catch (e) {
    console.error('[risks] status error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
