import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const desk = await WorkspaceManagementService.getDesk(id);
  if (!desk) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ desk });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const desk = await WorkspaceManagementService.updateDesk(id, body);
    if (!desk) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ desk });
  } catch (e) {
    console.error('[workspace-management/desks] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_desk' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await WorkspaceManagementService.deleteDesk(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
