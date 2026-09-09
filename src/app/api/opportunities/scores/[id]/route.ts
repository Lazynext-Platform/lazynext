import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OpportunityService } from '@/lib/services/opportunity-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const score = await OpportunityService.getOpportunityScore(id);
  if (!score) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ score });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const score = await OpportunityService.updateOpportunityScore(id, body);
    if (!score) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ score });
  } catch (e) {
    console.error('[opportunities/scores] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_score' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await OpportunityService.deleteOpportunityScore(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
