import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/changes/[id]/assess — assess impact of a change */
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
  const impactAssessment = String(body.impactAssessment || '').trim();
  if (!impactAssessment) {
    return NextResponse.json({ error: 'impactAssessment_required' }, { status: 400 });
  }

  try {
    const change = await RegulatoryService.assessImpact(id, impactAssessment, session.user.id);
    if (!change) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ change });
  } catch (e) {
    console.error('[regulatory/changes] assess error:', e);
    return NextResponse.json({ error: 'failed_to_assess_change' }, { status: 500 });
  }
}
