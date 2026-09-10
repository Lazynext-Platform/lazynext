import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PayrollService } from '@/lib/services/payroll-service';

/** POST /api/hr/payroll/[id]/process — process a payroll record */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const record = await PayrollService.process(id);
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[hr/payroll] process error:', e);
    return NextResponse.json({ error: 'failed_to_process_record' }, { status: 500 });
  }
}
