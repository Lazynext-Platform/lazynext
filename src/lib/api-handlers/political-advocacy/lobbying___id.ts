import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const lobbying = await PoliticalAdvocacyService.getLobbying(id);
  if (!lobbying) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ lobbying });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const lobbying = await PoliticalAdvocacyService.updateLobbying(id, body);
    if (!lobbying) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ lobbying });
  } catch (e) {
    console.error('[political-advocacy/lobbying] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_lobbying' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PoliticalAdvocacyService.deleteLobbying(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
