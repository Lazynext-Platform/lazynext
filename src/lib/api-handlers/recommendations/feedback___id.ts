import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecommendationService } from '@/lib/services/recommendation-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const feedback = await RecommendationService.getRecommendationFeedback(id);
  if (!feedback) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ feedback });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const feedback = await RecommendationService.updateRecommendationFeedback(id, body);
    if (!feedback) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ feedback });
  } catch (e) {
    console.error('[recommendations/feedback] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_feedback' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await RecommendationService.deleteRecommendationFeedback(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
