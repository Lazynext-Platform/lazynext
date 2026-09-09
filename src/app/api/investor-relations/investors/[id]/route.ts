import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/investors/[id] — get a single investor */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const investor = await InvestorRelationsService.getInvestor(id);
  if (!investor) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ investor });
}

/** PATCH /api/investor-relations/investors/[id] — update an investor */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const investor = await InvestorRelationsService.updateInvestor(id, {
      name: body.name, type: body.type, firm: body.firm, email: body.email,
      phone: body.phone, investmentFocus: body.investmentFocus, checkSize: body.checkSize,
      stage: body.stage, portfolioCompanies: body.portfolioCompanies, status: body.status, notes: body.notes,
    });
    if (!investor) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ investor });
  } catch (e) {
    console.error('[investor-relations/investors] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_investor' }, { status: 500 });
  }
}

/** DELETE /api/investor-relations/investors/[id] — delete an investor */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await InvestorRelationsService.deleteInvestor(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[investor-relations/investors] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_investor' }, { status: 500 });
  }
}
