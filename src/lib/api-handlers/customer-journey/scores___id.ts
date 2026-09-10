import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const score = await CustomerJourneyService.getScore(id);
  if (!score) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ score });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const score = await CustomerJourneyService.updateScore(id, body);
    if (!score) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ score });
  } catch (e) {
    console.error('[customer-journey/scores] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_score' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CustomerJourneyService.deleteScore(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
