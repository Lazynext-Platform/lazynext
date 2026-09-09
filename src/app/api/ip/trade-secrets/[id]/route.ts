import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/trade-secrets/[id] — get a single trade secret */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const tradeSecret = await IPService.getTradeSecret(id);
  if (!tradeSecret) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ tradeSecret });
}

/** PATCH /api/ip/trade-secrets/[id] — update a trade secret */
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
    const tradeSecret = await IPService.updateTradeSecret(id, {
      name: body.name, description: body.description, category: body.category,
      accessLevel: body.accessLevel, owner: body.owner, custodian: body.custodian,
      protectionMeasures: body.protectionMeasures, disclosureHistory: body.disclosureHistory,
      value: body.value, createdDate: body.createdDate, lastReviewed: body.lastReviewed,
      status: body.status,
    });
    if (!tradeSecret) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ tradeSecret });
  } catch (e) {
    console.error('[ip/trade-secrets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_trade_secret' }, { status: 500 });
  }
}

/** DELETE /api/ip/trade-secrets/[id] — delete a trade secret */
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
    const ok = await IPService.deleteTradeSecret(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[ip/trade-secrets] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_trade_secret' }, { status: 500 });
  }
}
