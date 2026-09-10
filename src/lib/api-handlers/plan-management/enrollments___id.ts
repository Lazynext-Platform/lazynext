import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PlanManagementService } from '@/lib/services/plan-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const enrollment = await PlanManagementService.getEnrollment(id);
  if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ enrollment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const enrollment = await PlanManagementService.updateEnrollment(id, body);
    if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ enrollment });
  } catch (e) {
    console.error('[plan-management/enrollments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_enrollment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PlanManagementService.deleteEnrollment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
