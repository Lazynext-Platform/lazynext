import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** POST /api/data-governance/quality-rules/[id]/run — run a quality check */
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
  const result = String(body.result || '').trim();
  if (!result) {
    return NextResponse.json({ error: 'result_required' }, { status: 400 });
  }
  const violations = Number(body.violations || 0);

  try {
    const qualityRule = await DataGovernanceService.runQualityCheck(id, result as never, violations, session.user.id);
    if (!qualityRule) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ qualityRule });
  } catch (e) {
    console.error('[data-governance/quality-rules/run] error:', e);
    return NextResponse.json({ error: 'failed_to_run_quality_check' }, { status: 500 });
  }
}
