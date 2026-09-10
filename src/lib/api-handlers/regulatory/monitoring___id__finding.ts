import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';

/** POST /api/regulatory/monitoring/[id]/finding — record a finding */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const description = String(body.description || '').trim();
  const severity = String(body.severity || '').trim();
  if (!description || !severity) {
    return NextResponse.json({ error: 'description_and_severity_required' }, { status: 400 });
  }

  try {
    const monitoring = await RegulatoryService.recordFinding(
      id, { description, severity }, session.user.id,
    );
    if (!monitoring) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ monitoring });
  } catch (e) {
    console.error('[regulatory/monitoring] finding error:', e);
    return NextResponse.json({ error: 'failed_to_record_finding' }, { status: 500 });
  }
}
