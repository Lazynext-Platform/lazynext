import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const campaign = await PoliticalAdvocacyService.getCampaign(id);
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const campaign = await PoliticalAdvocacyService.updateCampaign(id, body);
    if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[political-advocacy/campaigns] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_campaign' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await PoliticalAdvocacyService.deleteCampaign(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
