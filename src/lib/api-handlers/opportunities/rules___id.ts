import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OpportunityService } from '@/lib/services/opportunity-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const rule = await OpportunityService.getDetectionRule(id);
  if (!rule) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ rule });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const rule = await OpportunityService.updateDetectionRule(id, body);
    if (!rule) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ rule });
  } catch (e) {
    console.error('[opportunities/rules] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_rule' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await OpportunityService.deleteDetectionRule(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
