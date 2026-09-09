import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DAMService } from '@/lib/services/dam-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const permission = await DAMService.getPermission(id);
  if (!permission) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ permission });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const permission = await DAMService.updatePermission(id, body);
    if (!permission) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ permission });
  } catch (e) {
    console.error('[dam/permissions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_permission' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DAMService.deletePermission(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
