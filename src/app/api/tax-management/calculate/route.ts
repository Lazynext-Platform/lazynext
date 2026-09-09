import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** POST /api/tax-management/calculate — calculate tax for an amount */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  if (!body.amount || !body.type) {
    return NextResponse.json({ error: 'amount_type_required' }, { status: 400 });
  }

  try {
    const result = await TaxManagementService.calculateTax(organizationId, {
      amount: Number(body.amount),
      type: body.type,
      jurisdiction: body.jurisdiction,
      rate: body.rate !== undefined ? Number(body.rate) : undefined,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error('[tax-management] calculate error:', e);
    return NextResponse.json({ error: 'failed_to_calculate_tax' }, { status: 500 });
  }
}
