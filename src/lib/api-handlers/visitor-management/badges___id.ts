import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const badge = await VisitorManagementService.getBadge(id);
  if (!badge) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ badge });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const badge = await VisitorManagementService.updateBadge(id, body);
    if (!badge) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ badge });
  } catch (e) {
    console.error('[visitor-management/badges] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_badge' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await VisitorManagementService.deleteBadge(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
