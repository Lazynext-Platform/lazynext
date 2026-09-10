import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const depreciation = await AssetTrackingService.getDepreciation(id);
  if (!depreciation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ depreciation });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const depreciation = await AssetTrackingService.updateDepreciation(id, body);
    if (!depreciation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ depreciation });
  } catch (e) {
    console.error('[asset-tracking/depreciation] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_depreciation' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await AssetTrackingService.deleteDepreciation(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
