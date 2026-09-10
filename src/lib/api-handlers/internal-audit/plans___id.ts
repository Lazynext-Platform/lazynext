import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const plan = await InternalAuditService.getPlan(id);
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const plan = await InternalAuditService.updatePlan(id, body);
    if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[internal-audit/plans] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_plan' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await InternalAuditService.deletePlan(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
