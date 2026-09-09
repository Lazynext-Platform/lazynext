import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MAService } from '@/lib/services/ma-service';

/** POST /api/ma/integrations/[id]/complete — complete an integration */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const summary = String(body.summary || '').trim();
  if (!summary) {
    return NextResponse.json({ error: 'summary_required' }, { status: 400 });
  }

  try {
    const integration = await MAService.completeIntegration(id, summary, session.user.id);
    if (!integration) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ integration });
  } catch (e) {
    console.error('[ma/integrations/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_integration' }, { status: 500 });
  }
}
