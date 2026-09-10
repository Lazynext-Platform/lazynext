import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { BenefitsService } from '@/lib/services/benefits-service';
import type { CoverageLevel } from '@/lib/services/benefits-service';

/** GET /api/benefits/enrollments — list enrollments */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const enrollments = await BenefitsService.listEnrollments(organizationId, {
    planId: sp.get('planId') || undefined,
    employeeId: sp.get('employeeId') || undefined,
  });

  return NextResponse.json({ enrollments });
}

/** POST /api/benefits/enrollments — create an enrollment */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId || '').trim();
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  if (!planId || !employeeId || !employeeName) {
    return NextResponse.json({ error: 'plan_employee_required' }, { status: 400 });
  }

  try {
    const enrollment = await BenefitsService.enrollEmployee(
      organizationId,
      body.workspaceId || organizationId,
      {
        planId,
        employeeId,
        employeeName,
        enrollmentDate: body.enrollmentDate,
        coverageLevel: body.coverageLevel as CoverageLevel | undefined,
        beneficiary: body.beneficiary,
        contributionAmount: body.contributionAmount,
      },
      userId,
    );
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (e) {
    console.error('[benefits/enrollments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_enrollment' }, { status: 500 });
  }
}
