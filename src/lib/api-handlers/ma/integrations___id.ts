import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** GET /api/ma/integrations/[id] — get a single integration record */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const integration = await MAService.getIntegration(id);
  if (!integration) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ integration });
}

/** PATCH /api/ma/integrations/[id] — update an integration record */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const integration = await MAService.updateIntegration(id, {
      name: body.name, workstreams: body.workstreams, timeline: body.timeline,
      budget: body.budget, status: body.status, synergies: body.synergies, risks: body.risks,
    });
    if (!integration) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ integration });
  } catch (e) {
    console.error('[ma/integrations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_integration' }, { status: 500 });
  }
}
