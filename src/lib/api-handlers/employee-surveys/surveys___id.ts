import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const survey = await EmployeeSurveysService.getSurvey(id);
  if (!survey) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ survey });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const survey = await EmployeeSurveysService.updateSurvey(id, body);
    if (!survey) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ survey });
  } catch (e) {
    console.error('[employee-surveys/surveys] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_survey' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EmployeeSurveysService.deleteSurvey(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
