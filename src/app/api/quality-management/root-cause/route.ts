import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/root-cause — list root cause analyses */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const analyses = await QualityManagementService.listRootCauseAnalyses(organizationId, {
    nonconformanceId: sp.get('nonconformanceId') || undefined,
  });

  return NextResponse.json({ analyses });
}

/** POST /api/quality-management/root-cause — create a root cause analysis */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const problem = String(body.problem || '').trim();
  const rootCause = String(body.rootCause || '').trim();
  if (!problem) {
    return NextResponse.json({ error: 'problem_required' }, { status: 400 });
  }
  if (!rootCause) {
    return NextResponse.json({ error: 'rootCause_required' }, { status: 400 });
  }

  try {
    const analysis = await QualityManagementService.createRootCauseAnalysis(
      organizationId,
      body.workspaceId || organizationId,
      {
        nonconformanceId: body.nonconformanceId,
        problem,
        method: body.method,
        rootCause,
        contributingFactors: Array.isArray(body.contributingFactors) ? body.contributingFactors : [],
        recommendations: Array.isArray(body.recommendations) ? body.recommendations : [],
      },
      userId,
    );
    return NextResponse.json({ analysis }, { status: 201 });
  } catch (e) {
    console.error('[quality-management] create root cause error:', e);
    return NextResponse.json({ error: 'failed_to_create_root_cause' }, { status: 500 });
  }
}
