import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MarketResearchService } from '@/lib/services/market-research-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const project = await MarketResearchService.getProject(id);
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const project = await MarketResearchService.updateProject(id, body);
    if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ project });
  } catch (e) {
    console.error('[market-research/projects] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_project' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await MarketResearchService.deleteProject(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
