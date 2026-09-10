import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const layout = await WorkspaceManagementService.getLayout(id);
  if (!layout) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ layout });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const layout = await WorkspaceManagementService.updateLayout(id, body);
    if (!layout) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ layout });
  } catch (e) {
    console.error('[workspace-management/layouts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_layout' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await WorkspaceManagementService.deleteLayout(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
