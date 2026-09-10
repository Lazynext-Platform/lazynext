import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InternalAuditService } from '@/lib/services/internal-audit-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const newDate = String(body.newDate || body.scheduledDate || '').trim();
  if (!newDate) return NextResponse.json({ error: 'newDate_required' }, { status: 400 });
  const schedule = await InternalAuditService.postponeSchedule(id, newDate, session.user.id);
  if (!schedule) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ schedule });
}
