import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VendorService } from '@/lib/services/vendor-service';

/** GET /api/vendors/[id] — get a vendor by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const vendor = await VendorService.get(id);
  if (!vendor) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ vendor });
}

/** PATCH /api/vendors/[id] — update a vendor */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const vendor = await VendorService.update(id, {
      name: body.name,
      category: body.category,
      status: body.status,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      website: body.website,
      address: body.address,
      taxId: body.taxId,
      paymentTerms: body.paymentTerms,
      notes: body.notes,
      tags: body.tags,
    });
    if (!vendor) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ vendor });
  } catch (e) {
    console.error('[vendors] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_vendor' }, { status: 500 });
  }
}

/** DELETE /api/vendors/[id] — delete a vendor */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await VendorService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
