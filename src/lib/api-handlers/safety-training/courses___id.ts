import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SafetyTrainingService } from '@/lib/services/safety-training-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const course = await SafetyTrainingService.getTrainingCourse(id);
  if (!course) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ course });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const course = await SafetyTrainingService.updateTrainingCourse(id, body);
    if (!course) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ course });
  } catch (e) {
    console.error('[safety-training/courses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_course' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await SafetyTrainingService.deleteTrainingCourse(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
