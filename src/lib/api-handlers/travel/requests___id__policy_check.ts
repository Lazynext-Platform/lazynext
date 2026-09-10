import { NextRequest, NextResponse } from 'next/server';
import { TravelService } from '@/lib/services/travel-service';

/** GET /api/travel/requests/[id]/policy-check — check policy compliance */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const result = await TravelService.checkPolicyCompliance(id);
  if (!result.compliant && result.violations.includes('request_not_found')) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(result);
}
