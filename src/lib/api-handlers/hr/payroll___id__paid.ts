import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PayrollService } from '@/lib/services/payroll-service';

/** POST /api/hr/payroll/[id]/paid — mark a payroll record as paid */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
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
    const record = await PayrollService.markPaid(id, payDate);
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[hr/payroll] paid error:', e);
    return NextResponse.json({ error: 'failed_to_mark_paid' }, { status: 500 });
  }
}
