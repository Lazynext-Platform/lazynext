import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/payroll/[id]/approve — approve a payroll record.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const payroll = await FinanceService.approvePayroll(id);
    return NextResponse.json({ payroll });
  } catch (e) {
    console.error('[finance/payroll] approve error:', e);
    return NextResponse.json({ error: 'failed_to_approve_payroll' }, { status: 500 });
  }
}
