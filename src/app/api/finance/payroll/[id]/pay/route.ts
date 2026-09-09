import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/payroll/[id]/pay — mark a payroll record as paid.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { payDate?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  let payDate: Date | undefined;
  if (body.payDate) {
    const parsed = new Date(body.payDate);
    if (!isNaN(parsed.getTime())) payDate = parsed;
  }

  try {
    const payroll = await FinanceService.payPayroll(id, payDate);
    return NextResponse.json({ payroll });
  } catch (e) {
    console.error('[finance/payroll] pay error:', e);
    return NextResponse.json({ error: 'failed_to_pay_payroll' }, { status: 500 });
  }
}
