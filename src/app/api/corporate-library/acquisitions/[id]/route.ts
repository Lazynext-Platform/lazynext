import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateLibraryService } from '@/lib/services/corporate-library-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const acquisition = await CorporateLibraryService.getAcquisition(id);
  if (!acquisition) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ acquisition });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const acquisition = await CorporateLibraryService.updateAcquisition(id, body);
    if (!acquisition) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ acquisition });
  } catch (e) {
    console.error('[corporate-library/acquisitions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_acquisition' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CorporateLibraryService.deleteAcquisition(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
