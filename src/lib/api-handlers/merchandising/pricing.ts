import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MerchandisingService } from '@/lib/services/merchandising-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ pricings: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const pricings = await MerchandisingService.listPricings(organizationId, opts as never);
  return NextResponse.json({ pricings });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const productName = String(body.productName || '').trim();
  const type = String(body.type || '').trim();
  const price = Number(body.price);
  if (!productName || !type || Number.isNaN(price)) return NextResponse.json({ error: 'productName_type_price_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const pricing = await MerchandisingService.createPricing(ws.organizationId, ws.id, {
      productName, type: type as never, price,
      productId: body.productId, originalPrice: body.originalPrice, currency: body.currency,
      status: body.status, startDate: body.startDate, endDate: body.endDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ pricing }, { status: 201 });
  } catch (e) {
    console.error('[merchandising/pricing] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_pricing' }, { status: 500 });
  }
}
