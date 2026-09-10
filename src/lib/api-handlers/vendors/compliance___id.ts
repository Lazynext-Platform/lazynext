import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VendorComplianceService } from '@/lib/services/vendor-compliance-service';

/** GET /api/vendors/compliance/[id] — get a compliance record by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const record = await VendorComplianceService.get(id);
  if (!record) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ record });
}

/** PATCH /api/vendors/compliance/[id] — update a compliance record */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const record = await VendorComplianceService.update(id, {
      type: body.type,
      name: body.name,
      status: body.status,
      expiryDate: body.expiryDate,
      documentUrl: body.documentUrl,
      notes: body.notes,
    });
    if (!record) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ record });
  } catch (e) {
    console.error('[vendors/compliance] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_record' }, { status: 500 });
  }
}

/** DELETE /api/vendors/compliance/[id] — delete a compliance record */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const deleted = await VendorComplianceService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
