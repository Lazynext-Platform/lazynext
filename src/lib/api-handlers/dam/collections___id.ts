import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const collection = await DAMService.getCollection(id);
  if (!collection) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ collection });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const collection = await DAMService.updateCollection(id, body);
    if (!collection) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ collection });
  } catch (e) {
    console.error('[dam/collections] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_collection' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await DAMService.deleteCollection(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
