import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PermissionService } from '@/lib/services/permission-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const check = await PermissionService.getPermissionCheck(id);
  if (!check) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ check });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const check = await PermissionService.updatePermissionCheck(id, body);
    if (!check) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ check });
  } catch (e) {
    console.error('[permissions/checks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_check' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PermissionService.deletePermissionCheck(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
