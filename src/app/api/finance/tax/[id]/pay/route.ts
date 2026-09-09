import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/tax/[id]/pay — mark a tax record as paid.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const taxRecord = await FinanceService.payTax(id);
    return NextResponse.json({ taxRecord });
  } catch (e) {
    console.error('[finance/tax] pay error:', e);
    return NextResponse.json({ error: 'failed_to_pay_tax' }, { status: 500 });
  }
}
