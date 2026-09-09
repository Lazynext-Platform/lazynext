import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const exposure = await OccupationalHealthService.getHealthExposure(id);
  if (!exposure) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ exposure });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const exposure = await OccupationalHealthService.updateHealthExposure(id, body);
    if (!exposure) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ exposure });
  } catch (e) {
    console.error('[occupational-health/exposures] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_exposure' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await OccupationalHealthService.deleteHealthExposure(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
