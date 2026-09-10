import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { safeError } from '@/lib/security';
import { BusinessContinuityService } from '@/lib/services/business-continuity-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const item = await BusinessContinuityService.getContinuityPlan(id);
  if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ continuityPlan: item });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const item = await BusinessContinuityService.updateContinuityPlan(id, body as never);
    if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ continuityPlan: item });
  } catch (e) {
    return NextResponse.json(safeError(e, 'business-continuity', 'update_failed'), { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await BusinessContinuityService.deleteContinuityPlan(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
