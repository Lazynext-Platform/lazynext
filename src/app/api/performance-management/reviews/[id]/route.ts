import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const review = await PerformanceManagementService.getReview(id);
  if (!review) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ review });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const review = await PerformanceManagementService.updateReview(id, body);
    if (!review) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ review });
  } catch (e) {
    console.error('[performance-management/reviews] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_review' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PerformanceManagementService.deleteReview(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
