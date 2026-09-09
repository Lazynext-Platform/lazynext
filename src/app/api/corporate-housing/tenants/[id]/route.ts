import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateHousingService } from '@/lib/services/corporate-housing-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const tenant = await CorporateHousingService.getTenant(id);
  if (!tenant) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const tenant = await CorporateHousingService.updateTenant(id, body);
    if (!tenant) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ tenant });
  } catch (e) {
    console.error('[corporate-housing/tenants] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_tenant' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CorporateHousingService.deleteTenant(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
