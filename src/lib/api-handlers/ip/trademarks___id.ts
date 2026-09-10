import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/trademarks/[id] — get a single trademark */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const trademark = await IPService.getTrademark(id);
  if (!trademark) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ trademark });
}

/** PATCH /api/ip/trademarks/[id] — update a trademark */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const trademark = await IPService.updateTrademark(id, {
      name: body.name, classes: body.classes, registrationNumber: body.registrationNumber,
      filingDate: body.filingDate, registrationDate: body.registrationDate,
      expiryDate: body.expiryDate, jurisdiction: body.jurisdiction, status: body.status,
      logoDescription: body.logoDescription, colorsClaimed: body.colorsClaimed,
      priorityClaim: body.priorityClaim, owner: body.owner, attorney: body.attorney,
    });
    if (!trademark) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ trademark });
  } catch (e) {
    console.error('[ip/trademarks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_trademark' }, { status: 500 });
  }
}

/** DELETE /api/ip/trademarks/[id] — delete a trademark */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await IPService.deleteTrademark(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[ip/trademarks] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_trademark' }, { status: 500 });
  }
}
