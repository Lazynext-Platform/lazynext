import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PermissionService } from '@/lib/services/permission-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const policy = await PermissionService.getPermissionPolicy(id);
  if (!policy) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ policy });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const policy = await PermissionService.updatePermissionPolicy(id, body);
    if (!policy) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ policy });
  } catch (e) {
    console.error('[permissions/policies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_policy' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PermissionService.deletePermissionPolicy(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
