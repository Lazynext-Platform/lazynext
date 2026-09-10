import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** POST /api/tax-management/[id]/file — file a tax record */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const record = await TaxManagementService.fileTaxRecord(id);
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[tax-management] file error:', e);
    return NextResponse.json({ error: 'failed_to_file_tax_record' }, { status: 500 });
  }
}
