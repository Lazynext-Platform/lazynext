import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { BenefitsService } from '@/lib/services/benefits-service';
import type { ClaimType, ClaimStatus } from '@/lib/services/benefits-service';

/** GET /api/benefits/claims — list claims */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const claims = await BenefitsService.listClaims(organizationId, {
    status: (sp.get('status') as ClaimStatus) || undefined,
    employeeId: sp.get('employeeId') || undefined,
    enrollmentId: sp.get('enrollmentId') || undefined,
  });

  return NextResponse.json({ claims });
}

/** POST /api/benefits/claims — create a claim */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const enrollmentId = String(body.enrollmentId || '').trim();
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const amount = Number(body.amount);
  const date = String(body.date || '').trim();
  if (!enrollmentId || !employeeId || !employeeName || !amount || !date) {
    return NextResponse.json({ error: 'required_fields_missing' }, { status: 400 });
  }

  try {
    const claim = await BenefitsService.createClaim(
      organizationId,
      body.workspaceId || organizationId,
      {
        enrollmentId,
        employeeId,
        employeeName,
        amount,
        date,
        description: body.description,
        type: body.type as ClaimType | undefined,
        status: body.status as ClaimStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ claim }, { status: 201 });
  } catch (e) {
    console.error('[benefits/claims] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_claim' }, { status: 500 });
  }
}
