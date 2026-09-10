import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';

/** POST /api/travel/requests/[id]/convert-expense — convert travel request to expense */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;
  const { id } = params;

  const body = await req.json().catch(() => ({}));

  try {
    const expense = await TravelService.convertToExpense(
      id,
      organizationId,
      body.workspaceId || organizationId,
      userId,
    );
    if (!expense) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    console.error('[travel/convert-expense] error:', e);
    return NextResponse.json({ error: 'failed_to_convert_to_expense' }, { status: 500 });
  }
}
