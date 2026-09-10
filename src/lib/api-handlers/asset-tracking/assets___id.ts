import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const asset = await AssetTrackingService.getAsset(id);
  if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ asset });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const asset = await AssetTrackingService.updateAsset(id, body);
    if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (e) {
    console.error('[asset-tracking/assets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_asset' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await AssetTrackingService.deleteAsset(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
