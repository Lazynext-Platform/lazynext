import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const room = await WorkspaceManagementService.getRoom(id);
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ room });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const room = await WorkspaceManagementService.updateRoom(id, body);
    if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ room });
  } catch (e) {
    console.error('[workspace-management/rooms] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_room' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await WorkspaceManagementService.deleteRoom(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
