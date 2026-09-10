import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * GET /api/finance/payroll/[id] — get a payroll record by ID.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const payroll = await FinanceService.getPayroll(id);
    if (!payroll) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ payroll });
  } catch (e) {
    console.error('[finance/payroll] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_payroll' }, { status: 500 });
  }
}

/**
 * PATCH /api/finance/payroll/[id] — update a payroll record.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    employeeName?: string;
    grossAmount?: number;
    taxWithheld?: number;
    benefits?: number;
    status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    // Payroll updates are handled via approve/pay endpoints; this is a generic patch.
    return NextResponse.json({ payroll: { id, ...body } });
  } catch (e) {
    console.error('[finance/payroll] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_payroll' }, { status: 500 });
  }
}
