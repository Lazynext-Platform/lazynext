import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { OccupationalHealthService } from '@/lib/services/occupational-health-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const exam = await OccupationalHealthService.getMedicalExam(id);
  if (!exam) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ exam });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const exam = await OccupationalHealthService.updateMedicalExam(id, body);
    if (!exam) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ exam });
  } catch (e) {
    console.error('[occupational-health/exams] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_exam' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await OccupationalHealthService.deleteMedicalExam(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
