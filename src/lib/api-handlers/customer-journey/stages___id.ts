import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const stage = await CustomerJourneyService.getStage(id);
  if (!stage) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ stage });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const stage = await CustomerJourneyService.updateStage(id, body);
    if (!stage) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ stage });
  } catch (e) {
    console.error('[customer-journey/stages] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_stage' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CustomerJourneyService.deleteStage(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
