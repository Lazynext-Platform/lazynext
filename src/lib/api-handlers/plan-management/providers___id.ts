import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PlanManagementService } from '@/lib/services/plan-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const provider = await PlanManagementService.getProvider(id);
  if (!provider) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ provider });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const provider = await PlanManagementService.updateProvider(id, body);
    if (!provider) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ provider });
  } catch (e) {
    console.error('[plan-management/providers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_provider' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PlanManagementService.deleteProvider(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
