import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/assets/[id] — get a single IP asset */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const asset = await IPService.getAsset(id);
  if (!asset) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ asset });
}

/** PATCH /api/ip/assets/[id] — update an IP asset */
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
    const asset = await IPService.updateAsset(id, {
      title: body.title, type: body.type, status: body.status,
      registrationNumber: body.registrationNumber, filingDate: body.filingDate,
      grantDate: body.grantDate, expiryDate: body.expiryDate,
      jurisdiction: body.jurisdiction, inventor: body.inventor, owner: body.owner,
      description: body.description, value: body.value, classification: body.classification,
      tags: body.tags, notes: body.notes,
    });
    if (!asset) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ asset });
  } catch (e) {
    console.error('[ip/assets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_asset' }, { status: 500 });
  }
}

/** DELETE /api/ip/assets/[id] — delete an IP asset */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await IPService.deleteAsset(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[ip/assets] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_asset' }, { status: 500 });
  }
}
