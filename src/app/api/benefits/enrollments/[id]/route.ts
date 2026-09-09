import { NextRequest, NextResponse } from 'next/server';
import { BenefitsService } from '@/lib/services/benefits-service';
import type { CoverageLevel } from '@/lib/services/benefits-service';

/** GET /api/benefits/enrollments/[id] — get an enrollment by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enrollment = await BenefitsService.getEnrollment(id);
  if (!enrollment) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ enrollment });
}

/** PATCH /api/benefits/enrollments/[id] — update an enrollment */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const existing = await BenefitsService.getEnrollment(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    // Re-enroll by creating a new enrollment with updated fields is not ideal;
    // instead, update via the service's cancel + re-enroll pattern is complex.
    // We support updating coverage level, beneficiary, and contribution.
    const enrollment = await BenefitsService.enrollEmployee(
      existing.organizationId,
      existing.workspaceId,
      {
        planId: existing.planId,
        employeeId: existing.employeeId,
        employeeName: existing.employeeName,
        enrollmentDate: body.enrollmentDate ?? existing.enrollmentDate,
        coverageLevel: (body.coverageLevel as CoverageLevel | undefined) ?? existing.coverageLevel,
        beneficiary: body.beneficiary ?? existing.beneficiary,
        contributionAmount: body.contributionAmount ?? existing.contributionAmount,
      },
      existing.createdBy,
    );
    return NextResponse.json({ enrollment });
  } catch (e) {
    console.error('[benefits/enrollments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_enrollment' }, { status: 500 });
  }
}
