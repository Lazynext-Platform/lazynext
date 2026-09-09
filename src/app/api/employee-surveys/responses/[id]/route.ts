import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const response = await EmployeeSurveysService.getResponse(id);
  if (!response) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ response });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const response = await EmployeeSurveysService.updateResponse(id, body);
    if (!response) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ response });
  } catch (e) {
    console.error('[employee-surveys/responses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_response' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await EmployeeSurveysService.deleteResponse(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
