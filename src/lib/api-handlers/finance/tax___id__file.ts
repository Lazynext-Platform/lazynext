import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * POST /api/finance/tax/[id]/file — mark a tax record as filed.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const taxRecord = await FinanceService.fileTax(id);
    return NextResponse.json({ taxRecord });
  } catch (e) {
    console.error('[finance/tax] file error:', e);
    return NextResponse.json({ error: 'failed_to_file_tax' }, { status: 500 });
  }
}
