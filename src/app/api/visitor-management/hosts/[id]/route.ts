import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VisitorManagementService } from '@/lib/services/visitor-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const host = await VisitorManagementService.getHost(id);
  if (!host) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ host });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const host = await VisitorManagementService.updateHost(id, body);
    if (!host) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ host });
  } catch (e) {
    console.error('[visitor-management/hosts] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_host' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await VisitorManagementService.deleteHost(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
