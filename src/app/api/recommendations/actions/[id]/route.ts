import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecommendationService } from '@/lib/services/recommendation-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const action = await RecommendationService.getRecommendationAction(id);
  if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ action });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const action = await RecommendationService.updateRecommendationAction(id, body);
    if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ action });
  } catch (e) {
    console.error('[recommendations/actions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_action' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await RecommendationService.deleteRecommendationAction(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
