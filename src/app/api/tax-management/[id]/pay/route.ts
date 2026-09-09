import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** POST /api/tax-management/[id]/pay — pay a tax record */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const record = await TaxManagementService.payTaxRecord(id);
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[tax-management] pay error:', e);
    return NextResponse.json({ error: 'failed_to_pay_tax_record' }, { status: 500 });
  }
}
