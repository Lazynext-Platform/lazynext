import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { BenefitsService } from '@/lib/services/benefits-service';

/** GET /api/benefits/eligibility — check eligibility */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;

  const sp = req.nextUrl.searchParams;
  const planId = sp.get('planId');
  const employeeId = sp.get('employeeId');
  if (!planId || !employeeId) {
    return NextResponse.json({ error: 'plan_and_employee_required' }, { status: 400 });
  }

  const eligibility = await BenefitsService.getEligibility(planId, employeeId);
  return NextResponse.json({ eligibility });
}
