import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const grant = await CorporateGivingService.getGrant(id);
  if (!grant) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ grant });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const grant = await CorporateGivingService.updateGrant(id, body);
    if (!grant) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ grant });
  } catch (e) {
    console.error('[corporate-giving/grants] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_grant' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CorporateGivingService.deleteGrant(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
