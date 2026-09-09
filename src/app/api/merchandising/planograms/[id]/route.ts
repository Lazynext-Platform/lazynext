import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MerchandisingService } from '@/lib/services/merchandising-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const planogram = await MerchandisingService.getPlanogram(id);
  if (!planogram) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ planogram });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const planogram = await MerchandisingService.updatePlanogram(id, body);
    if (!planogram) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ planogram });
  } catch (e) {
    console.error('[merchandising/planograms] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_planogram' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await MerchandisingService.deletePlanogram(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
