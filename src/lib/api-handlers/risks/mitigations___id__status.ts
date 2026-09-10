import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RiskMitigationService } from '@/lib/services/risk-mitigation-service';

/** POST /api/risks/mitigations/[id]/status — change mitigation status */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  if (!body.status) {
    return NextResponse.json({ error: 'status_required' }, { status: 400 });
  }

  try {
    const mitigation = await RiskMitigationService.changeStatus(id, body.status);
    if (!mitigation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ mitigation });
  } catch (e) {
    console.error('[risks/mitigations] status error:', e);
    return NextResponse.json({ error: 'failed_to_change_status' }, { status: 500 });
  }
}
