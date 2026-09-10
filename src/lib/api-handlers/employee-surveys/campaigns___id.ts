import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmployeeSurveysService } from '@/lib/services/employee-surveys-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const campaign = await EmployeeSurveysService.getCampaign(id);
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const campaign = await EmployeeSurveysService.updateCampaign(id, body);
    if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[employee-surveys/campaigns] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_campaign' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EmployeeSurveysService.deleteCampaign(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
