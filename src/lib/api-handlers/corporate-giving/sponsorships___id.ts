import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const sponsorship = await CorporateGivingService.getSponsorship(id);
  if (!sponsorship) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ sponsorship });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const sponsorship = await CorporateGivingService.updateSponsorship(id, body);
    if (!sponsorship) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ sponsorship });
  } catch (e) {
    console.error('[corporate-giving/sponsorships] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_sponsorship' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CorporateGivingService.deleteSponsorship(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
