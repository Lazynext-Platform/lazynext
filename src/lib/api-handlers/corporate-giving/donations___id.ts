import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const donation = await CorporateGivingService.getDonation(id);
  if (!donation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ donation });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const donation = await CorporateGivingService.updateDonation(id, body);
    if (!donation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ donation });
  } catch (e) {
    console.error('[corporate-giving/donations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_donation' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CorporateGivingService.deleteDonation(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
