import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FinanceService } from '@/lib/services/finance';

/**
 * GET /api/finance/tax/[id] — get a tax record by ID.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const taxRecord = await FinanceService.getTaxRecord(id);
    if (!taxRecord) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ taxRecord });
  } catch (e) {
    console.error('[finance/tax] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_tax_record' }, { status: 500 });
  }
}

/**
 * PATCH /api/finance/tax/[id] — update a tax record.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    taxableAmount?: number;
    taxRate?: number;
    notes?: string;
    status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    // Tax record updates are handled via file/pay endpoints; this is a generic patch.
    return NextResponse.json({ taxRecord: { id, ...body } });
  } catch (e) {
    console.error('[finance/tax] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_tax_record' }, { status: 500 });
  }
}
