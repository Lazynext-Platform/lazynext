import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecommendationService } from '@/lib/services/recommendation-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const recommendation = await RecommendationService.getRecommendation(id);
  if (!recommendation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ recommendation });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const recommendation = await RecommendationService.updateRecommendation(id, body);
    if (!recommendation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ recommendation });
  } catch (e) {
    console.error('[recommendations/recommendations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_recommendation' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await RecommendationService.deleteRecommendation(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
