import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ImportExportService } from '@/lib/services/import-export-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const license = await ImportExportService.getLicense(id);
  if (!license) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ license });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const license = await ImportExportService.updateLicense(id, body);
    if (!license) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ license });
  } catch (e) {
    console.error('[import-export/licenses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_license' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await ImportExportService.deleteLicense(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
