import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const log = await VisitorManagementService.getAccessLog(id);
  if (!log) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ log });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const log = await VisitorManagementService.updateAccessLog(id, body);
    if (!log) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ log });
  } catch (e) {
    console.error('[visitor-management/access-logs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_access_log' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await VisitorManagementService.deleteAccessLog(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
