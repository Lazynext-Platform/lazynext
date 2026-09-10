import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** POST /api/customer-success/churn-risks/[id]/resolve — resolve a churn risk */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const resolution = String(body.resolution || '').trim();
  if (!resolution) {
    return NextResponse.json({ error: 'resolution_required' }, { status: 400 });
  }

  try {
    const churnRisk = await CustomerSuccessService.resolveChurnRisk(id, resolution, session.user.id);
    if (!churnRisk) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ churnRisk });
  } catch (e) {
    console.error('[customer-success/churn-risks/resolve] error:', e);
    return NextResponse.json({ error: 'failed_to_resolve_churn_risk' }, { status: 500 });
  }
}
