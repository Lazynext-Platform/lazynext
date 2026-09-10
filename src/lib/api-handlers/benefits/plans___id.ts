import { NextRequest, NextResponse } from 'next/server';
import { BenefitsService } from '@/lib/services/benefits-service';
import type { BenefitPlanType } from '@/lib/services/benefits-service';

/** GET /api/benefits/plans/[id] — get a plan by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const plan = await BenefitsService.getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ plan });
}

/** PATCH /api/benefits/plans/[id] — update a plan */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const plan = await BenefitsService.updatePlan(id, {
      name: body.name,
      type: body.type as BenefitPlanType | undefined,
      description: body.description,
      provider: body.provider,
      costPerEmployee: body.costPerEmployee,
      employerContribution: body.employerContribution,
      eligibilityCriteria: body.eligibilityCriteria,
      enrollmentOpen: body.enrollmentOpen,
      isActive: body.isActive,
    });
    if (!plan) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[benefits/plans] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_plan' }, { status: 500 });
  }
}

/** DELETE /api/benefits/plans/[id] — delete a plan */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const deleted = await BenefitsService.deletePlan(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
