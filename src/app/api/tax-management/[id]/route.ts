import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** GET /api/tax-management/[id] — get a single tax record */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const record = await TaxManagementService.getTaxRecord(id);
  if (!record) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ record });
}

/** PATCH /api/tax-management/[id] — update a tax record */
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
    const record = await TaxManagementService.updateTaxRecord(id, body);
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[tax-management] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_tax_record' }, { status: 500 });
  }
}
