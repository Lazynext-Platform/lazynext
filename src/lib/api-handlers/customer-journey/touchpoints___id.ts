import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const touchpoint = await CustomerJourneyService.getTouchpoint(id);
  if (!touchpoint) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ touchpoint });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const touchpoint = await CustomerJourneyService.updateTouchpoint(id, body);
    if (!touchpoint) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ touchpoint });
  } catch (e) {
    console.error('[customer-journey/touchpoints] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_touchpoint' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CustomerJourneyService.deleteTouchpoint(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
