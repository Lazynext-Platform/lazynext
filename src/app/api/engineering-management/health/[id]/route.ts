import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const health = await EngineeringManagementService.getHealth(id);
  if (!health) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ health });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const health = await EngineeringManagementService.updateHealth(id, body);
    if (!health) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ health });
  } catch (e) {
    console.error('[engineering-management/health] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_health' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await EngineeringManagementService.deleteHealth(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
