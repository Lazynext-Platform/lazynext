import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { BenefitsService } from '@/lib/services/benefits-service';
import type { BenefitPlanType } from '@/lib/services/benefits-service';

/** GET /api/benefits/plans — list benefit plans */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const plans = await BenefitsService.listPlans(organizationId, {
    type: (sp.get('type') as BenefitPlanType) || undefined,
    isActive: sp.get('isActive') === 'true' ? true : sp.get('isActive') === 'false' ? false : undefined,
  });

  return NextResponse.json({ plans });
}

/** POST /api/benefits/plans — create a benefit plan */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) {
    return NextResponse.json({ error: 'name_and_type_required' }, { status: 400 });
  }

  try {
    const plan = await BenefitsService.createPlan(
      organizationId,
      body.workspaceId || organizationId,
      {
        name,
        type: type as BenefitPlanType,
        description: body.description,
        provider: body.provider,
        costPerEmployee: body.costPerEmployee,
        employerContribution: body.employerContribution,
        eligibilityCriteria: body.eligibilityCriteria,
        enrollmentOpen: body.enrollmentOpen,
        isActive: body.isActive,
      },
      userId,
    );
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    console.error('[benefits/plans] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_plan' }, { status: 500 });
  }
}
