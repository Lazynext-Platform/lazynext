import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const application = await PatentManagementService.getApplication(id);
  if (!application) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ application });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const application = await PatentManagementService.updateApplication(id, body);
    if (!application) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ application });
  } catch (e) {
    console.error('[patent-management/applications] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_application' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await PatentManagementService.deleteApplication(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
