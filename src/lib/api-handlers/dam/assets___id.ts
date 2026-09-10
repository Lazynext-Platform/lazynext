import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const asset = await DAMService.getAsset(id);
  if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ asset });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const asset = await DAMService.updateAsset(id, body);
    if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (e) {
    console.error('[dam/assets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_asset' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await DAMService.deleteAsset(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
