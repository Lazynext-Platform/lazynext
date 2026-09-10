import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const scheduledDate = String(body.scheduledDate || '').trim();
  if (!scheduledDate) return NextResponse.json({ error: 'scheduledDate_required' }, { status: 400 });
  const order = await FieldServiceService.scheduleOrder(id, scheduledDate, session.user.id);
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ order });
}
