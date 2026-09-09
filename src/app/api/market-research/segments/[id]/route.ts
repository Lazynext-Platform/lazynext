import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MarketResearchService } from '@/lib/services/market-research-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const segment = await MarketResearchService.getSegment(id);
  if (!segment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ segment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const segment = await MarketResearchService.updateSegment(id, body);
    if (!segment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ segment });
  } catch (e) {
    console.error('[market-research/segments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_segment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await MarketResearchService.deleteSegment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
