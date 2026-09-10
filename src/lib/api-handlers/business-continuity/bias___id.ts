import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BusinessContinuityService } from '@/lib/services/business-continuity-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const bia = await BusinessContinuityService.getBusinessImpactAnalysis(id);
  if (!bia) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ bia });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const bia = await BusinessContinuityService.updateBusinessImpactAnalysis(id, body);
    if (!bia) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ bia });
  } catch (e) {
    console.error('[business-continuity/bias] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_bia' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await BusinessContinuityService.deleteBusinessImpactAnalysis(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
