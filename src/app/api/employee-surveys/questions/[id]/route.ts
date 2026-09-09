import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const question = await EmployeeSurveysService.getQuestion(id);
  if (!question) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ question });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const question = await EmployeeSurveysService.updateQuestion(id, body);
    if (!question) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ question });
  } catch (e) {
    console.error('[employee-surveys/questions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_question' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await EmployeeSurveysService.deleteQuestion(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
