import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const version = await DAMService.getVersion(id);
  if (!version) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ version });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const version = await DAMService.updateVersion(id, body);
    if (!version) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ version });
  } catch (e) {
    console.error('[dam/versions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_version' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await DAMService.deleteVersion(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
