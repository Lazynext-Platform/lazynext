import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateArchivesService } from '@/lib/services/corporate-archives-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const access = await CorporateArchivesService.getAccess(id);
  if (!access) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ access });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const access = await CorporateArchivesService.updateAccess(id, body);
    if (!access) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ access });
  } catch (e) {
    console.error('[corporate-archives/access] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_access' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CorporateArchivesService.deleteAccess(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
