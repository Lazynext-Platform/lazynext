import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateHousingService } from '@/lib/services/corporate-housing-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const property = await CorporateHousingService.getProperty(id);
  if (!property) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ property });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const property = await CorporateHousingService.updateProperty(id, body);
    if (!property) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ property });
  } catch (e) {
    console.error('[corporate-housing/properties] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_property' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CorporateHousingService.deleteProperty(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
