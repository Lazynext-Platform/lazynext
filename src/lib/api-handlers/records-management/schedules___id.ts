import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecordsManagementService } from '@/lib/services/records-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const schedule = await RecordsManagementService.getSchedule(id);
  if (!schedule) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ schedule });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const schedule = await RecordsManagementService.updateSchedule(id, body);
    if (!schedule) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ schedule });
  } catch (e) {
    console.error('[records-management/schedules] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_schedule' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await RecordsManagementService.deleteSchedule(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
