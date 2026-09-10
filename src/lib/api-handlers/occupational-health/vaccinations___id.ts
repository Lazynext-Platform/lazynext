import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const vaccination = await OccupationalHealthService.getVaccinationRecord(id);
  if (!vaccination) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ vaccination });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const vaccination = await OccupationalHealthService.updateVaccinationRecord(id, body);
    if (!vaccination) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ vaccination });
  } catch (e) {
    console.error('[occupational-health/vaccinations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_vaccination' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await OccupationalHealthService.deleteVaccinationRecord(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
