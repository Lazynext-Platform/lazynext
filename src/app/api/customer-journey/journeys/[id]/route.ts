import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const journey = await CustomerJourneyService.getJourney(id);
  if (!journey) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ journey });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const journey = await CustomerJourneyService.updateJourney(id, body);
    if (!journey) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ journey });
  } catch (e) {
    console.error('[customer-journey/journeys] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_journey' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CustomerJourneyService.deleteJourney(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
