import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ManagementSuccessionService } from '@/lib/services/management-succession-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const review = await ManagementSuccessionService.getReview(id);
  if (!review) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ review });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const review = await ManagementSuccessionService.updateReview(id, body);
    if (!review) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ review });
  } catch (e) {
    console.error('[management-succession/reviews] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_review' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await ManagementSuccessionService.deleteReview(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
